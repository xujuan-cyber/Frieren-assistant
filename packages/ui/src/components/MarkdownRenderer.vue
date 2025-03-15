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

// 添加一个变量追踪是否已检测到</think>标签
const hasDetectedClosingTag = ref(false);

// 预处理Markdown内容，移除多余空行
const removeExtraEmptyLines = (content) => {
  // 移除连续的多个空行，只保留一个
  return content.replace(/\n\s*\n\s*\n/g, '\n\n');
};

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

  const thinkingLabel = t('test.thinking') || '思考过程';
  
  // 替换开始标签为details和summary
  // 如果已检测到结束标签，则不设置open属性，否则设置open使其显示
  const openAttr = hasDetectedClosingTag.value ? '' : ' open';
  let processed = content.replace(
    /<think>/g, 
    `<details class="markdown-think"${openAttr}><summary>${thinkingLabel}</summary><div class="think-content">`
  );
  
  // 替换结束标签
  processed = processed.replace(/<\/think>/g, '</div></details>');
  
  return processed;
};

// 渲染后关闭思考区块
const handleThinkBlocksFolding = () => {
  // 确保组件仍在DOM中
  if (!markdownContainer.value) return;
  
  // 使用nextTick确保DOM已更新
  nextTick(() => {
    // 再次检查组件是否存在（可能在nextTick期间被卸载）
    if (!markdownContainer.value) return;
    
    // 找到所有思考区块
    const thinkBlocks = markdownContainer.value.querySelectorAll('.markdown-think');
    
    // 如果已检测到</think>标签，则折叠所有思考区块
    if (hasDetectedClosingTag.value && thinkBlocks.length > 0) {
      // 使用单个计时器而不是多个
      const timer = setTimeout(() => {
        // 再次检查组件是否存在（可能在setTimeout期间被卸载）
        if (markdownContainer.value) {
          thinkBlocks.forEach(block => {
            try {
              block.removeAttribute('open');
            } catch (e) {
              console.warn('无法修改思考区块属性:', e);
            }
          });
        }
      }, 500);
    }
  });
};

// 后处理HTML，移除空段落和压缩间距
const postProcessHTML = (html) => {
  let processedHtml = html;
  
  // 转换为DOM对象进行更精确的处理
  const parser = new DOMParser();
  const doc = parser.parseFromString(processedHtml, 'text/html');
  
  // 删除所有空白文本节点
  const removeEmptyTextNodes = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent.trim()) {
        node.parentNode?.removeChild(node);
        return;
      }
    }
    
    // 递归处理子节点
    const children = [...node.childNodes];
    children.forEach(removeEmptyTextNodes);
  };
  
  // 处理markdown-content内的所有节点
  const contentNode = doc.body;
  removeEmptyTextNodes(contentNode);
  
  // 转回字符串
  processedHtml = contentNode.innerHTML;
  
  // 使用正则表达式进一步处理
  return processedHtml
    // 处理多余空格
    .replace(/\s{2,}/g, ' ')
    // 移除空白段落
    .replace(/<p>\s*<\/p>/g, '')
    
    // 压缩所有块级元素之间的空白
    .replace(/(<\/(p|h[1-6]|ul|ol|blockquote|pre|div)>)\s*(<(p|h[1-6]|ul|ol|blockquote|pre|div))/g, '$1$3')
    
    // 处理blockquote内部的间距
    .replace(/(<blockquote>)\s*(<p)/g, '$1$2')
    .replace(/(<\/p>)\s*(<\/blockquote>)/g, '$1$2')
    
    // 处理连续的<br>标签，确保它们之间没有多余空白
    .replace(/(<br>)\s+(?=<br>)/g, '$1')
    
    // 确保行内元素之间没有多余空白
    .replace(/(<\/(em|strong|code)>)\s+(<(em|strong|code)>)/g, '$1$3')
    
    // 处理行内元素与<br>之间的空白
    .replace(/(<\/(em|strong|code)>)\s+(<br>)/g, '$1$3')
    .replace(/(<br>)\s+(<(em|strong|code)>)/g, '$1$3')
    
    // 处理列表项内部的间距
    .replace(/<li>\s+/g, '<li>')
    .replace(/\s+<\/li>/g, '</li>')
    
    // 处理列表项内的标题
    .replace(/(<li>)\s*(<h[1-6])/g, '$1$2')
    .replace(/(<\/h[1-6]>)\s*(<\/li>)/g, '$1$2')
    .replace(/(<\/h[1-6]>)\s*([\s\S]*?)(<\/li>)/g, '$1$2$3')
    
    // 处理列表项内的<br>标签与其他元素的关系
    .replace(/(<li>)([^<]*?)(<br>)/g, '$1$2$3')
    
    // 确保引用块内容紧凑
    .replace(/(<blockquote>)\s*/g, '$1')
    .replace(/\s*(<\/blockquote>)/g, '$1');
};

// 渲染Markdown内容
const renderMarkdown = () => {
  if (!props.content) {
    if (markdownContainer.value) {
      markdownContainer.value.innerHTML = '';
    }
    // 重置状态，为下一次对话做准备
    hasDetectedClosingTag.value = false;
    return;
  }
  
  try {
    // 预处理内容
    let processedContent = removeExtraEmptyLines(props.content);
    
    // 预处理<think>标签
    processedContent = preprocessThinkTags(processedContent);
    
    // 使用markdown-it将Markdown转为HTML
    const rawHtml = md.render(processedContent);
    
    // 后处理HTML，移除空段落和压缩间距
    const processedHtml = postProcessHTML(rawHtml);
    
    // 配置DOMPurify允许details和summary标签
    const purifyConfig = {
      ADD_TAGS: ['details', 'summary', 'div'],
      ADD_ATTR: ['open', 'class', 'id']
    };
    
    // 使用DOMPurify清理HTML
    const cleanHtml = DOMPurify.sanitize(processedHtml, purifyConfig);
    
    if (markdownContainer.value) {
      markdownContainer.value.innerHTML = cleanHtml;
    }

    // 处理思考区块的折叠
    handleThinkBlocksFolding();
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