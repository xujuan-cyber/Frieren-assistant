// LLM API配置
export const LLM_CONFIG = {
  gemini: {
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    getAuthHeader: (apiKey) => ({ 
      'Content-Type': 'application/json'
    }),
    getRequestData: (systemPrompt, userPrompt) => ({
      contents: [{
        parts: [
          { text: systemPrompt },
          { text: "\n\n用户提示词：" + userPrompt }
        ]
      }]
    }),
    parseResponse: (data) => data.candidates[0].content.parts[0].text,
    getEndpointWithAuth: (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`
  },
  deepseek: {
    apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: "deepseek-chat",
    getAuthHeader: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    getRequestData: (systemPrompt, userPrompt) => ({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    }),
    parseResponse: (data) => data.choices[0].message.content,
    getEndpointWithAuth: (apiKey) => 'https://api.deepseek.com/v1/chat/completions'
  }
};

// 解析优化结果
export function parseOptimizationResult(text) {
  return text.trim();
} 