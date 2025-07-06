/**
 * Utility functions for environment detection and configuration.
 */

// 由于我们假定Vercel状态是不可变的，我们只需要知道它是否被检查过以及结果。
interface VercelStatus {
  checked: boolean;
  available: boolean;
}

// 存储Vercel环境检测结果的缓存
let vercelStatusCache: VercelStatus = {
  checked: false,
  available: false,
};

const PROXY_URL_KEY = 'proxy-url-status';

/**
 * 检查是否在浏览器环境中
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * 异步检查Vercel API是否可用。
 * 实现"只检查一次"的逻辑，假定状态检查后不会改变。
 */
export async function checkVercelApiAvailability(): Promise<boolean> {
  // 如果内存缓存中已检查过，直接返回结果。
  if (vercelStatusCache.checked) {
    return vercelStatusCache.available;
  }

  // 兼容Vercel Edge环境
  if (typeof window === 'undefined') {
    return false;
  }

  // 如果在Electron环境中，不需要检测Vercel API
  if (isRunningInElectron()) {
    console.log('[Environment Detection] Skipping Vercel API detection in Electron environment');
    vercelStatusCache = { available: false, checked: true };
    return false;
  }

  // 检查localStorage中是否有持久化的结果（页面刷新后依然有效）
  const cachedStatus = JSON.parse(localStorage.getItem(PROXY_URL_KEY) || 'null');
  if (cachedStatus && cachedStatus.checked) {
    vercelStatusCache = cachedStatus;
    return vercelStatusCache.available;
  }

  try {
    const response = await fetch('/api/vercel-status');
    
    // 检查响应是否成功并且内容类型是否为JSON
    const contentType = response.headers.get('content-type');
    if (response.ok && contentType && contentType.includes('application/json')) {
      const data = await response.json();
      const isAvailable = data.status === 'available' && data.proxySupport === true;
    
      // 更新缓存并持久化
      vercelStatusCache = { available: isAvailable, checked: true };
      localStorage.setItem(PROXY_URL_KEY, JSON.stringify(vercelStatusCache));
    
      return isAvailable;
    }else{
      return false;
    }
  } catch (error) {
    console.log('[Environment Detection] Vercel API detection failed', error);
  }

  // 检查失败或出错，同样标记为已检查并缓存失败状态
    vercelStatusCache = { available: false, checked: true };
  localStorage.setItem(PROXY_URL_KEY, JSON.stringify(vercelStatusCache));
    return false;
  }

/**
 * 检查是否在Vercel环境中（同步版本，使用缓存结果）
 */
export const isVercel = (): boolean => {
  return vercelStatusCache.checked && vercelStatusCache.available;
};

/**
 * 重置Vercel状态缓存，主要用于测试
 */
export const resetVercelStatusCache = (): void => {
  vercelStatusCache = {
    checked: false,
    available: false,
  };
  localStorage.removeItem(PROXY_URL_KEY);
};

/**
 * 获取API代理URL
 * @param baseURL 原始基础URL
 * @param isStream 是否是流式请求
 */
export const getProxyUrl = (baseURL: string | undefined, isStream: boolean = false): string => {
  if (!baseURL) {
    return '';
  }
  
  // 获取当前域名作为基础URL
  const origin = isBrowser() ? window.location.origin : '';
  const proxyEndpoint = isStream ? 'stream' : 'proxy';
  
  // 返回完整的绝对URL
  return `${origin}/api/${proxyEndpoint}?targetUrl=${encodeURIComponent(baseURL)}`;
}; 

/**
 * 检测是否在Electron环境中运行
 * 使用多重检测机制确保准确性
 */
export function isRunningInElectron(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // 检查多个Electron特征
  const hasElectronAPI = typeof (window as any).electronAPI !== 'undefined';
  const hasElectronProcess = typeof (window as any).process !== 'undefined' &&
                            (window as any).process?.type === 'renderer';
  const hasElectronRequire = typeof (window as any).require !== 'undefined';
  const userAgent = window.navigator?.userAgent?.toLowerCase() || '';
  const hasElectronUserAgent = userAgent.includes('electron');

  console.log('[isRunningInElectron] Detection details:', {
    hasElectronAPI,
    hasElectronProcess,
    hasElectronRequire,
    hasElectronUserAgent,
    userAgent,
  });

  // 如果有electronAPI，肯定是Electron
  if (hasElectronAPI) {
    console.log('[isRunningInElectron] Verdict: true (via electronAPI)');
    return true;
  }

  // 如果有其他Electron特征，也认为是Electron（可能是preload脚本还没执行完）
  if (hasElectronProcess || hasElectronRequire || hasElectronUserAgent) {
    console.warn('[Environment] Detected Electron environment but electronAPI not available yet');
    console.log(`[isRunningInElectron] Verdict: true (via fallback checks: process=${hasElectronProcess}, require=${hasElectronRequire}, userAgent=${hasElectronUserAgent})`);
    return true;
  }

  console.log('[isRunningInElectron] Verdict: false');
  return false;
}

/**
 * 检测Electron API是否完全就绪
 * 不仅检测环境，还检测关键API的可用性
 */
export function isElectronApiReady(): boolean {
  if (!isRunningInElectron()) {
    return false;
  }

  const window_any = window as any;
  const hasElectronAPI = typeof window_any.electronAPI !== 'undefined';
  const hasPreferenceApi = hasElectronAPI && typeof window_any.electronAPI.preference !== 'undefined';
  
  console.log('[isElectronApiReady] API readiness check:', {
    hasElectronAPI,
    hasPreferenceApi,
  });

  // 检查electronAPI.preference是否可用
  return hasElectronAPI && hasPreferenceApi;
}

/**
 * 等待Electron API完全就绪
 * @param timeout 超时时间（毫秒），默认5000ms
 * @returns Promise<boolean> 是否在超时前API就绪
 */
export function waitForElectronApi(timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    // 如果已经就绪，立即返回
    if (isElectronApiReady()) {
      console.log('[waitForElectronApi] API already ready');
      resolve(true);
      return;
    }
    
    console.log('[waitForElectronApi] Waiting for Electron API...');
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isElectronApiReady()) {
        clearInterval(checkInterval);
        console.log('[waitForElectronApi] API ready after', Date.now() - startTime, 'ms');
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        console.warn('[waitForElectronApi] Timeout waiting for Electron API after', timeout, 'ms');
        resolve(false);
      }
    }, 50); // 每50ms检查一次
  });
}