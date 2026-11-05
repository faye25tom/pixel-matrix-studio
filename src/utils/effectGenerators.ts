import { Frame, ScrollDirection, RainbowDirection, LaserWipeMode } from '../types/matrix';
import { hexToRgb, rgbToHex, hsvToHex } from './colorUtils';

function createFrameObject(pixels: string[], durationMs: number): Frame {
  return {
    id: 'frame_' + Math.random().toString(36).substring(2, 9),
    durationMs,
    pixels,
  };
}

/**
 * 1. 跑马灯平移动效 (Scroll)
 * 支持上/下/左/右四向无缝循环跑马灯平移
 */
export function generateScrollEffect(
  basePixels: string[],
  width: number,
  height: number,
  direction: ScrollDirection,
  fps = 10
): Frame[] {
  const durationMs = Math.round(1000 / fps);
  const isHorizontal = direction === 'left' || direction === 'right';
  const totalSteps = isHorizontal ? width : height;
  const frames: Frame[] = [];

  for (let t = 0; t < totalSteps; t++) {
    const newPixels = new Array(width * height).fill('#000000');

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let srcX = x;
        let srcY = y;

        if (direction === 'left') {
          srcX = (x + t) % width;
        } else if (direction === 'right') {
          srcX = (x - t + width * 100) % width;
        } else if (direction === 'up') {
          srcY = (y + t) % height;
        } else if (direction === 'down') {
          srcY = (y - t + height * 100) % height;
        }

        const srcIdx = srcY * width + srcX;
        const targetIdx = y * width + x;
        newPixels[targetIdx] = basePixels[srcIdx] || '#000000';
      }
    }

    frames.push(createFrameObject(newPixels, durationMs));
  }

  return frames;
}

/**
 * 2. 呼吸灯动效 (Breathing)
 * 采用正弦曲线平滑调节亮度
 */
export function generateBreathingEffect(
  basePixels: string[],
  _width: number,
  _height: number,
  frameCount = 16,
  minBrightness = 0.2,
  fps = 12
): Frame[] {
  const durationMs = Math.round(1000 / fps);
  const frames: Frame[] = [];
  const safeCount = Math.max(4, Math.min(32, frameCount));
  const safeMin = Math.max(0.05, Math.min(0.6, minBrightness));

  for (let t = 0; t < safeCount; t++) {
    // 正弦曲线：从峰值到低谷再回峰值
    const phase = (2 * Math.PI * t) / safeCount;
    const factor = (1 + Math.cos(phase)) / 2; // 0 ~ 1
    const brightness = safeMin + (1 - safeMin) * factor;

    const newPixels = basePixels.map((hex) => {
      const rgb = hexToRgb(hex);
      if (rgb.r + rgb.g + rgb.b < 12) return '#000000';

      const scaledR = Math.round(rgb.r * brightness);
      const scaledG = Math.round(rgb.g * brightness);
      const scaledB = Math.round(rgb.b * brightness);
      return rgbToHex(scaledR, scaledG, scaledB);
    });

    frames.push(createFrameObject(newPixels, durationMs));
  }

  return frames;
}

/**
 * 3. 闪烁频闪动效 (Blink)
 * 偶数周期保持原画面，奇数周期置为全黑或取反色
 */
export function generateBlinkEffect(
  basePixels: string[],
  width: number,
  height: number,
  frameCount = 8,
  invertMode = false,
  fps = 6
): Frame[] {
  const durationMs = Math.round(1000 / fps);
  const frames: Frame[] = [];
  const safeCount = Math.max(4, Math.min(24, frameCount));

  for (let t = 0; t < safeCount; t++) {
    const isLit = t % 2 === 0;

    let newPixels: string[];
    if (isLit) {
      newPixels = [...basePixels];
    } else {
      if (invertMode) {
        newPixels = basePixels.map((hex) => {
          const rgb = hexToRgb(hex);
          if (rgb.r + rgb.g + rgb.b < 12) return '#000000';
          return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
        });
      } else {
        newPixels = new Array(width * height).fill('#000000');
      }
    }

    frames.push(createFrameObject(newPixels, durationMs));
  }

  return frames;
}

/**
 * 4. 彩虹渐变流光动效 (Rainbow)
 * 对画面中所有非纯黑像素，叠加 HSV 色相流动
 */
export function generateRainbowWaveEffect(
  basePixels: string[],
  width: number,
  height: number,
  frameCount = 16,
  direction: RainbowDirection = 'diagonal',
  fps = 12
): Frame[] {
  const durationMs = Math.round(1000 / fps);
  const frames: Frame[] = [];
  const safeCount = Math.max(6, Math.min(32, frameCount));

  for (let t = 0; t < safeCount; t++) {
    const newPixels = new Array(width * height).fill('#000000');

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const hex = basePixels[idx] || '#000000';
        const rgb = hexToRgb(hex);

        // 仅对非纯黑像素赋彩虹流动光
        if (rgb.r + rgb.g + rgb.b >= 12) {
          const coord = direction === 'horizontal' ? x : x + y;
          const maxCoord = direction === 'horizontal' ? width : width + height;
          const hue = ((coord / maxCoord) * 360 + (t * 360) / safeCount) % 360;
          newPixels[idx] = hsvToHex(hue, 1, 1);
        }
      }
    }

    frames.push(createFrameObject(newPixels, durationMs));
  }

  return frames;
}

/**
 * 5. 激光扫描展开动效 (Wipe)
 * 包含从左到右与中心向外两种模式，扫描线边缘带高亮白激光
 */
