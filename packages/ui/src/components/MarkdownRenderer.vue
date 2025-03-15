<template>
  <div ref="markdownContainer" class="markdown-content theme-markdown-content" v-html="renderedMarkdown"></div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
});

const renderedMarkdown = ref('');
const markdownContainer = ref(null);

// 配置marked使用highlight.js进行代码高亮
marked.setOptions({
  highlight: function(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-',
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false,
  sanitize: false,
  smartLists: true,
  smartypants: false
});

// 添加一个变量追踪是否已检测到</think>标签
const hasDetectedClosingTag = ref(false);

// 预处理<think>标签，将其转换为<details>和<summary>
const preprocessThinkTags = (content) => {
  // 检查内容是否包含</think>标签
  if (content.includes('</think>')) {
    hasDetectedClosingTag.value = true;
  }
  
  // 检查是否有<think>标签
  if (!content.includes('<think>')) {
    return content;
  }
  
  // 替换开始标签为details和summary
  // 如果已检测到结束标签，则不设置open属性，否则设置open使其显示
  const openAttr = hasDetectedClosingTag.value ? '' : ' open';
  let processed = content.replace(
    /<think>/g, 
    `<details class="markdown-think"${openAttr}><summary>思考过程</summary><div class="think-content">`
  );
  
  // 替换结束标签
  processed = processed.replace(/<\/think>/g, '</div></details>');
  
  return processed;
};

// 渲染后关闭思考区块
const handleThinkBlocksFolding = () => {
  nextTick(() => {
    if (!markdownContainer.value) return;
    
    // 找到所有思考区块
    const thinkBlocks = markdownContainer.value.querySelectorAll('.markdown-think');
    
    // 如果已检测到</think>标签，则折叠所有思考区块
    if (hasDetectedClosingTag.value && thinkBlocks.length > 0) {
      thinkBlocks.forEach(block => {
        // 短暂延迟后关闭
        setTimeout(() => {
          block.removeAttribute('open');
        }, 500);
      });
    }
  });
};

// 渲染Markdown内容
const renderMarkdown = () => {
  if (!props.content) {
    renderedMarkdown.value = '';
    // 重置状态，为下一次对话做准备
    hasDetectedClosingTag.value = false;
    return;
  }
  
  try {
    // 预处理<think>标签
    const processedContent = preprocessThinkTags(props.content);
    
    // 使用marked将Markdown转为HTML
    const rawHtml = marked.parse(processedContent);
    
    // 配置DOMPurify允许details和summary标签
    const purifyConfig = {
      ADD_TAGS: ['details', 'summary', 'div'],
      ADD_ATTR: ['open', 'class', 'id']
    };
    
    // 使用DOMPurify清理HTML
    renderedMarkdown.value = DOMPurify.sanitize(rawHtml, purifyConfig);

    // 处理思考区块的折叠
    handleThinkBlocksFolding();
  } catch (error) {
    console.error('Markdown parsing error:', error);
    renderedMarkdown.value = `<p class="text-red-500">Error rendering markdown: ${error.message}</p>`;
  }
};

// 监听content变化时重新渲染
watch(() => props.content, (newContent) => {
  if (!newContent || newContent.trim() === '') {
    hasDetectedClosingTag.value = false;
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
  margin-top: 0.4em;
  margin-bottom: 0.2em;
  font-weight: 600;
}

.markdown-content h2 {
  line-height: 1.5;
  font-size: 1.4em;
  margin-top: 0.3em;
  margin-bottom: 0.15em;
  font-weight: 600;
  padding-bottom: 0.1em;
}

.markdown-content h3 {
  line-height: 1.5;
  font-size: 1.2em;
  margin-top: 0.2em;
  margin-bottom: 0.1em;
  font-weight: 600;
}

.markdown-content h4 {
  line-height: 1.5;
  font-size: 1em;
  margin-top: 0.1em;
  margin-bottom: 0.05em;
  font-weight: 600;
}

/* 段落样式 */
.markdown-content p {
  line-height: 1.5;
  margin-top: 0.1em;
  margin-bottom: 0.1em;
  white-space: pre-wrap;
}

/* 列表样式 */
.markdown-content ul,
.markdown-content ol {
  padding-left: 1.5em;
  line-height: 0.5;
}

.markdown-content ul > li {
  line-height: 1.5;
  margin-bottom: 0.05em;
}

.markdown-content li > ul {
  margin-top: 0;
  margin-bottom: 0;
  padding-bottom: 0;
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
  margin: 0;
  border-radius: 2px;
}

.markdown-content pre code {
  padding: 0;
  background-color: transparent;
}

/* 引用样式 */
.markdown-content blockquote {
  padding: 0.1em 0.5em;
  margin: 0.1em 0;
}

/* 表格样式 */
.markdown-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.1em 0;
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
  padding: 0;
  margin: 0;
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
  padding: 0.1em;
  margin: 0.2em 0;
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
}

/* 为不同主题定制箭头颜色 */
:root[data-theme="blue"] .markdown-think summary::before {
  border-color: #3b82f6;
}

:root[data-theme="green"] .markdown-think summary::before {
  border-color: #10b981;
}

:root[data-theme="purple"] .markdown-think summary::before {
  border-color: #8b5cf6;
}

:root[data-theme="dark"] .markdown-think summary::before {
  border-color: #e2e8f0;
}
/* 内容区域样式调整 */
.markdown-think .think-content {
  padding: 0 0.7em;
}
</style>