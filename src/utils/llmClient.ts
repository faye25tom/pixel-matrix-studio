import { Frame, AiWorkshopConfig } from '../types/matrix';
import { normalizeHex } from './colorUtils';

export const DEFAULT_AI_CONFIG: AiWorkshopConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  modelName: 'gpt-4o-mini',
  temperature: 0.4,
};

/**
 * 将项目单帧反向编码为紧凑调色板矩阵 (palette + rows) 协议
 */
export function encodeFrameToMatrixProtocol(
  pixels: string[],
  width: number,
  height: number
): { palette: Record<string, string>; rows: string[] } {
  const palette: Record<string, string> = { '.': '#000000' };
  const colorToChar: Record<string, string> = { '#000000': '.' };

  // 可选字符集（大写字母、小写字母、数字与符号）
  const charCandidates = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$*+@';
  let charIndex = 0;

  for (const rawHex of pixels) {
    const hex = normalizeHex(rawHex);
    if (!colorToChar[hex]) {
      const char = charCandidates[charIndex % charCandidates.length] || `X${charIndex}`;
      charIndex++;
      colorToChar[hex] = char;
      palette[char] = hex;
    }
  }

  const rows: string[] = [];
  for (let y = 0; y < height; y++) {
    let rowStr = '';
    for (let x = 0; x < width; x++) {
      const hex = normalizeHex(pixels[y * width + x] || '#000000');
      rowStr += colorToChar[hex] || '.';
    }
    rows.push(rowStr);
  }

  return { palette, rows };
}

/**
 * 构造针对硬件点阵屏的高压制、强约束 System Prompt
 */
export function buildSystemPrompt(width: number, height: number): string {
  return `You are a master pixel art and LED matrix animator.
You MUST generate RGB LED matrix artwork strictly sized ${width} columns by ${height} rows.

COMMUNICATION PROTOCOL:
You MUST respond with a SINGLE valid JSON object and NOTHING ELSE. No introductory words, no reasoning, no markdown wrapper outside.
The JSON structure MUST follow this exact schema:
{
  "palette": {
    ".": "#000000",
    "R": "#FF0044",
    "Y": "#FFCC00",
    "W": "#FFFFFF"
  },
  "frames": [
    {
      "durationMs": 150,
      "rows": [
        "........",
        "..RRRR..",
        "........"
      ]
    }
  ]
}

STRICT SPECIFICATION RULES:
1. Canvas Dimension: Exactly ${width} columns wide (each string in "rows" MUST be exactly ${width} characters) and ${height} rows high ("rows" array MUST contain exactly ${height} strings).
2. Character '.' is strictly reserved for black background ("#000000").
3. Use single uppercase letters (e.g. A, B, C, R, G, B, Y, W) or numbers as keys in "palette". Each color value MUST be uppercase 6-digit hex format ("#RRGGBB").
4. For LED displays, prefer high saturation and high contrast vibrant colors.
5. All rows MUST be valid strings matching width=${width}. Total rows MUST be height=${height}.`;
}

/**
 * 鲁棒的 AI 点阵响应容错解析器 (parseAiMatrixResponse)
 * 1. 自动剥离 Markdown 标记
 * 2. 自动修正每一行多字/少字（右侧补 '.' 或截断）
 * 3. 自动修正行数不足/超长（底部补全黑行或截断）
 * 确保 100% 不错位、不崩溃
 */
