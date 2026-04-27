/**
 * App 级别收藏管理 Composable
 *
 * 负责收藏相关的业务逻辑，包括：
 * - 保存收藏
 * - 使用收藏（智能模式切换）
 * - 收藏对话框管理
 */

import { ref, nextTick, type Ref } from 'vue'
import { useToast } from '../ui/useToast'
import type { BasicSubMode, ProSubMode, ContextMode, IImageStorageService, OptimizationMode } from '@prompt-optimizer/core'
import { isValidVariableName } from '../../types/variable'
import {
    parseFavoriteReproducibility,
    type FavoriteReproducibilityExample,
} from '../../utils/favorite-reproducibility'
import {
    normalizeImageSourceToPayload,
    resolveAssetIdToDataUrl,
    type ImagePayload,
} from '../../utils/image-asset-storage'

/**
 * 保存收藏的数据结构
 */
export interface SaveFavoriteData {
    content: string
    originalContent?: string
    prefill?: {
        title?: string
        description?: string
        category?: string
        tags?: string[]
        functionMode?: 'basic' | 'context' | 'image'
        optimizationMode?: OptimizationMode
        imageSubMode?: 'text2image' | 'image2image' | 'multiimage'
        metadata?: Record<string, unknown>
    }
}

/**
 * 收藏项数据结构
 */
export interface FavoriteItem {
    content: string
    functionMode?: 'basic' | 'pro' | 'image' | 'context'
    optimizationMode?: OptimizationMode
    imageSubMode?: 'text2image' | 'image2image' | 'multiimage'
    metadata?: Record<string, unknown>
}

export interface UseFavoriteOptions {
    applyExample?: boolean
    exampleId?: string
    exampleIndex?: number
}

type TemporaryVariablesSessionApi = {
    getTemporaryVariable: (name: string) => string | undefined
    setTemporaryVariable: (name: string, value: string) => void
    clearTemporaryVariables: () => void
    updatePrompt?: (prompt: string) => void
}

type Image2ImageExampleSessionApi = TemporaryVariablesSessionApi & {
    updateInputImage: (b64: string | null, mimeType?: string) => void
}

type MultiImageExampleSessionApi = TemporaryVariablesSessionApi & {
    replaceInputImages: (images: ImagePayload[]) => void
}

/**
 * useAppFavorite 的配置选项
 */
export interface AppFavoriteOptions {
    /** 🔧 Step D: 路由导航函数（替代 setFunctionMode/set*SubMode） */
    navigateToSubModeKey: (toKey: string, opts?: { replace?: boolean }) => boolean | void | Promise<boolean | void>
    /** 处理上下文模式变更 */
    handleContextModeChange: (mode: ContextMode) => Promise<void>
    /** 优化器提示词（用于设置收藏内容） */
    optimizerPrompt: Ref<string>
    /** i18n 翻译函数 */
    t: (key: string, params?: Record<string, unknown>) => string
    /** 外部数据加载中标志（防止模式切换的自动 restore 覆盖外部数据） */
    isLoadingExternalData: Ref<boolean>
    /** 高级/图像模式临时变量会话，用于应用收藏示例参数 */
    proMultiMessageSession?: TemporaryVariablesSessionApi
    proVariableSession?: TemporaryVariablesSessionApi
    imageText2ImageSession?: TemporaryVariablesSessionApi
    imageImage2ImageSession?: Image2ImageExampleSessionApi
    imageMultiImageSession?: MultiImageExampleSessionApi
    getFavoriteImageStorageService?: () => IImageStorageService | null
}

/**
 * useAppFavorite 的返回值
 */
export interface AppFavoriteReturn {
    /** 显示收藏管理对话框 */
    showFavoriteManager: Ref<boolean>
    /** 显示保存收藏对话框 */
    showSaveFavoriteDialog: Ref<boolean>
    /** 保存收藏数据 */
    saveFavoriteData: Ref<SaveFavoriteData | null>
    /** 处理保存收藏请求 */
    handleSaveFavorite: (data: SaveFavoriteData) => void
    /** 处理保存完成 */
    handleSaveFavoriteComplete: () => void
    /** 处理收藏优化提示词 */
    handleFavoriteOptimizePrompt: () => void
    /** 处理使用收藏 */
    handleUseFavorite: (favorite: FavoriteItem, options?: UseFavoriteOptions) => Promise<boolean>
}

const getFavoriteTargetKey = (favorite: FavoriteItem): string | null => {
    const favFunctionMode = favorite.functionMode
    if (favFunctionMode === 'image') {
        return `image-${favorite.imageSubMode || 'text2image'}`
    }

    if (favFunctionMode === 'basic' || favFunctionMode === 'context' || favFunctionMode === 'pro') {
        const targetFunctionMode = (favFunctionMode === 'context' || favFunctionMode === 'pro') ? 'pro' : 'basic'
        if (targetFunctionMode === 'pro') {
            const mode = favorite.optimizationMode ?? 'user'
            return mode === 'system' ? 'pro-multi' : 'pro-variable'
        }

        return `basic-${favorite.optimizationMode ?? 'system'}`
    }

    return null
}

