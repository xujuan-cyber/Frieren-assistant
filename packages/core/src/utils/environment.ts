/**
 * 环境工具函数
 */

// 存储Vercel环境检测结果的缓存
let vercelStatusCache: { available: boolean; checked: boolean } = {
  available: false,
  checked: false
};

/**
 * 检查是否在浏览器环境中
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * 检测Vercel API是否可用
 * 使用异步方式检测，结果会被缓存
 */
export const checkVercelApiAvailability = async (): Promise<boolean> => {
  // 如果已经检查过，直接返回缓存结果
  if (vercelStatusCache.checked) {
    return vercelStatusCache.available;
  }

  if (!isBrowser()) {
    vercelStatusCache = { available: false, checked: true };
    return false;
  }

  try {
    // 获取当前域名作为基础URL
    const origin = window.location.origin;
    const response = await fetch(`${origin}/api/vercel-status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // 设置较短的超时时间，避免长时间等待
      signal: AbortSignal.timeout(3000)
    });

    // 检查响应状态，只有200状态码且内容proxySupport为true
    if (response.status !== 200) {
      vercelStatusCache = { available: false, checked: true };
      console.log('[环境检测] 未检测到Vercel部署环境，代理功能不可用');
      return false;
    }
    
    // 解析JSON响应
    const data = await response.json();
    const isAvailable = data.status === 'available' && data.proxySupport === true;
    
    vercelStatusCache = { available: isAvailable, checked: true };
    
    if (isAvailable) {
      console.log('[环境检测] 检测到Vercel部署环境，代理功能可用');
    } else {
      console.log('[环境检测] 未检测到Vercel部署环境，代理功能不可用');
    }
    
    return isAvailable;
  } catch (error) {
    console.log('[环境检测] Vercel API检测失败', error);
    vercelStatusCache = { available: false, checked: true };
    return false;
  }
};

/**
 * 重置环境检测缓存
 * 用于在需要重新检测时调用
 */
export const resetVercelStatusCache = (): void => {
  vercelStatusCache = { available: false, checked: false };
};

/**
 * 检查是否在Vercel环境中（同步版本，使用缓存结果）
 */
export const isVercel = (): boolean => {
  // 如果未检查过，返回false，应用需要先调用异步检测方法
  return vercelStatusCache.checked && vercelStatusCache.available;
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