export function parseAiMatrixResponse(
  rawText: string,
  width: number,
  height: number,
  defaultDurationMs = 125
): Frame[] {
  let cleaned = rawText.trim();

  // 1. 剥离 Markdown 代码块
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  // 2. 提取最外层 JSON 实体
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('大模型未能输出合法的 JSON 格式内容');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed || !parsed.palette || !Array.isArray(parsed.frames)) {
    throw new Error('返回的 JSON 结构缺少 palette 调色板或 frames 帧列表');
  }

  const palette: Record<string, string> = { '.': '#000000' };
  for (const [key, val] of Object.entries(parsed.palette)) {
    if (typeof val === 'string') {
      palette[key] = normalizeHex(val);
    }
  }

  const frames: Frame[] = [];

  for (let fIdx = 0; fIdx < parsed.frames.length; fIdx++) {
    const rawFrame = parsed.frames[fIdx];
    const rawRows: string[] = Array.isArray(rawFrame.rows) ? rawFrame.rows : [];
    const durationMs = typeof rawFrame.durationMs === 'number' && rawFrame.durationMs > 0
      ? rawFrame.durationMs
      : defaultDurationMs;

    // 行数容错：必须恰好为 height 行
    const sanitizedRows: string[] = [];
    for (let y = 0; y < height; y++) {
      let rowStr = rawRows[y];
      if (typeof rowStr !== 'string') {
        rowStr = '.'.repeat(width);
      }

      // 列数容错：不足 width 补 '.'，超过截断
      if (rowStr.length < width) {
        rowStr = rowStr.padEnd(width, '.');
      } else if (rowStr.length > width) {
        rowStr = rowStr.substring(0, width);
      }

      sanitizedRows.push(rowStr);
    }

    // 逐字符转换为像素矩阵
    const pixels: string[] = [];
    for (let y = 0; y < height; y++) {
      const rowStr = sanitizedRows[y];
      for (let x = 0; x < width; x++) {
        const char = rowStr[x] || '.';
        const color = palette[char] || '#000000';
        pixels.push(color);
      }
    }

    frames.push({
      id: `ai_${Date.now()}_${fIdx}`,
      durationMs,
      pixels,
    });
  }

  if (frames.length === 0) {
    throw new Error('未成功解析出任何有效帧');
  }

  return frames;
}

/**
 * 发起统一的 OpenAI 兼容 Chat Completions 请求
 */
async function callOpenAiCompatibleApi(
  config: AiWorkshopConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): Promise<string> {
  const { baseUrl, apiKey, modelName, temperature } = config;
  if (!baseUrl) throw new Error('请先配置 API Base URL');

  const cleanBase = baseUrl.trim().replace(/\/+$/, '');
  const url = cleanBase.endsWith('/chat/completions')
    ? cleanBase
    : `${cleanBase}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelName || 'gpt-4o-mini',
      messages,
      temperature: temperature ?? 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let msg = `API 请求失败 (${response.status} ${response.statusText})`;
    try {
      const errJson = JSON.parse(errorText);
      if (errJson.error?.message) {
        msg = errJson.error.message;
      }
    } catch {
      if (errorText) msg += `: ${errorText.substring(0, 120)}`;
    }
    throw new Error(msg);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('API 返回的数据中未包含文本内容');
  }

  return content;
}

/**
 * a) 文生单帧点阵
 */
export async function generateSingleFrameFromPrompt(
  prompt: string,
  width: number,
  height: number,
  config: AiWorkshopConfig
): Promise<Frame[]> {
  const systemPrompt = buildSystemPrompt(width, height);
  const userPrompt = `Generate a single pixel art frame for an LED matrix (${width}x${height}).
Subject/Concept: "${prompt.trim()}".
Only output the required JSON.`;

  const rawText = await callOpenAiCompatibleApi(config, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  return parseAiMatrixResponse(rawText, width, height);
}

/**
 * b) 文生多帧连贯点阵动画
 */
export async function generateAnimationFromPrompt(
  prompt: string,
  frameCount: number,
  width: number,
  height: number,
  config: AiWorkshopConfig
): Promise<Frame[]> {
  const safeCount = Math.max(2, Math.min(8, frameCount));
  const systemPrompt = buildSystemPrompt(width, height);
  const userPrompt = `Generate a seamless looping ${safeCount}-frame animation for an LED matrix (${width}x${height}).
Action/Concept: "${prompt.trim()}".
Generate exactly ${safeCount} frames in the "frames" array. Ensure the animation cycles naturally.
Only output the required JSON.`;

  const rawText = await callOpenAiCompatibleApi(config, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  return parseAiMatrixResponse(rawText, width, height);
}

/**
 * c) 基于当前画面 AI 修改/重绘
 */
export async function modifyCurrentFrameWithPrompt(
  currentPixels: string[],
  instruction: string,
  width: number,
  height: number,
  config: AiWorkshopConfig
): Promise<Frame[]> {
  const systemPrompt = buildSystemPrompt(width, height);
  const encoded = encodeFrameToMatrixProtocol(currentPixels, width, height);

  const userPrompt = `Here is the current LED matrix frame (${width}x${height}):
${JSON.stringify(encoded, null, 2)}

Modification instruction: "${instruction.trim()}".
Revise or enhance the artwork according to this instruction while preserving the core composition where appropriate.
Only output the required JSON.`;

  const rawText = await callOpenAiCompatibleApi(config, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  return parseAiMatrixResponse(rawText, width, height);
}
