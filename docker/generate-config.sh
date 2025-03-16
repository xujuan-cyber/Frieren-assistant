#!/bin/sh

# 配置文件路径
CONFIG_FILE="/usr/share/nginx/html/config.js"

# 生成配置文件
cat > $CONFIG_FILE << EOF
window.runtime_config = {
  OPENAI_API_KEY: "${VITE_OPENAI_API_KEY:-}",
  GEMINI_API_KEY: "${VITE_GEMINI_API_KEY:-}",
  DEEPSEEK_API_KEY: "${VITE_DEEPSEEK_API_KEY:-}",
  SILICONFLOW_API_KEY: "${VITE_SILICONFLOW_API_KEY:-}",
  CUSTOM_API_KEY: "${VITE_CUSTOM_API_KEY:-}",
  CUSTOM_API_BASE_URL: "${VITE_CUSTOM_API_BASE_URL:-}",
  CUSTOM_API_MODEL: "${VITE_CUSTOM_API_MODEL:-}"
};
console.log("运行时配置已加载");
EOF

echo "配置文件已生成: $CONFIG_FILE" 