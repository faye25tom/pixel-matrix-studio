import {
  generateScrollEffect,
  generateBreathingEffect,
  generateBlinkEffect,
  generateRainbowWaveEffect,
  generateLaserWipeEffect,
} from '../utils/effectGenerators';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('断言失败: ' + msg);
}

console.log('--- 开始 Step 3 动效生成器算法验证 ---');

const width = 16;
const height = 16;
const totalPixels = width * height;

// 构造一个测试帧（中心带有 2x2 白色像素）
const testPixels = new Array(totalPixels).fill('#000000');
testPixels[7 * 16 + 7] = '#FFFFFF';
testPixels[7 * 16 + 8] = '#FFFFFF';
testPixels[8 * 16 + 7] = '#FFFFFF';
testPixels[8 * 16 + 8] = '#FFFFFF';

// 1. 跑马灯动效验证
console.log('1. 验证 Scroll 跑马灯生成器...');
const scrollFrames = generateScrollEffect(testPixels, width, height, 'left', 10);
assert(scrollFrames.length === width, `Scroll 帧数应等于宽 ${width}，实际: ${scrollFrames.length}`);
assert(scrollFrames[0].pixels.length === totalPixels, '像素数量必须严格等于 width*height');
// 第一帧原样，最后一帧向左移动 width-1 步
assert(scrollFrames[0].pixels[7 * 16 + 7] === '#FFFFFF', '第 0 帧位置不符');
console.log('✓ Scroll 跑马灯验证通过!');

// 2. 呼吸灯动效验证
console.log('2. 验证 Breathing 呼吸灯生成器...');
const breathFrames = generateBreathingEffect(testPixels, width, height, 12, 0.2, 10);
assert(breathFrames.length === 12, `呼吸灯帧数不匹配: ${breathFrames.length}`);
// 黑色背景始终保持全黑
assert(breathFrames[0].pixels[0] === '#000000', '背景黑点不应被提亮');
console.log('✓ Breathing 呼吸灯验证通过!');

// 3. 频闪动效验证
console.log('3. 验证 Blink 闪烁生成器...');
const blinkFrames = generateBlinkEffect(testPixels, width, height, 8, false, 8);
assert(blinkFrames.length === 8, '闪烁帧数错误');
assert(blinkFrames[0].pixels[7 * 16 + 7] === '#FFFFFF', '偶数帧应保持点亮');
assert(blinkFrames[1].pixels[7 * 16 + 7] === '#000000', '奇数帧应熄灭');
console.log('✓ Blink 闪烁验证通过!');

// 4. 彩虹流光动效验证
console.log('4. 验证 Rainbow 彩虹流光生成器...');
const rainbowFrames = generateRainbowWaveEffect(testPixels, width, height, 16, 'diagonal', 10);
assert(rainbowFrames.length === 16, '彩虹流光帧数错误');
// 原白色像素应被赋以不同色相
assert(rainbowFrames[0].pixels[7 * 16 + 7] !== '#FFFFFF', '白点应被赋予彩色');
assert(rainbowFrames[0].pixels[0] === '#000000', '背景全黑依然保持全黑');
console.log('✓ Rainbow 彩虹流光验证通过!');

// 5. 激光扫描展开验证
console.log('5. 验证 Laser Wipe 激光扫描生成器...');
const laserFrames = generateLaserWipeEffect(testPixels, width, height, 10, 'left-to-right', 10);
assert(laserFrames.length === 10, '激光扫描帧数错误');
console.log('✓ Laser Wipe 激光扫描验证通过!');

console.log('=== Step 3 动效生成器所有算法测试全部通过! ===');
