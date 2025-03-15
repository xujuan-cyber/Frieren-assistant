<template>
    <div class="markdown-content" v-html="renderedMarkdown"></div>
  </template>
  
  <script setup>
  import { ref, watch, onMounted } from 'vue';
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
  
  // 渲染Markdown内容
  const renderMarkdown = () => {
    if (!props.content) {
      renderedMarkdown.value = '';
      return;
    }
    
    try {
      // 使用marked将Markdown转为HTML
      const rawHtml = marked.parse(props.content);
      // 使用DOMPurify清理HTML，防止XSS攻击
      renderedMarkdown.value = DOMPurify.sanitize(rawHtml);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      renderedMarkdown.value = `<p class="text-red-500">Error rendering markdown: ${error.message}</p>`;
    }
  };
  
  // 监听content变化时重新渲染
  watch(() => props.content, renderMarkdown, { immediate: true });
  
  // 组件挂载时渲染
  onMounted(() => {
    renderMarkdown();
  });
  </script>
  
  <style>
  /* Markdown样式 */
  .markdown-content {
    color: var(--theme-text-color, #333);
    line-height: 1.6;
    word-wrap: break-word;
  }
  
  .markdown-content h1 {
    font-size: 2em;
    margin-top: 1.5em;
    margin-bottom: 0.8em;
    font-weight: 600;
  }
  
  .markdown-content h2 {
    font-size: 1.5em;
    margin-top: 1.3em;
    margin-bottom: 0.7em;
    font-weight: 600;
    border-bottom: 1px solid #eee;
    padding-bottom: 0.3em;
  }
  
  .markdown-content h3 {
    font-size: 1.25em;
    margin-top: 1.2em;
    margin-bottom: 0.6em;
    font-weight: 600;
  }
  
  .markdown-content h4 {
    font-size: 1em;
    margin-top: 1.1em;
    margin-bottom: 0.5em;
    font-weight: 600;
  }
  
  .markdown-content p {
    margin-bottom: 1em;
    white-space: pre-wrap;
  }
  
  .markdown-content ul, 
  .markdown-content ol {
    padding-left: 2em;
    margin-bottom: 1em;
  }
  
  .markdown-content li {
    margin-bottom: 0.5em;
  }
  
  .markdown-content pre {
    background-color: #f6f8fa;
    border-radius: 6px;
    padding: 1em;
    overflow: auto;
    margin-bottom: 1em;
  }
  
  .markdown-content code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.9em;
    padding: 0.2em 0.4em;
    margin: 0;
    background-color: rgba(175, 184, 193, 0.2);
    border-radius: 3px;
  }
  
  .markdown-content pre code {
    padding: 0;
    background-color: transparent;
  }
  
  .markdown-content blockquote {
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
    margin-left: 0;
    margin-right: 0;
    margin-bottom: 1em;
  }
  
  .markdown-content table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1em;
    overflow: auto;
  }
  
  .markdown-content table th,
  .markdown-content table td {
    padding: 0.5em 1em;
    border: 1px solid #dfe2e5;
  }
  
  .markdown-content table th {
    font-weight: 600;
    background-color: #f6f8fa;
  }
  
  .markdown-content table tr:nth-child(2n) {
    background-color: #f6f8fa;
  }
  
  .markdown-content img {
    max-width: 100%;
    box-sizing: border-box;
    margin: 1em 0;
  }
  
  .markdown-content hr {
    height: 0.25em;
    padding: 0;
    margin: 1.5em 0;
    background-color: #e1e4e8;
    border: 0;
  }
  
  .markdown-content a {
    color: var(--theme-primary-color, #0366d6);
    text-decoration: none;
  }
  
  .markdown-content a:hover {
    text-decoration: underline;
  }
  </style>