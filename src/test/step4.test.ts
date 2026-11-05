import {
  processFrameWithDithering,
  DecodedImageFrame,
  DitherOptions,
} from '../utils/ditherUtils';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('断言失败: ' + msg);
}

console.log('--- 开始 Step 4 图像像素化与 Floyd-Steinberg 抖动算法验证 ---');

// 构造一个 4x4 RGBA 测试图像（渐变红到黑）
const srcW = 4;
const srcH = 4;
const testRgba = new Uint8ClampedArray(srcW * srcH * 4);

for (let y = 0; y < srcH; y++) {
  for (let x = 0; x < srcW; x++) {
    const idx = (y * srcW + x) * 4;
    const val = Math.round((x / (srcW - 1)) * 255); // 灰度渐变 0 到 255
    testRgba[idx] = val;     // R
    testRgba[idx + 1] = val; // G
    testRgba[idx + 2] = val; // B
    testRgba[idx + 3] = 255; // A 不透明
  }
}

const mockDecoded: DecodedImageFrame = {
  width: srcW,
  height: srcH,
  delayMs: 100,
  rgbaData: testRgba,
};

// 1. 验证目标分辨率采样（缩放到 8x8）
console.log('1. 验证目标尺寸缩放...');
const optionsNearest: DitherOptions = {
  targetWidth: 8,
  targetHeight: 8,
  scaleAlgorithm: 'nearest',
  quantizeMode: 'rgb888',
  ditherStrength: 0,
  brightness: 0,
  contrast: 0,
};

const outputPixels8x8 = processFrameWithDithering(mockDecoded, optionsNearest);
assert(outputPixels8x8.length === 64, `输出像素数量应为 64，实际: ${outputPixels8x8.length}`);
assert(outputPixels8x8[0] === '#000000', '左侧应为全黑');
assert(outputPixels8x8[7] === '#FFFFFF', '右侧应为纯白');
console.log('✓ 尺寸缩放测试通过!');

// 2. 验证黑白二值化单色量化
console.log('2. 验证黑白单色 (monochrome) 模式...');
const optionsMono: DitherOptions = {
  targetWidth: 4,
  targetHeight: 4,
  scaleAlgorithm: 'nearest',
  quantizeMode: 'monochrome',
  ditherStrength: 0,
  brightness: 0,
  contrast: 0,
};
const outputMono = processFrameWithDithering(mockDecoded, optionsMono);
for (const hex of outputMono) {
  assert(hex === '#000000' || hex === '#FFFFFF', '黑白模式只应包含纯黑或纯白');
}
console.log('✓ 黑白单色量化测试通过!');

// 3. 验证 Floyd-Steinberg 误差扩散抖动开启
console.log('3. 验证 Floyd-Steinberg 误差扩散...');
const optionsDither: DitherOptions = {
  targetWidth: 16,
  targetHeight: 16,
  scaleAlgorithm: 'bilinear',
  quantizeMode: 'monochrome',
  ditherStrength: 1.0, // 100% 误差扩散
  brightness: 0,
  contrast: 0,
};
const outputDither = processFrameWithDithering(mockDecoded, optionsDither);
assert(outputDither.length === 256, '输出像素长度应为 256');
const blackCount = outputDither.filter((c) => c === '#000000').length;
const whiteCount = outputDither.filter((c) => c === '#FFFFFF').length;
assert(blackCount > 0 && whiteCount > 0, '抖动后应包含黑白交替过渡点');
console.log(`✓ Floyd-Steinberg 抖动正常扩散 (黑: ${blackCount}, 白: ${whiteCount})!`);

console.log('=== Step 4 所有算法验证全部通过! ===');
