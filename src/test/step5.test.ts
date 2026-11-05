import {
  encodeFrameToMatrixProtocol,
  parseAiMatrixResponse,
  buildSystemPrompt,
} from '../utils/llmClient';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('断言失败: ' + msg);
}

console.log('--- 开始 Step 5 调色板字符矩阵协议与容错解析器验证 ---');

const width = 8;
const height = 8;

// 1. 验证反向编码当前帧为字符矩阵
console.log('1. 验证 encodeFrameToMatrixProtocol...');
const pixels = new Array(width * height).fill('#000000');
pixels[0] = '#FF0055';
pixels[1] = '#00FF66';
pixels[8] = '#FF0055';

const encoded = encodeFrameToMatrixProtocol(pixels, width, height);
assert(encoded.palette['.'] === '#000000', '调色板点符号必须固定映射为纯黑');
assert(encoded.rows.length === 8, '行数必须等于 8');
assert(encoded.rows[0].length === 8, '第一行字符数必须等于 8');
assert(encoded.rows[0][0] !== '.', '第一格非黑字符不应为点');
assert(encoded.rows[0][2] === '.', '第三格全黑应为点');
console.log('✓ 逆向编码验证通过!');

// 2. 验证 System Prompt 动态注入
console.log('2. 验证 buildSystemPrompt...');
const prompt = buildSystemPrompt(16, 32);
assert(prompt.includes('16 columns wide') && prompt.includes('32 rows high'), 'System Prompt 尺寸注入错误');
console.log('✓ System Prompt 尺寸注入验证通过!');

// 3. 验证 parseAiMatrixResponse 的强鲁棒容错
console.log('3. 验证容错解析器 (含 Markdown 标签、行长溢出、行长缺失、行数缺失)...');

// 构造一个故意写坏的 AI 回复：
// - 带 ```json 包裹
// - row 0 只有 4 个字符 (少于 8)
// - row 1 有 12 个字符 (超过 8)
// - 只有 2 行 (少于 8 行)
const imperfectAiJson = `
\`\`\`json
{
  "palette": {
    ".": "#000000",
    "R": "#FF0000",
    "G": "#00FF00"
  },
  "frames": [
    {
      "durationMs": 150,
      "rows": [
        "RRGG",
        "RRRRGGGG123456"
      ]
    }
  ]
}
\`\`\`
`;

const parsedFrames = parseAiMatrixResponse(imperfectAiJson, 8, 8, 120);
assert(parsedFrames.length === 1, '应解析出 1 帧');
assert(parsedFrames[0].pixels.length === 64, `像素数量必须严格为 64，实际: ${parsedFrames[0].pixels.length}`);
assert(parsedFrames[0].durationMs === 150, 'durationMs 应为 150');

// 验证 row 0 不足 8 位的自动用 '.' 补全为纯黑
assert(parsedFrames[0].pixels[0] === '#FF0000', '第 0 像素为红');
assert(parsedFrames[0].pixels[1] === '#FF0000', '第 1 像素为红');
assert(parsedFrames[0].pixels[2] === '#00FF00', '第 2 像素为绿');
assert(parsedFrames[0].pixels[3] === '#00FF00', '第 3 像素为绿');
assert(parsedFrames[0].pixels[4] === '#000000', '不足位自动补黑');
assert(parsedFrames[0].pixels[7] === '#000000', '不足位自动补黑');

// 验证 row 1 超过 8 位截断前 8 位
assert(parsedFrames[0].pixels[8] === '#FF0000', '第 1 行前部应为红');

// 验证底部缺失的 6 行自动补全全黑
for (let i = 16; i < 64; i++) {
  assert(parsedFrames[0].pixels[i] === '#000000', `第 ${i} 像素必须为自动补足的纯黑`);
}

console.log('✓ AI 紧凑字符矩阵容错引擎验证完全通过!');
console.log('=== Step 5 所有功能与算法验证全部通过! ===');
