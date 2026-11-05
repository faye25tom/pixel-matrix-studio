import { parseGIF, decompressFrames, ParsedFrame } from 'gifuct-js';
import { hexToRgb, rgbToHex, colorDistanceSq, RgbColor } from './colorUtils';
import { Frame } from '../types/matrix';

export type ScaleAlgorithm = 'nearest' | 'bilinear';
export type QuantizeMode = 'rgb888' | 'rgb565' | 'palette16' | 'monochrome';

export interface DitherOptions {
  targetWidth: number;
  targetHeight: number;
  scaleAlgorithm: ScaleAlgorithm;
  quantizeMode: QuantizeMode;
  ditherStrength: number; // 0 ~ 1.0
  brightness: number;     // -100 ~ 100
  contrast: number;       // -100 ~ 100
  transparentColor?: string; // 默认 '#000000'
}

export interface DecodedImageFrame {
  width: number;
  height: number;
  delayMs: number;
  rgbaData: Uint8ClampedArray;
}

// 预设 16 经典高对比调色板
export const PALETTE_16: RgbColor[] = [
  { r: 0, g: 0, b: 0 },         // 0: 黑
  { r: 255, g: 255, b: 255 },   // 1: 白
  { r: 136, g: 0, b: 0 },       // 2: 深红
  { r: 255, g: 0, b: 85 },      // 3: 亮红
  { r: 255, g: 119, b: 0 },     // 4: 橙
  { r: 255, g: 221, b: 0 },     // 5: 黄
  { r: 0, g: 204, b: 85 },      // 6: 绿
  { r: 0, g: 102, b: 0 },       // 7: 深绿
  { r: 0, g: 204, b: 255 },     // 8: 天蓝
  { r: 0, g: 85, b: 255 },      // 9: 亮蓝
  { r: 136, g: 0, b: 255 },     // 10: 紫
  { r: 255, g: 0, b: 170 },     // 11: 洋红
  { r: 255, g: 170, b: 170 },   // 12: 浅粉
  { r: 102, g: 102, b: 102 },   // 13: 灰
  { r: 187, g: 187, b: 187 },   // 14: 浅灰
  { r: 102, g: 68, b: 0 },       // 15: 棕
];

/**
 * 加载并解码静态图片 (PNG / JPG / WEBP)
 */