export function generateLaserWipeEffect(
  basePixels: string[],
  width: number,
  height: number,
  frameCount = 16,
  mode: LaserWipeMode = 'left-to-right',
  fps = 12
): Frame[] {
  const durationMs = Math.round(1000 / fps);
  const frames: Frame[] = [];
  const safeCount = Math.max(6, Math.min(32, frameCount));

  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.hypot(centerX, centerY);

  for (let t = 0; t < safeCount; t++) {
    const progress = (t + 1) / safeCount; // 0 ~ 1
    const newPixels = new Array(width * height).fill('#000000');

    if (mode === 'left-to-right') {
      const scanX = Math.round(progress * width);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const orig = basePixels[idx] || '#000000';

          if (x < scanX - 1) {
            newPixels[idx] = orig;
          } else if (x === scanX - 1 || x === scanX) {
            // 扫描激光边缘高亮纯白
            newPixels[idx] = '#FFFFFF';
          } else {
            newPixels[idx] = '#000000';
          }
        }
      }
    } else {
      // center-out 中心向外
      const currentRadius = progress * maxRadius;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const orig = basePixels[idx] || '#000000';
          const dist = Math.hypot(x - centerX + 0.5, y - centerY + 0.5);

          if (dist < currentRadius - 1.2) {
            newPixels[idx] = orig;
          } else if (Math.abs(dist - currentRadius) <= 1.2) {
            newPixels[idx] = '#FFFFFF';
          } else {
            newPixels[idx] = '#000000';
          }
        }
      }
    }

    frames.push(createFrameObject(newPixels, durationMs));
  }

  return frames;
}

/**
 * 6. 文字转点阵并可选自动滚动 (Text Matrix)
 * 采用离屏 Canvas 渲染并阈值二值化消除抗锯齿边缘
 */
export function generateTextMatrixFrames(
  text: string,
  fontSize: number,
  textColor: string,
  bgColor: string,
  width: number,
  height: number,
  autoScroll = false,
  scrollDirection: ScrollDirection = 'left',
  fps = 10
): Frame[] {
  const durationMs = Math.round(1000 / fps);
  const cleanText = text.trim() || 'PIXEL';

  // 创建离屏 Canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const fontStr = `bold ${fontSize}px sans-serif`;
  ctx.font = fontStr;
  const metrics = ctx.measureText(cleanText);
  const textWidth = Math.max(1, Math.ceil(metrics.width));
  const textHeight = Math.max(height, Math.ceil(fontSize * 1.3));

  if (!autoScroll) {
    // 单帧文字居中渲染
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    ctx.font = fontStr;
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(cleanText, width / 2, height / 2);

    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = binarizeImageData(imgData, textColor, bgColor);

    return [createFrameObject(pixels, durationMs)];
  }

  // 开启跑马灯自动滚动
  if (scrollDirection === 'left' || scrollDirection === 'right') {
    // 横向滚动总宽 = 左留白(width) + 文本宽(textWidth) + 右留白(width)
    const stripWidth = width + textWidth + width;
    canvas.width = stripWidth;
    canvas.height = height;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, stripWidth, height);

    ctx.font = fontStr;
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(cleanText, width, height / 2);

    const fullImgData = ctx.getImageData(0, 0, stripWidth, height);
    const fullPixels = binarizeImageData(fullImgData, textColor, bgColor);

    const totalFrames = stripWidth - width;
    const frames: Frame[] = [];

    for (let f = 0; f < totalFrames; f += 1) {
      const offsetX = scrollDirection === 'left' ? f : totalFrames - 1 - f;
      const framePixels = new Array(width * height).fill(bgColor);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = y * stripWidth + (offsetX + x);
          const tgtIdx = y * width + x;
          framePixels[tgtIdx] = fullPixels[srcIdx] || bgColor;
        }
      }

      frames.push(createFrameObject(framePixels, durationMs));
    }

    return frames;
  } else {
    // 纵向滚动
    const stripHeight = height + textHeight + height;
    canvas.width = width;
    canvas.height = stripHeight;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, stripHeight);

    ctx.font = fontStr;
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(cleanText, width / 2, height + textHeight / 2);

    const fullImgData = ctx.getImageData(0, 0, width, stripHeight);
    const fullPixels = binarizeImageData(fullImgData, textColor, bgColor);

    const totalFrames = stripHeight - height;
    const frames: Frame[] = [];

    for (let f = 0; f < totalFrames; f += 1) {
      const offsetY = scrollDirection === 'up' ? f : totalFrames - 1 - f;
      const framePixels = new Array(width * height).fill(bgColor);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = (offsetY + y) * width + x;
          const tgtIdx = y * width + x;
          framePixels[tgtIdx] = fullPixels[srcIdx] || bgColor;
        }
      }

      frames.push(createFrameObject(framePixels, durationMs));
    }

    return frames;
  }
}

// 辅助：二值化 Canvas ImageData Alpha 通道，消除文字抗锯齿伪影
function binarizeImageData(imgData: ImageData, textColor: string, bgColor: string): string[] {
  const { data, width, height } = imgData;
  const pixels: string[] = [];

  for (let i = 0; i < width * height; i++) {
    const alpha = data[i * 4 + 3];
    // Alpha > 110 判定为文字前景像素
    if (alpha > 110) {
      pixels.push(textColor);
    } else {
      pixels.push(bgColor);
    }
  }

  return pixels;
}
