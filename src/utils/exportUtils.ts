import * as gifencPkg from 'gifenc';
import JSZip from 'jszip';
import { ColorFormat, Frame, LedPreviewConfig, VendorExportPayload } from '../types/matrix';
import { hexToRgb, hexToRgb565Hex, normalizeHex } from './colorUtils';

// 鲁棒获取 gifenc 的 API 方法，兼容 ESM 与 CommonJS
const anyPkg = gifencPkg as any;
const GIFEncoder =
  anyPkg.GIFEncoder ||
  (typeof anyPkg.default === 'function' ? anyPkg.default : anyPkg.default?.GIFEncoder);
const quantize = anyPkg.quantize || anyPkg.default?.quantize;
const applyPalette = anyPkg.applyPalette || anyPkg.default?.applyPalette;

export type ScanOrder = 'row-major' | 'serpentine';

/**
 * 触发浏览器保存 Blob 文件下载
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 将坐标按照扫描走线模式重排像素数组
 */
export function reorderPixelsByScanOrder(
  pixels: string[],
  width: number,
  height: number,
  scanOrder: ScanOrder
): string[] {
  if (scanOrder === 'row-major') {
    return [...pixels];
  }

  const result: string[] = [];
  for (let y = 0; y < height; y++) {
    const isReverseRow = y % 2 === 1; // 奇数行反转 (蛇形 S 走线)
    if (!isReverseRow) {
      for (let x = 0; x < width; x++) {
        result.push(pixels[y * width + x] || '#000000');
      }
    } else {
      for (let x = width - 1; x >= 0; x--) {
        result.push(pixels[y * width + x] || '#000000');
      }
    }
  }
  return result;
}

/**
 * 1. 生成方案商标准 JSON 结构
 */
export function buildVendorExportPayload(
  projectName: string,
  width: number,
  height: number,
  colorFormat: ColorFormat,
  fps: number,
  frames: Frame[],
  scanOrder: ScanOrder = 'row-major'
): VendorExportPayload {
  const cleanProjectName = projectName.trim() || 'pixel_matrix_project';

  const formattedFrames = frames.map((frame, index) => {
    const orderedPixels = reorderPixelsByScanOrder(frame.pixels, width, height, scanOrder);

    if (colorFormat === 'RGB888') {
      const data = orderedPixels.map((p) => normalizeHex(p));
      const rawUint16OrUint24 = data.map((hex) => {
        const rgb = hexToRgb(hex);
        return (rgb.r << 16) | (rgb.g << 8) | rgb.b;
      });
      return {
        frameIndex: index,
        durationMs: frame.durationMs,
        data,
        rawUint16OrUint24,
      };
    } else {
      // RGB565 模式
      const hex16List: string[] = [];
      const uint16List: number[] = [];

      for (const hex of orderedPixels) {
        const { hex16, uint16 } = hexToRgb565Hex(hex);
        hex16List.push(hex16);
        uint16List.push(uint16);
      }

      return {
        frameIndex: index,
        durationMs: frame.durationMs,
        data: hex16List,
        rawUint16OrUint24: uint16List,
      };
    }
  });

  return {
    schemaVersion: '1.0',
    metadata: {
      projectName: cleanProjectName,
      exportedAt: new Date().toISOString(),
      width,
      height,
      colorFormat,
      fps,
      totalFrames: frames.length,
    },
    frames: formattedFrames,
  };
}

/**
 * 导出方案商 JSON 文件并触发下载
 */
export function exportVendorJson(
  projectName: string,
  width: number,
  height: number,
  colorFormat: ColorFormat,
  fps: number,
  frames: Frame[],
  scanOrder: ScanOrder = 'row-major'
) {
  const payload = buildVendorExportPayload(
    projectName,
    width,
    height,
    colorFormat,
    fps,
    frames,
    scanOrder
  );
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const filename = `${projectName || 'matrix'}_${colorFormat.toLowerCase()}_${width}x${height}.json`;
  downloadBlob(blob, filename);
}

/**
 * 辅助：渲染单帧到指定 Canvas（支持普通纯方块与真实 LED 灯珠外观）
 */
function renderFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  width: number,
  height: number,
  scale: number,
  withLedLook: boolean,
  ledConfig?: LedPreviewConfig
) {
  const totalW = width * scale;
  const totalH = height * scale;

  ctx.fillStyle = '#0A0A0C';
  ctx.fillRect(0, 0, totalW, totalH);

  if (!withLedLook || !ledConfig) {
    // 纯净点阵像素渲染
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const hex = frame.pixels[y * width + x] || '#000000';
        ctx.fillStyle = hex;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  } else {
    // 真实 LED 物理仿真外观渲染
    const { shape, gapRatio, glowIntensity } = ledConfig;
    const radius = (scale * (1 - gapRatio)) / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const hex = frame.pixels[y * width + x] || '#000000';
        const rgb = hexToRgb(hex);
        const isLit = rgb.r + rgb.g + rgb.b >= 12;
        const cx = x * scale + scale / 2;
        const cy = y * scale + scale / 2;

        if (!isLit) {
          ctx.fillStyle = '#16161B';
          drawShape(ctx, shape, cx, cy, radius);
          ctx.fill();
        } else {
          ctx.save();
          if (glowIntensity > 0) {
            ctx.shadowColor = hex;
            ctx.shadowBlur = scale * glowIntensity * 0.85;
          }
          ctx.fillStyle = hex;
          drawShape(ctx, shape, cx, cy, radius);
          ctx.fill();

          // 核心高光小圆点
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: 'circle' | 'square',
  cx: number,
  cy: number,
  r: number
) {
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2);
  } else {
    const size = Math.max(2, r * 2);
    const corner = Math.min(3, r * 0.3);
    const left = cx - r;
    const top = cy - r;
    if (ctx.roundRect) {
      ctx.roundRect(left, top, size, size, corner);
    } else {
      ctx.rect(left, top, size, size);
    }
  }
}

/**
 * 2. 导出循环动效 GIF 文件 (使用 gifenc)
 */
export async function exportAnimatedGif(
  projectName: string,
  frames: Frame[],
  width: number,
  height: number,
  scale: number,
  withLedLook: boolean,
  ledConfig: LedPreviewConfig
): Promise<void> {
  if (!GIFEncoder || !quantize || !applyPalette) {
    throw new Error('GIF 编码器模块加载异常，请刷新页面重试');
  }

  const canvasW = width * scale;
  const canvasH = height * scale;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('无法创建离屏 Canvas 绘图上下文');

  const gif = GIFEncoder();

  for (const frame of frames) {
    renderFrameToCanvas(ctx, frame, width, height, scale, withLedLook, ledConfig);
    const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
    const rgba = imgData.data;

    // 量化计算 256 色调色板
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);

    gif.writeFrame(index, canvasW, canvasH, {
      palette,
      delay: Math.max(20, frame.durationMs),
    });
  }

  gif.finish();
  const buffer = gif.bytes();
  const blob = new Blob([new Uint8Array(buffer)], { type: 'image/gif' });
  downloadBlob(blob, `${projectName || 'animation'}_${width}x${height}.gif`);
}

/**
 * 3. 导出 PNG 长条精灵图 (Sprite Sheet)
 */
export async function exportSpriteSheetPng(
  projectName: string,
  frames: Frame[],
  width: number,
  height: number,
  scale: number,
  withLedLook: boolean,
  ledConfig: LedPreviewConfig
): Promise<void> {
  const frameW = width * scale;
  const frameH = height * scale;
  const totalW = frameW * frames.length;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = frameH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');

  // 底色
  ctx.fillStyle = '#0A0A0C';
  ctx.fillRect(0, 0, totalW, frameH);

  const singleCanvas = document.createElement('canvas');
  singleCanvas.width = frameW;
  singleCanvas.height = frameH;
  const singleCtx = singleCanvas.getContext('2d');
  if (!singleCtx) throw new Error('无法创建单帧 Canvas');

  for (let i = 0; i < frames.length; i++) {
    renderFrameToCanvas(singleCtx, frames[i], width, height, scale, withLedLook, ledConfig);
    ctx.drawImage(singleCanvas, i * frameW, 0);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${projectName || 'matrix'}_spritesheet_${frames.length}f.png`);
      }
      resolve();
    }, 'image/png');
  });
}

/**
 * 4. 导出多帧 PNG 序列压缩包 (ZIP)
 */
export async function exportPngSequenceZip(
  projectName: string,
  frames: Frame[],
  width: number,
  height: number,
  scale: number,
  fps: number,
  withLedLook: boolean,
  ledConfig: LedPreviewConfig
): Promise<void> {
  const frameW = width * scale;
  const frameH = height * scale;

  const canvas = document.createElement('canvas');
  canvas.width = frameW;
  canvas.height = frameH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');

  const zip = new JSZip();
  const folder = zip.folder('frames') || zip;

  for (let i = 0; i < frames.length; i++) {
    renderFrameToCanvas(ctx, frames[i], width, height, scale, withLedLook, ledConfig);
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const filename = `frame_${String(i + 1).padStart(3, '0')}.png`;
    folder.file(filename, base64Data, { base64: true });
  }

  // 附带一份 manifest.json 记录序列属性
  const manifest = {
    projectName: projectName || 'pixel_matrix_project',
    width,
    height,
    scale,
    fps,
    totalFrames: frames.length,
    frameList: frames.map((f, i) => ({
      index: i + 1,
      filename: `frame_${String(i + 1).padStart(3, '0')}.png`,
      durationMs: f.durationMs,
    })),
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, `${projectName || 'matrix'}_sequence_${frames.length}f.zip`);
}
