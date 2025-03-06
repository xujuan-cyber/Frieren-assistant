<template>
  <div class="relative">
    <button
      @click="toggleThemeMenu" 
      class="theme-icon-button"
    >
      <span class="text-base sm:text-lg inline-flex items-center align-middle">
        <svg v-if="currentTheme === 'dark'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
        </svg>
        <svg v-else-if="currentTheme === 'light'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
        <svg v-else-if="currentTheme === 'blue'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
        </svg>
        <svg v-else-if="currentTheme === 'green'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clip-rule="evenodd" />
        </svg>
        <svg v-else-if="currentTheme === 'purple'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
        </svg>
      </span>
      <span class="text-sm max-sm:hidden">{{ getThemeDisplayName }}</span>
    </button>

    <!-- 主题选择下拉菜单 -->
    <div v-if="showThemeMenu" class="absolute right-0 mt-2 w-48 theme-dropdown z-50">
      <div class="py-1">
        <button 
          v-for="theme in availableThemes" 
          :key="theme.id"
          @click="selectTheme(theme.id)"
          class="w-full text-left px-4 py-2 flex items-center gap-2 theme-dropdown-item"
          :class="currentTheme === theme.id ? 'theme-dropdown-item-active' : 'theme-dropdown-item-inactive'"
        >
          <span class="w-5 h-5 flex-shrink-0" :class="theme.iconClass">
            <svg v-if="theme.id === 'light'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
            </svg>
            <svg v-else-if="theme.id === 'dark'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
            <svg v-else-if="theme.id === 'blue'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
            </svg>
            <svg v-else-if="theme.id === 'green'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clip-rule="evenodd" />
            </svg>
            <svg v-else-if="theme.id === 'purple'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
            </svg>
          </span>
          <span>{{ theme.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
  
<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';

// 可用主题列表
const availableThemes = [
  {
    id: 'light',
    name: '日间模式',
    iconClass: 'text-yellow-500',
    cssClass: ''
  },
  {
    id: 'dark',
    name: '夜间模式',
    iconClass: 'text-gray-400',
    cssClass: 'dark'
  },
  {
    id: 'blue',
    name: '蓝色模式',
    iconClass: 'text-blue-500',
    cssClass: 'theme-blue'
  },
  {
    id: 'green',
    name: '绿色模式',
    iconClass: 'text-green-500',
    cssClass: 'theme-green'
  },
  {
    id: 'purple',
    name: '暗紫模式',
    iconClass: 'text-purple-500',
    cssClass: 'theme-purple'
  }
];

const currentTheme = ref('light');
const showThemeMenu = ref(false);

// 切换主题菜单显示状态
const toggleThemeMenu = () => {
  showThemeMenu.value = !showThemeMenu.value;
};

// 选择主题
const selectTheme = (themeId) => {
  currentTheme.value = themeId;
  showThemeMenu.value = false;
  updateTheme();
};

// 更新主题
const updateTheme = () => {
  // 获取当前主题
  const theme = availableThemes.find(t => t.id === currentTheme.value);
  if (!theme) return;
  
  // 获取当前激活的主题类
  const activeThemeClass = Array.from(document.documentElement.classList)
    .find(cls => ['dark', 'theme-blue', 'theme-green', 'theme-purple'].includes(cls));
  
  // 如果当前有主题类，先移除
  if (activeThemeClass) {
    document.documentElement.classList.remove(activeThemeClass);
  }
  
  // 如果新主题有类，则添加
  if (theme.cssClass) {
    document.documentElement.classList.add(theme.cssClass);
  }

  // 更新data-theme属性
  document.documentElement.setAttribute('data-theme', theme.id);
  
  // 保存主题设置到本地存储
  localStorage.setItem('theme-id', theme.id);

  // 触发重新渲染
  nextTick(() => {
    window.dispatchEvent(new Event('theme-changed'));
  });
};

// 获取主题显示名称
const getThemeDisplayName = computed(() => {
  const theme = availableThemes.find(t => t.id === currentTheme.value);
  return theme ? theme.name : '主题设置';
});

// 点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  if (showThemeMenu.value && !event.target.closest('.relative')) {
    showThemeMenu.value = false;
  }
};

// 初始化主题
onMounted(() => {
  // 确保DOM加载完成后再应用主题
  requestAnimationFrame(() => {
    // 获取主题ID：优先使用theme-id，如果没有则从theme中获取
    let themeId = localStorage.getItem('theme-id');
    
    if (!themeId) {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        const theme = availableThemes.find(t => t.cssClass === savedTheme);
        if (theme) {
          themeId = theme.id;
          // 更新为新格式
          localStorage.setItem('theme-id', themeId);
          // 清除旧格式
          localStorage.removeItem('theme');
        }
      }
    }

    // 设置当前主题
    if (themeId && availableThemes.find(t => t.id === themeId)) {
      currentTheme.value = themeId;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      currentTheme.value = 'dark';
    } else {
      currentTheme.value = 'light';
    }
    
    // 应用主题
    updateTheme();
  });
  
  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = (e) => {
    // 只在没有用户设置的主题时响应系统主题变化
    if (!localStorage.getItem('theme-id')) {
      currentTheme.value = e.matches ? 'dark' : 'light';
      updateTheme();
    }
  };
  
  // 添加事件监听器
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
  } else if (mediaQuery.addListener) { // 兼容旧版浏览器
    mediaQuery.addListener(handleChange);
  }
  
  // 添加点击外部关闭下拉菜单的事件监听
  document.addEventListener('click', handleClickOutside);
});

// 组件卸载前移除事件监听
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>