export async function decodeStaticImage(file: File): Promise<DecodedImageFrame[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('无法创建 Canvas 2D 绘图上下文'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve([
          {
            width: canvas.width,
            height: canvas.height,
            delayMs: 125, // 默认 8 FPS
            rgbaData: imgData.data,
          },
        ]);
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 使用 gifuct-js 解码多帧 GIF 动图，处理 disposal 方法以正确合成每一帧
 */
export async function decodeGifImage(file: File): Promise<DecodedImageFrame[]> {
  const buffer = await file.arrayBuffer();
  const gif = parseGIF(buffer);
  const frames = decompressFrames(gif, true) as ParsedFrame[];

  if (!frames || frames.length === 0) {
    throw new Error('GIF 解析失败或未包含帧');
  }

  // 获取 GIF 真实逻辑尺寸
  const gifWidth = gif.lsd.width;
  const gifHeight = gif.lsd.height;

  // 离屏画布用于叠加各帧合成
  const canvas = document.createElement('canvas');
  canvas.width = gifWidth;
  canvas.height = gifHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('无法创建合成画布');

  // 用于处置方法 3 (Restore to Previous)
  let previousImageData: ImageData | null = null;
  const decodedFrames: DecodedImageFrame[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const { dims, patch, delay, disposalType } = frame;

    // 处置方法 3 需要先记录当前状态
    if (disposalType === 3) {
      previousImageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
    }

    // 创建当前 patch 的 ImageData
    const patchImgData = ctx.createImageData(dims.width, dims.height);
    patchImgData.data.set(patch);

    // 将 patch 临时画到离屏 canvas 上，再合成到主画布以保留半透明
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = dims.width;
    tempCanvas.height = dims.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(patchImgData, 0, 0);
      ctx.drawImage(tempCanvas, dims.left, dims.top);
    }

    // 抓取合成后的完整帧
    const compositeData = ctx.getImageData(0, 0, gifWidth, gifHeight);
    decodedFrames.push({
      width: gifWidth,
      height: gifHeight,
      delayMs: Math.max(20, (delay || 10) * 10), // gifuct delay 是 1/100 秒
      rgbaData: new Uint8ClampedArray(compositeData.data),
    });

    // 处理当前帧的 disposal 方式给下一帧准备
    if (disposalType === 2) {
      // Restore to background: 清空本帧区域为透明底
      ctx.clearRect(dims.left, dims.top, dims.width, dims.height);
    } else if (disposalType === 3 && previousImageData) {
      // Restore to previous
      ctx.putImageData(previousImageData, 0, 0);
    }
  }

  return decodedFrames;
}

/**
 * 图像缩放（最近邻与双线性插值）
 */
function resizeImageData(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  mode: ScaleAlgorithm
): Float32Array {
  // 返回 [r, g, b, a] 的 Float32Array 方便后续抖动加权计算
  const result = new Float32Array(dstW * dstH * 4);

  if (mode === 'nearest') {
    for (let dy = 0; dy < dstH; dy++) {
      const sy = Math.min(srcH - 1, Math.floor((dy / dstH) * srcH));
      for (let dx = 0; dx < dstW; dx++) {
        const sx = Math.min(srcW - 1, Math.floor((dx / dstW) * srcW));
        const srcIdx = (sy * srcW + sx) * 4;
        const dstIdx = (dy * dstW + dx) * 4;

        result[dstIdx] = srcData[srcIdx];
        result[dstIdx + 1] = srcData[srcIdx + 1];
        result[dstIdx + 2] = srcData[srcIdx + 2];
        result[dstIdx + 3] = srcData[srcIdx + 3];
      }
    }
    return result;
  }

  // 双线性插值
  const xRatio = (srcW - 1) / Math.max(1, dstW - 1);
  const yRatio = (srcH - 1) / Math.max(1, dstH - 1);

  for (let dy = 0; dy < dstH; dy++) {
    const srcY = dy * yRatio;
    const y0 = Math.floor(srcY);
    const y1 = Math.min(srcH - 1, y0 + 1);
    const yWeight = srcY - y0;

    for (let dx = 0; dx < dstW; dx++) {
      const srcX = dx * xRatio;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(srcW - 1, x0 + 1);
      const xWeight = srcX - x0;

      const idx00 = (y0 * srcW + x0) * 4;
      const idx10 = (y0 * srcW + x1) * 4;
      const idx01 = (y1 * srcW + x0) * 4;
      const idx11 = (y1 * srcW + x1) * 4;

      const dstIdx = (dy * dstW + dx) * 4;

      for (let c = 0; c < 4; c++) {
        const top = srcData[idx00 + c] * (1 - xWeight) + srcData[idx10 + c] * xWeight;
        const bottom = srcData[idx01 + c] * (1 - xWeight) + srcData[idx11 + c] * xWeight;
        result[dstIdx + c] = top * (1 - yWeight) + bottom * yWeight;
      }
    }
  }

  return result;
}

/**
 * 色彩量化映射
 */
function quantizePixel(r: number, g: number, b: number, mode: QuantizeMode): RgbColor {
  switch (mode) {
    case 'rgb888':
      return {
        r: Math.max(0, Math.min(255, Math.round(r))),
        g: Math.max(0, Math.min(255, Math.round(g))),
        b: Math.max(0, Math.min(255, Math.round(b))),
      };

    case 'rgb565': {
      // 5-6-5 量化与还原
      const r5 = Math.max(0, Math.min(31, Math.round((r / 255) * 31)));
      const g6 = Math.max(0, Math.min(63, Math.round((g / 255) * 63)));
      const b5 = Math.max(0, Math.min(31, Math.round((b / 255) * 31)));
      return {
        r: (r5 << 3) | (r5 >> 2),
        g: (g6 << 2) | (g6 >> 4),
        b: (b5 << 3) | (b5 >> 2),
      };
    }

    case 'palette16': {
      let bestDist = Infinity;
      let bestColor = PALETTE_16[0];
      const curColor = { r, g, b };
      for (const p of PALETTE_16) {
        const dist = colorDistanceSq(curColor, p);
        if (dist < bestDist) {
          bestDist = dist;
          bestColor = p;
        }
      }
      return bestColor;
    }

    case 'monochrome': {
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      return luminance >= 128
        ? { r: 255, g: 255, b: 255 }
        : { r: 0, g: 0, b: 0 };
    }
  }
}

/**
 * 完整处理单帧：缩放 -> 亮度/对比度 -> Floyd-Steinberg 抖动与色彩量化 -> 生成 Hex 数组
 */
export function processFrameWithDithering(
  frame: DecodedImageFrame,
  options: DitherOptions
): string[] {
  const {
    targetWidth: w,
    targetHeight: h,
    scaleAlgorithm,
    quantizeMode,
    ditherStrength,
    brightness,
    contrast,
    transparentColor = '#000000',
  } = options;

  // 1. 缩放到目标分辨率
  const buffer = resizeImageData(frame.rgbaData, frame.width, frame.height, w, h, scaleAlgorithm);

  // 对比度系数公式
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const transparentRgb = hexToRgb(transparentColor);

  // 2. 亮度、对比度与透明度预处理
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const alpha = buffer[idx + 3];

    if (alpha < 64) {
      // 几乎完全透明像素用底色替换
      buffer[idx] = transparentRgb.r;
      buffer[idx + 1] = transparentRgb.g;
      buffer[idx + 2] = transparentRgb.b;
    } else {
      for (let c = 0; c < 3; c++) {
        let val = buffer[idx + c];
        // 调节亮度
        val += (brightness * 255) / 100;
        // 调节对比度
        val = contrastFactor * (val - 128) + 128;
        buffer[idx + c] = Math.max(0, Math.min(255, val));
      }
    }
  }

  // 3. Floyd-Steinberg 误差扩散与色彩量化
  const outputPixels = new Array<string>(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const oldR = buffer[idx];
      const oldG = buffer[idx + 1];
      const oldB = buffer[idx + 2];

      // 量化到对应色彩空间
      const q = quantizePixel(oldR, oldG, oldB, quantizeMode);
      outputPixels[y * w + x] = rgbToHex(q.r, q.g, q.b);

      // 计算量化误差并乘以抖动强度
      const errR = (oldR - q.r) * ditherStrength;
      const errG = (oldG - q.g) * ditherStrength;
      const errB = (oldB - q.b) * ditherStrength;

      // 误差扩散权重分配：
      // (x+1, y)   : 7/16
      // (x-1, y+1) : 3/16
      // (x,   y+1) : 5/16
      // (x+1, y+1) : 1/16
      if (ditherStrength > 0) {
        distributeError(buffer, w, h, x + 1, y, errR, errG, errB, 7 / 16);
        distributeError(buffer, w, h, x - 1, y + 1, errR, errG, errB, 3 / 16);
        distributeError(buffer, w, h, x, y + 1, errR, errG, errB, 5 / 16);
        distributeError(buffer, w, h, x + 1, y + 1, errR, errG, errB, 1 / 16);
      }
    }
  }

  return outputPixels;
}

function distributeError(
  buffer: Float32Array,
  w: number,
  h: number,
  x: number,
  y: number,
  errR: number,
  errG: number,
  errB: number,
  weight: number
) {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const idx = (y * w + x) * 4;
  buffer[idx] = Math.max(0, Math.min(255, buffer[idx] + errR * weight));
  buffer[idx + 1] = Math.max(0, Math.min(255, buffer[idx + 1] + errG * weight));
  buffer[idx + 2] = Math.max(0, Math.min(255, buffer[idx + 2] + errB * weight));
}

/**
 * 批量转换解码后的帧为项目 Frame[] 结构
 */
export function convertDecodedFramesToStudio(
  decodedFrames: DecodedImageFrame[],
  options: DitherOptions
): Frame[] {
  return decodedFrames.map((frame, index) => {
    const pixels = processFrameWithDithering(frame, options);
    return {
      id: `imported_${Date.now()}_${index}`,
      durationMs: frame.delayMs,
      pixels,
    };
  });
}
