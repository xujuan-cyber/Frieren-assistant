<template>
  <div ref="markdownContainer" class="markdown-content theme-markdown-content"></div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps({
  content: {
    type: String,
    default: ''
  }
});

const markdownContainer = ref(null);

// 创建 markdown-it 实例并配置插件
const md = new MarkdownIt({
  html: true,
  breaks: false,
  linkify: true,
  typographer: true,
  highlight: function(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return '';
  }
});

// 使用闭包管理思考标签状态
const thinkTagState = {
  // 标记是否打开了思考块
  hasOpenedThinkBlock: false,
  // 标记是否完成了思考块
  hasCompletedThinkBlock: false,
  // 当前渲染的思考块元素
  currentThinkBlock: null,
  // 防抖计时器
  debounceTimer: null,
  // 思考块内容
  thinkContent: '',
  // 重置状态
  reset() {
    this.hasOpenedThinkBlock = false;
    this.hasCompletedThinkBlock = false;
    this.currentThinkBlock = null;
    this.thinkContent = '';
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
};

// 预处理Markdown内容，移除多余空行
const removeExtraEmptyLines = (content) => {
  return content.replace(/\n\s*\n\s*(\n\s*)+/g, '\n\n');
};

// 检测思考标签的状态
const detectThinkTagStatus = (content) => {
  const hasOpenTag = content.includes('<think>');
  const hasCloseTag = content.includes('</think>');
  
  if (hasOpenTag && !thinkTagState.hasOpenedThinkBlock) {
    // 首次检测到开始标签
    thinkTagState.hasOpenedThinkBlock = true;
    thinkTagState.hasCompletedThinkBlock = false;
  }
  
  if (hasCloseTag && thinkTagState.hasOpenedThinkBlock) {
    // 检测到结束标签且已经有开始标签
    thinkTagState.hasCompletedThinkBlock = true;
  }
  
  return { hasOpenTag, hasCloseTag };
};

// 预处理<think>标签，将其转换为<details>和<summary>
const preprocessThinkTags = (content) => {
  const { hasOpenTag, hasCloseTag } = detectThinkTagStatus(content);
  
  if (!hasOpenTag) {
    return content;
  }

  const thinkingLabel = t('test.thinking') || '思考过程';
  let processedContent = content;
  
  // 如果有开始标签但没有结束标签，添加一个临时的结束标签用于渲染
  if (hasOpenTag && !hasCloseTag) {
    // 提取思考内容
    const thinkMatch = /<think>([\s\S]*?)$/.exec(content);
    if (thinkMatch) {
      thinkTagState.thinkContent = thinkMatch[1];
    }
    
    // 使用开放的details标签
    processedContent = processedContent.replace(
      /<think>([\s\S]*?)$/,
      `<details class="markdown-think" open data-streaming="true"><summary>${thinkingLabel}</summary><div class="think-content">$1</div></details>`
    );
  } else if (hasOpenTag && hasCloseTag) {
    // 有完整的开始和结束标签
    const openAttr = thinkTagState.hasCompletedThinkBlock ? '' : ' open';
    processedContent = processedContent.replace(
      /<think>([\s\S]*?)<\/think>/g,
      `<details class="markdown-think"${openAttr}><summary>${thinkingLabel}</summary><div class="think-content">$1</div></details>`
    );
  }
  
  return processedContent;
};

// 处理思考区块的折叠和流式更新
const handleThinkBlocks = () => {
  if (!markdownContainer.value) return;
  
  nextTick(() => {
    if (!markdownContainer.value) return;
    
    // 找到所有思考区块
    const thinkBlocks = markdownContainer.value.querySelectorAll('.markdown-think');
    
    if (thinkBlocks.length > 0) {
      // 找到流式渲染的块
      const streamingBlock = markdownContainer.value.querySelector('.markdown-think[data-streaming="true"]');
      
      if (streamingBlock) {
        // 记录当前流式块的引用
        thinkTagState.currentThinkBlock = streamingBlock;
      }
      
      // 如果已完成思考块且不是流式渲染，则折叠所有思考区块
      if (thinkTagState.hasCompletedThinkBlock) {
        // 使用短时延迟确保DOM已完全更新
        if (thinkTagState.debounceTimer) {
          clearTimeout(thinkTagState.debounceTimer);
        }
        
        thinkTagState.debounceTimer = setTimeout(() => {
          thinkBlocks.forEach(block => {
            // 移除流式属性
            block.removeAttribute('data-streaming');
            // 折叠思考块
            try {
              block.removeAttribute('open');
            } catch (e) {
              console.warn('无法修改思考区块属性:', e);
            }
          });
        }, 100); // 使用较短的延迟
      }
    }
  });
};

// 防止思考块闪烁的处理器
const preventThinkBlockFlickering = () => {
  if (!markdownContainer.value) return;
  
  // 添加事件委托处理器，防止点击思考块时的闪烁
  if (!markdownContainer.value.hasClickListener) {
    markdownContainer.value.addEventListener('click', (event) => {
      // 检查是否点击了summary元素
      const summary = event.target.closest('summary');
      if (summary && summary.parentElement.hasAttribute('data-streaming')) {
        // 阻止默认行为，防止流式渲染时的闪烁
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
    
    markdownContainer.value.hasClickListener = true;
  }
};

// 优化后的HTML处理函数，只在DOM中操作一次
const processHTML = (html) => {
  // 使用DocumentFragment进行DOM操作
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const fragment = doc.body;
  
  // 1. 删除空节点处理函数
  const processNode = (node) => {
    // 跳过非元素节点的处理
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    // 处理所有子节点
    const children = Array.from(node.childNodes);
    
    // 删除空文本节点和空段落
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      
      // 处理文本节点
      if (child.nodeType === Node.TEXT_NODE) {
        if (!child.textContent.trim()) {
          node.removeChild(child);
        } else {
          // 压缩多余空格
          child.textContent = child.textContent.replace(/\s{2,}/g, ' ');
        }
        continue;
      }
      
      // 处理元素节点
      if (child.nodeType === Node.ELEMENT_NODE) {
        // 递归处理子元素
        processNode(child);
        
        // 移除空段落
        if (child.tagName === 'P' && !child.textContent.trim() && !child.querySelector('img, br')) {
          node.removeChild(child);
        }
      }
    }
  };
  
  // 处理整个文档
  processNode(fragment);
  
  // 返回处理后的HTML
  return fragment.innerHTML;
};

// 渲染Markdown内容
const renderMarkdown = () => {
  if (!props.content) {
    if (markdownContainer.value) {
      markdownContainer.value.innerHTML = '';
    }
    // 重置状态，为下一次对话做准备
    thinkTagState.reset();
    return;
  }
  
  try {
    // 预处理内容
    let processedContent = removeExtraEmptyLines(props.content);
    
    // 预处理<think>标签
    processedContent = preprocessThinkTags(processedContent);
    
    // 使用markdown-it将Markdown转为HTML
    const rawHtml = md.render(processedContent);
    
    // 使用优化后的HTML处理函数
    const processedHtml = processHTML(rawHtml);
    
    // 配置DOMPurify允许details和summary标签以及自定义属性
    const purifyConfig = {
      ADD_TAGS: ['details', 'summary', 'div'],
      ADD_ATTR: ['open', 'class', 'id', 'data-streaming']
    };
    
    // 使用DOMPurify清理HTML
    const cleanHtml = DOMPurify.sanitize(processedHtml, purifyConfig);
    
    if (markdownContainer.value) {
      markdownContainer.value.innerHTML = cleanHtml;
      
      // 处理思考区块的折叠和流式更新
      handleThinkBlocks();
      
      // 防止思考块闪烁
      preventThinkBlockFlickering();
    }
  } catch (error) {
    console.error('Markdown parsing error:', error);
    if (markdownContainer.value) {
      markdownContainer.value.innerHTML = `<p class="text-red-500">Error rendering markdown: ${error.message}</p>`;
    }
  }
};

// 监听content变化时重新渲染
watch(() => props.content, (newContent) => {
  if (!newContent || newContent.trim() === '') {
    thinkTagState.reset();
  }
  renderMarkdown();
}, { immediate: true });

// 组件挂载时渲染
onMounted(() => {
  renderMarkdown();
});
</script>

<style>
/* 基本布局和非颜色样式 */
.markdown-content {
  line-height: 1.5;
  word-wrap: break-word;
}

/* 标题样式 */
.markdown-content h1 {
  line-height: 1.5;
  font-size: 1.6em;
  margin: 1em 0;
  font-weight: 600;
}

.markdown-content h2 {
  line-height: 1.5;
  font-size: 1.4em;
  margin: 0.8em 0;
  font-weight: 600;
  padding-bottom: 0.1em;
}

.markdown-content h3 {
  line-height: 1.5;
  font-size: 1.2em;
  margin: 0.5em 0;
  font-weight: 600;
}

.markdown-content h4 {
  line-height: 1.5;
  font-size: 1em;
  margin: 0.3em 0;
  font-weight: 600;
}

/* 段落样式 */
.markdown-content p {
  line-height: 1.6;
  margin: 0.3em 0;
  white-space: pre-wrap;
}

/* 列表样式 */
.markdown-content ul,
.markdown-content ol {
  padding-left: 1.5em;
  margin: 0.3em 0;
  line-height: 1.5;
}

/* 重要：设置列表项为紧凑布局 */
.markdown-content li {
  line-height: 1.5;
  margin: 0.3em 0;
}

/* 代码块样式 */
.markdown-content pre {
  border-radius: 4px;
  padding: 0.5em;
  overflow: auto;
  margin-bottom: 0.1em;
}

.markdown-content code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.85em;
  padding: 0.1em 0.2em;
  margin: 0.3em 0;
  border-radius: 2px;
}

.markdown-content pre code {
  background-color: transparent;
}

/* 引用样式 */
.markdown-content blockquote {
  padding: 0.1em 0.5em;
  margin: 0.3em 0;
}

/* 表格样式 */
.markdown-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.3em 0;
  overflow: auto;
  font-size: 0.9em;
}

.markdown-content table th,
.markdown-content table td {
  line-height: 1.5;
  padding: 0.3em 0.5em;
}

/* 图片样式 */
.markdown-content img {
  max-width: 100%;
  box-sizing: border-box;
  margin: 0.1em 0;
}

/* 水平线样式 */
.markdown-content hr {
  height: 0.25em;
  border: 1;
}

/* 链接样式 */
.markdown-content a {
  text-decoration: none;
}

.markdown-content a:hover {
  text-decoration: underline;
}

.markdown-think {
  white-space: pre-line;
}

/* 自定义summary箭头样式 */
.markdown-think summary {
  position: relative;
  list-style: none; /* 移除默认的三角形 */
  cursor: pointer;
  padding: 0.3em 0.5em 0.3em 1.5em; /* 为箭头留出空间 */
  user-select: none;
  font-weight: 600;
}

/* 移除所有浏览器的默认标记 */
.markdown-think summary::-webkit-details-marker {
  display: none;
}

.markdown-think summary::marker {
  display: none;
}

/* 添加自定义箭头 */
.markdown-think summary::before {
  content: '';
  position: absolute;
  left: 0.5em;
  top: 50%;
  transform: translateY(-50%) rotate(-45deg);
  width: 0.4em;
  height: 0.4em;
  border-style: solid;
  border-width: 0 0 2px 2px;
  transition: transform 0.2s ease;
}

/* 打开状态的箭头 */
.markdown-think[open] > summary::before {
  transform: translateY(-50%) rotate(135deg);
}

/* 鼠标悬停效果 */
.markdown-think summary:hover {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

/* 内容区域样式调整 */
.markdown-think .think-content {
  padding: 0 0.7em;
}
</style>