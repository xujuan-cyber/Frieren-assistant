import { Fragment, h, type Ref, type VNode, type VNodeChild } from 'vue'
import { NTooltip } from 'naive-ui'
import { NBaseIcon } from 'naive-ui/es/_internal'
import { DownloadIcon } from 'naive-ui/es/_internal/icons'
import type { ImageRenderToolbar, ImageRenderToolbarProps } from 'naive-ui/es/image/src/public-types'

import { downloadImageSource } from '../../utils/image-download'

type SafePreviewToolbarOptions = {
  clsPrefixRef: Ref<string>
  showToolbarTooltip: boolean
  downloadLabel: string
  includeNavigation: boolean
  userRenderToolbar?: ImageRenderToolbar
  resolveDownloadSource: () => string | null | undefined
  resolveDownloadFilename?: () => string | undefined
}

const renderDefaultToolbar = (
  nodes: ImageRenderToolbarProps['nodes'],
  includeNavigation: boolean,
): VNodeChild => {
  const items: VNode[] = []

  if (includeNavigation) {
    items.push(nodes.prev, nodes.next)
  }

  items.push(
    nodes.rotateCounterclockwise,
    nodes.rotateClockwise,
    nodes.resizeToOriginalSize,
    nodes.zoomOut,
    nodes.zoomIn,
    nodes.download,
    nodes.close,
  )

  return h(Fragment, null, items)
}

export const resolveActivePreviewImageSource = (clsPrefix: string): string | null => {
  if (typeof document === 'undefined') return null
  const image = document.querySelector<HTMLImageElement>(`.${clsPrefix}-image-preview`)
  return image?.currentSrc || image?.src || null
}

export const createSafeImageToolbarRenderer = (
  options: SafePreviewToolbarOptions,
): ImageRenderToolbar => {
  const renderDownloadNode = () => {
    const iconNode = h(
      NBaseIcon,
      {
        clsPrefix: options.clsPrefixRef.value,
        onClick: (event: MouseEvent) => {
          event.preventDefault()
          event.stopPropagation()
          const source = options.resolveDownloadSource()
          void downloadImageSource(source, {
            filename: options.resolveDownloadFilename?.(),
          })
        },
      },
      {
        default: () => h(DownloadIcon, null),
      },
    )

    if (!options.showToolbarTooltip) {
      return iconNode
    }

    return h(
      NTooltip,
      {
        to: false,
        keepAliveOnHover: false,
      },
      {
        default: () => options.downloadLabel,
        trigger: () => iconNode,
      },
    )
  }

  return (toolbarProps: ImageRenderToolbarProps) => {
    const mergedNodes = {
      ...toolbarProps.nodes,
      download: renderDownloadNode(),
    }

    if (options.userRenderToolbar) {
      return options.userRenderToolbar({ nodes: mergedNodes })
    }

    return renderDefaultToolbar(mergedNodes, options.includeNavigation)
  }
}
