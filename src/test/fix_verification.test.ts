import * as gifencPkg from 'gifenc';
import { parseImportedJson } from '../utils/projectJsonUtils';
import { Frame } from '../types/matrix';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('断言失败: ' + msg);
}

console.log('--- 开始针对 GIF 导出与可编辑 JSON 导入的专项修复验证 ---');

// 1. 验证 gifenc 模块解析与动图编码
console.log('1. 验证 GIFEncoder 模块函数解析...');
const anyPkg = gifencPkg as any;
const GIFEncoder =
  anyPkg.GIFEncoder ||
  (typeof anyPkg.default === 'function' ? anyPkg.default : anyPkg.default?.GIFEncoder);
const quantize = anyPkg.quantize || anyPkg.default?.quantize;
const applyPalette = anyPkg.applyPalette || anyPkg.default?.applyPalette;

assert(typeof GIFEncoder === 'function', 'GIFEncoder 必须为可用函数');
assert(typeof quantize === 'function', 'quantize 必须为可用函数');
assert(typeof applyPalette === 'function', 'applyPalette 必须为可用函数');

// 模拟生成 GIF 帧测试
const enc = GIFEncoder();
const w = 8, h = 8;
const testRgba = new Uint8ClampedArray(w * h * 4);
testRgba.fill(128);
const palette = quantize(testRgba, 256);
const index = applyPalette(testRgba, palette);
enc.writeFrame(index, w, h, { palette, delay: 100 });
enc.finish();
const gifBytes = enc.bytes();
assert(gifBytes && gifBytes.length > 20, 'GIF 编码器必须能成功输出 GIF 二进制流');
console.log(`✓ gifenc 编码正常运行，输出 GIF 大小: ${gifBytes.length} 字节!`);

// 2. 验证可编辑工程文件 (ProjectSavePayload) 解析
console.log('2. 验证 ProjectSavePayload 解析与恢复...');
const mockProjectJson = JSON.stringify({
  app: 'PixelMatrix Studio',
  schemaVersion: '1.0',
  metadata: {
    projectName: 'my_robot_animation',
    savedAt: new Date().toISOString(),
    width: 16,
    height: 16,
    colorFormat: 'RGB888',
    fps: 12,
    totalFrames: 2,
    ledConfig: {
      shape: 'square',
      gapRatio: 0.2,
      glowIntensity: 0.8,
      simulatePitchBlack: true,
    },
  },
  frames: [
    {
      id: 'f1',
      durationMs: 83,
      pixels: new Array(256).fill('#FF0055'),
    },
    {
      id: 'f2',
      durationMs: 83,
      pixels: new Array(256).fill('#00FF66'),
    },
  ],
});

const restoredProject = parseImportedJson(mockProjectJson);
assert(restoredProject.projectName === 'my_robot_animation', '项目名称恢复失败');
assert(restoredProject.width === 16 && restoredProject.height === 16, '尺寸恢复失败');
assert(restoredProject.fps === 12, 'FPS 恢复失败');
assert(restoredProject.frames.length === 2, '帧数恢复失败');
assert(restoredProject.frames[0].pixels[0] === '#FF0055', '第 1 帧像素颜色恢复失败');
assert(restoredProject.frames[1].pixels[0] === '#00FF66', '第 2 帧像素颜色恢复失败');
assert(restoredProject.ledConfig?.shape === 'square', 'LED 参数恢复失败');
console.log('✓ 可编辑工程 JSON 成功解析并完整还原属性与像素!');

// 3. 验证硬件方案商标准 JSON (含 0xXXXX 16位色) 逆向解析为可编辑帧
console.log('3. 验证硬件方案商 JSON (RGB565 0xF800 红光) 解析与还原...');
const mockVendorJson = JSON.stringify({
  schemaVersion: '1.0',
  metadata: {
    projectName: 'vendor_delivery',
    exportedAt: new Date().toISOString(),
    width: 4,
    height: 4,
    colorFormat: 'RGB565',
    fps: 8,
    totalFrames: 1,
  },
  frames: [
    {
      frameIndex: 0,
      durationMs: 125,
      data: new Array(16).fill('0xF800'), // 16 个纯红像素
    },
  ],
});

const restoredVendor = parseImportedJson(mockVendorJson);
assert(restoredVendor.width === 4 && restoredVendor.height === 4, '方案商尺寸恢复失败');
assert(restoredVendor.frames.length === 1, '帧数恢复失败');
assert(restoredVendor.frames[0].pixels[0] === '#FF0000', `0xF800 应成功还原为纯红 #FF0000，实际: ${restoredVendor.frames[0].pixels[0]}`);
console.log('✓ 方案商标准 JSON 成功逆向还原为可编辑点阵画面!');

console.log('=== 专项修复验证全部通过! ===');
