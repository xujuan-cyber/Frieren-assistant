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
 */
export function isRunningInElectron(): boolean {
  return typeof window !== 'undefined' && 
         typeof (window as any).electronAPI !== 'undefined';
} 