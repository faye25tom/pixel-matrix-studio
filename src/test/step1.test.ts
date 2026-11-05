import {
  hexToRgb,
  rgbToHex,
  hexToRgb565Hex,
  quantizeHexToRgb565Preview,
  hsvToHex,
} from '../utils/colorUtils';
import { useMatrixStore } from '../store/useMatrixStore';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    throw new Error('断言失败: ' + msg);
  }
}

console.log('--- 开始 Step 1 验证测试 ---');

// 1. 测试 colorUtils
console.log('1. 验证 colorUtils...');
const rgb = hexToRgb('#FF0055');
assert(rgb.r === 255 && rgb.g === 0 && rgb.b === 85, 'hexToRgb 分量转换错误');

const hex = rgbToHex(255, 0, 85);
assert(hex === '#FF0055', 'rgbToHex 转换错误');

// 纯红 #FF0000 -> 0xF800 (R5=31, G6=0, B5=0 -> 31<<11 = 63488 = 0xF800)
const red565 = hexToRgb565Hex('#FF0000');
assert(red565.hex16 === '0xF800' && red565.uint16 === 63488, `hexToRgb565Hex 红光转换错误: ${red565.hex16}`);

// 纯绿 #00FF00 -> 0x07E0
const green565 = hexToRgb565Hex('#00FF00');
assert(green565.hex16 === '0x07E0', `hexToRgb565Hex 绿光转换错误: ${green565.hex16}`);

// 纯蓝 #0000FF -> 0x001F
const blue565 = hexToRgb565Hex('#0000FF');
assert(blue565.hex16 === '0x001F', `hexToRgb565Hex 蓝光转换错误: ${blue565.hex16}`);

// RGB565 预览降阶
const preview = quantizeHexToRgb565Preview('#FF0055');
assert(typeof preview === 'string' && preview.startsWith('#'), 'quantizeHexToRgb565Preview 格式错误');

// HSV 测试: 纯红 h=0, s=1, v=1 -> #FF0000
const redFromHsv = hsvToHex(0, 1, 1);
assert(redFromHsv === '#FF0000', `hsvToHex 纯红测试错误: ${redFromHsv}`);

console.log('✓ colorUtils 测试通过!');

// 2. 测试 useMatrixStore
console.log('2. 验证 useMatrixStore 全局状态...');
const store = useMatrixStore.getState();
assert(store.width === 16 && store.height === 16, '初始尺寸必须为 16x16');
assert(store.frames.length === 1, '初始应该有 1 帧');
assert(store.frames[0].pixels.length === 256, '16x16 应为 256 像素');

// 像素修改测试
store.setPixel(0, 0, '#00FF66');
let state = useMatrixStore.getState();
assert(state.frames[0].pixels[0] === '#00FF66', '单点像素修改错误');

// 尺寸更改与钳制测试
store.setDimensions(32, 20);
state = useMatrixStore.getState();
assert(state.width === 32 && state.height === 20, '修改尺寸错误');
assert(state.frames[0].pixels.length === 640, '32x20 应为 640 像素');
assert(state.frames[0].pixels[0] === '#00FF66', '左上角像素保留错误');

// 超范围钳制测试
store.setDimensions(100, -5);
state = useMatrixStore.getState();
assert(state.width === 64 && state.height === 1, '超出范围应限制在 1~64');

// 恢复为 16x16 进行帧操作测试
store.setDimensions(16, 16);
store.addFrame();
state = useMatrixStore.getState();
assert(state.frames.length === 2 && state.currentFrameIndex === 1, '新增帧测试错误');

// Undo / Redo 测试
assert(store.canUndo(), '应当可撤销');
store.undo();
state = useMatrixStore.getState();
assert(state.frames.length === 1, 'Undo 撤销新增帧错误');

store.redo();
state = useMatrixStore.getState();
assert(state.frames.length === 2, 'Redo 重做新增帧错误');

console.log('✓ useMatrixStore 基础操作与 Undo/Redo 测试通过!');
console.log('=== Step 1 所有验证项已全部通过! ===');
