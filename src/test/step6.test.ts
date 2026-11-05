import {
  buildVendorExportPayload,
  reorderPixelsByScanOrder,
} from '../utils/exportUtils';
import { Frame } from '../types/matrix';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('断言失败: ' + msg);
}

console.log('--- 开始 Step 6 导出模块与方案商规范验证 ---');

const width = 4;
const height = 4;
const testPixels = [
  '#FF0000', '#FF0000', '#FF0000', '#FF0000', // 第 0 行 (偶数)
  '#00FF00', '#00FF00', '#0000FF', '#0000FF', // 第 1 行 (奇数)
  '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', // 第 2 行 (偶数)
  '#000000', '#000000', '#000000', '#000000', // 第 3 行 (奇数)
];

const mockFrames: Frame[] = [
  {
    id: 'f1',
    durationMs: 125,
    pixels: testPixels,
  },
];

// 1. 验证走线顺序转换
console.log('1. 验证 S型蛇形走线 (Serpentine)...');
const serpentine = reorderPixelsByScanOrder(testPixels, width, height, 'serpentine');
assert(serpentine.length === 16, '长度应为 16');
// 第 0 行正常: #FF0000, #FF0000, #FF0000, #FF0000
assert(serpentine[0] === '#FF0000', '第 0 行应保持从左到右');
// 第 1 行反转: 原为 [G, G, B, B] -> 反转后首个应为 B (#0000FF)
assert(serpentine[4] === '#0000FF', '第 1 行反转后首个元素应为末尾的蓝色');
assert(serpentine[7] === '#00FF00', '第 1 行反转后末尾元素应为首个绿色');
console.log('✓ S型蛇形走线重排验证通过!');

// 2. 验证 RGB888 方案商 JSON 数据
console.log('2. 验证 RGB888 VendorExportPayload...');
const payloadRgb888 = buildVendorExportPayload(
  'test_device',
  width,
  height,
  'RGB888',
  8,
  mockFrames,
  'row-major'
);

assert(payloadRgb888.schemaVersion === '1.0', 'schemaVersion 必须为 1.0');
assert(payloadRgb888.metadata.projectName === 'test_device', 'projectName 匹配');
assert(payloadRgb888.metadata.colorFormat === 'RGB888', 'colorFormat 必须为 RGB888');
assert(payloadRgb888.frames.length === 1, '帧数应为 1');
assert(payloadRgb888.frames[0].data[0] === '#FF0000', '首像素数据应为大写 #FF0000');
assert(payloadRgb888.frames[0].rawUint16OrUint24?.[0] === 0xFF0000, '24位整型数值计算正确');
console.log('✓ RGB888 方案商格式验证通过!');

// 3. 验证 RGB565 方案商 JSON 数据
console.log('3. 验证 RGB565 VendorExportPayload (0xXXXX 与 uint16)...');
const payloadRgb565 = buildVendorExportPayload(
  'test_device_565',
  width,
  height,
  'RGB565',
  8,
  mockFrames,
  'row-major'
);

assert(payloadRgb565.metadata.colorFormat === 'RGB565', 'colorFormat 必须为 RGB565');
assert(payloadRgb565.frames[0].data[0] === '0xF800', `纯红 565 字符串应为 0xF800，实际: ${payloadRgb565.frames[0].data[0]}`);
assert(payloadRgb565.frames[0].rawUint16OrUint24?.[0] === 63488, '16位无符号整型应为 63488');
console.log('✓ RGB565 方案商格式验证通过!');

console.log('=== Step 6 所有导出规范验证全部通过! ===');