const pickFavoriteExample = (
    examples: FavoriteReproducibilityExample[],
    options: UseFavoriteOptions,
): FavoriteReproducibilityExample | null => {
    if (!options.applyExample || examples.length === 0) return null

    const id = String(options.exampleId || '').trim()
    if (id) {
        const found = examples.find((example) => (example.id || '').trim() === id)
        if (found) return found
    }

    if (typeof options.exampleIndex === 'number' && Number.isInteger(options.exampleIndex)) {
        return examples[options.exampleIndex] || null
    }

    return examples[0] || null
}

/**
 * App 级别收藏管理 Composable
 */
export function useAppFavorite(options: AppFavoriteOptions): AppFavoriteReturn {
    const {
        navigateToSubModeKey,
        handleContextModeChange,
        optimizerPrompt,
        t,
        isLoadingExternalData,
        proMultiMessageSession,
        proVariableSession,
        imageText2ImageSession,
        imageImage2ImageSession,
        imageMultiImageSession,
        getFavoriteImageStorageService,
    } = options

    const toast = useToast()

    // 状态
    const showFavoriteManager = ref(false)
    const showSaveFavoriteDialog = ref(false)
    const saveFavoriteData = ref<SaveFavoriteData | null>(null)

    /**
     * 处理保存收藏请求
     */
    const handleSaveFavorite = (data: SaveFavoriteData) => {
        // 保存数据用于对话框预填充
        saveFavoriteData.value = data

        // 打开保存对话框
        showSaveFavoriteDialog.value = true
    }

    /**
     * 处理保存完成
     */
    const handleSaveFavoriteComplete = () => {
        // 关闭对话框已由组件内部处理
        // 可选:刷新收藏列表或显示额外提示
    }

    /**
     * 处理收藏优化提示词
     */
    const handleFavoriteOptimizePrompt = () => {
        // 关闭收藏管理对话框
        showFavoriteManager.value = false
        // 滚动到优化区域
        nextTick(() => {
            const inputPanel = document.querySelector('[data-input-panel]')
            if (inputPanel) {
                inputPanel.scrollIntoView({ behavior: 'smooth' })
            }
        })
    }

    /**
     * 处理使用收藏 - 智能模式切换（内部实现）
     */
    const getTemporaryVariablesSession = (targetKey: string | null): TemporaryVariablesSessionApi | null => {
        switch (targetKey) {
            case 'pro-multi':
                return proMultiMessageSession || null
            case 'pro-variable':
                return proVariableSession || null
            case 'image-text2image':
                return imageText2ImageSession || null
            case 'image-image2image':
                return imageImage2ImageSession || null
            case 'image-multiimage':
                return imageMultiImageSession || null
            default:
                return null
        }
    }

    const resolveExampleInputImages = async (example: FavoriteReproducibilityExample): Promise<ImagePayload[]> => {
        const storageService = getFavoriteImageStorageService?.() || null
        const sources = [...example.inputImages]

        if (storageService) {
            for (const assetId of example.inputImageAssetIds) {
                try {
                    const dataUrl = await resolveAssetIdToDataUrl(assetId, storageService)
                    if (dataUrl) sources.push(dataUrl)
                } catch (error) {
                    console.warn('[App] Failed to resolve favorite example input image:', error)
                }
            }
        }

        const images: ImagePayload[] = []
        for (const source of sources) {
            try {
                const payload = await normalizeImageSourceToPayload(source)
                if (payload) images.push(payload)
            } catch (error) {
                console.warn('[App] Failed to load favorite example input image:', error)
            }
        }

        return images
    }

    const applyFavoriteExample = async (
        favorite: FavoriteItem,
        targetKey: string | null,
        useOptions: UseFavoriteOptions,
    ) => {
        if (!useOptions.applyExample) return

        const reproducibility = parseFavoriteReproducibility(favorite)
        const example = pickFavoriteExample(reproducibility.examples, useOptions)
        if (!example) return

        const session = getTemporaryVariablesSession(targetKey)
        if (session) {
            const variableEntries = reproducibility.variables
                .map((variable) => ({
                    name: variable.name.trim(),
                    value: variable.defaultValue !== undefined ? String(variable.defaultValue) : '',
                }))
                .filter((variable) => isValidVariableName(variable.name))

            const variableNames = new Set(variableEntries.map((variable) => variable.name))
            session.clearTemporaryVariables()

            for (const { name, value } of variableEntries) {
                session.setTemporaryVariable(name, value)
            }

            for (const [key, value] of Object.entries(example.parameters)) {
                const name = key.trim()
                if (!isValidVariableName(name)) continue
                if (variableNames.size > 0 && !variableNames.has(name)) continue
                session.setTemporaryVariable(name, String(value))
            }
        }

        if (targetKey === 'image-image2image' && imageImage2ImageSession) {
            const [firstImage] = await resolveExampleInputImages(example)
            if (firstImage) {
                imageImage2ImageSession.updateInputImage(firstImage.b64, firstImage.mimeType)
            }
        }

        if (targetKey === 'image-multiimage' && imageMultiImageSession) {
            const images = await resolveExampleInputImages(example)
            if (images.length > 0) {
                imageMultiImageSession.replaceInputImages(images)
            }
        }
    }

    const handleUseFavoriteImpl = async (favorite: FavoriteItem, useOptions: UseFavoriteOptions = {}): Promise<boolean> => {
        const {
            functionMode: favFunctionMode,
            optimizationMode: favOptimizationMode,
            imageSubMode: favImageSubMode,
        } = favorite

        // 🔧 Step D: 使用 navigateToSubModeKey 一次性导航到目标路由
        // 不再分两步（先切 functionMode 再切 subMode）

        if (favFunctionMode === 'image') {
            // 图像模式：根据 favImageSubMode 确定目标子模式（默认 text2image）
            const targetSubMode = favImageSubMode || 'text2image'
            const targetKey = `image-${targetSubMode}`

            const didNavigate = await navigateToSubModeKey(targetKey)
            if (didNavigate === false) return false
            toast.info(t('toast.info.switchedToImageMode'))

            await nextTick()

            // 图像模式的数据回填逻辑
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('image-workspace-restore-favorite', {
                        detail: {
                            content: favorite.content,
                            imageSubMode: favImageSubMode || 'text2image',
                            metadata: favorite.metadata,
                        },
                    }),
                )
            }

            await applyFavoriteExample(favorite, targetKey, useOptions)

            toast.success(t('toast.success.imageFavoriteLoaded'))
        } else if (favFunctionMode === 'basic' || favFunctionMode === 'context' || favFunctionMode === 'pro') {
            // 基础模式或上下文模式

            // 1. 确定目标功能模式
            // 'pro' 和 'context' 都映射到 pro（兼容历史数据）
            const targetFunctionMode = (favFunctionMode === 'context' || favFunctionMode === 'pro') ? 'pro' : 'basic'

            // 2. 确定目标子模式（如果收藏指定了优化模式）
            // - basic: system/user
            // - pro: multi/variable（兼容旧 optimizationMode: system->multi, user->variable）
            let targetSubMode: BasicSubMode | ProSubMode
            if (targetFunctionMode === 'pro') {
                const mode = favOptimizationMode ?? 'user'
                targetSubMode = mode === 'system' ? 'multi' : 'variable'
            } else {
                targetSubMode = (favOptimizationMode ?? 'system') as BasicSubMode
            }

            // 3. 一次性导航到目标路由
            const targetKey = `${targetFunctionMode}-${targetSubMode}`
            const didNavigate = await navigateToSubModeKey(targetKey)
            if (didNavigate === false) return false

            await nextTick()

            // 4. 如果是 pro 模式，需要同步 contextMode（兼容旧逻辑）
            if (targetFunctionMode === 'pro' && favOptimizationMode) {
                await handleContextModeChange(favOptimizationMode as ContextMode)
            }

            toast.info(
                t('toast.info.switchedToFunctionMode', {
                    mode: targetFunctionMode === 'pro' ? t('common.context') : t('common.basic'),
                }),
            )

            if (favOptimizationMode) {
                toast.info(
                    t('toast.info.optimizationModeAutoSwitched', {
                        mode:
                            favOptimizationMode === 'system'
                                ? t('common.system')
                                : t('common.user'),
                    }),
                )
            }

            // 5. 将收藏的提示词内容设置到输入框
            optimizerPrompt.value = favorite.content
            if (targetKey === 'pro-variable') {
                proVariableSession?.updatePrompt?.(favorite.content)
            }
            await applyFavoriteExample(favorite, targetKey, useOptions)
        } else {
            // 其他情况：直接设置内容，不切换模式
            optimizerPrompt.value = favorite.content
            // 未知模式无法可靠定位目标 session，仅保留正文应用行为。
            await applyFavoriteExample(favorite, null, useOptions)
        }

        // 关闭收藏管理对话框
        showFavoriteManager.value = false

        // 显示成功提示
        toast.success(t('toast.success.favoriteLoaded'))

        return true
    }

    /**
     * 收藏加载的错误处理包装器
     */
    const handleUseFavorite = async (favorite: FavoriteItem, useOptions: UseFavoriteOptions = {}): Promise<boolean> => {
        try {
            // 🔧 设置外部数据加载标志，防止模式切换的自动 restore 覆盖外部数据
            isLoadingExternalData.value = true

            return await handleUseFavoriteImpl(favorite, useOptions)
        } catch (error) {
            // 捕获收藏加载过程中的所有错误
            console.error('[App] Failed to load favorite:', error)
            const errorMessage = error instanceof Error ? error.message : String(error)
            toast.error(t('toast.error.favoriteLoadFailed', { error: errorMessage }))
            return false
        } finally {
            // 🔧 恢复完成，重置标志，允许正常的模式切换 restore
            isLoadingExternalData.value = false
        }
    }

    return {
        showFavoriteManager,
        showSaveFavoriteDialog,
        saveFavoriteData,
        handleSaveFavorite,
        handleSaveFavoriteComplete,
        handleFavoriteOptimizePrompt,
        handleUseFavorite,
    }
}
