/**
 * 默认模板统一导入
 * 
 * 🎯 极简设计：模板自身包含完整信息，无需额外配置
 */

// 导入所有模板
import { template as general_optimize } from './optimize/general-optimize';
import { template as general_optimize_en } from './optimize/general-optimize_en';
import { template as output_format_optimize } from './optimize/output-format-optimize';
import { template as output_format_optimize_en } from './optimize/output-format-optimize_en';
import { advanced_optimize } from './optimize/advanced-optimize';
import { advanced_optimize_en } from './optimize/advanced-optimize_en';
import { structured_format } from './optimize/structured-format';
import { structured_format_en } from './optimize/structured-format_en';

import { template as iterate } from './iterate/iterate';
import { template as iterate_en } from './iterate/iterate_en';

import { template as user_prompt_optimize } from './user-optimize/user-prompt-optimize';
import { template as user_prompt_optimize_en } from './user-optimize/user-prompt-optimize_en';
import { user_prompt_clarity } from './user-optimize/user-prompt-clarity';
import { user_prompt_clarity_en } from './user-optimize/user-prompt-clarity_en';
import { user_prompt_specific } from './user-optimize/user-prompt-specific';
import { user_prompt_specific_en } from './user-optimize/user-prompt-specific_en';
import { user_prompt_structured } from './user-optimize/user-prompt-structured';
import { user_prompt_structured_en } from './user-optimize/user-prompt-structured_en';

// 简单的模板集合 - 模板自身已包含完整信息（id、name、language、type等）
export const ALL_TEMPLATES = {
  general_optimize,
  general_optimize_en,
  output_format_optimize,
  output_format_optimize_en,
  advanced_optimize,
  advanced_optimize_en,
  structured_format,
  structured_format_en,
  iterate,
  iterate_en,
  user_prompt_optimize,
  user_prompt_optimize_en,
  user_prompt_clarity,
  user_prompt_clarity_en,
  user_prompt_specific,
  user_prompt_specific_en,
  user_prompt_structured,
  user_prompt_structured_en,
};
