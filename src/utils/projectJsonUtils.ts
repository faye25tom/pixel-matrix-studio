import {
  ColorFormat,
  Frame,
  LedPreviewConfig,
  ProjectSavePayload,
} from '../types/matrix';
import { normalizeHex, rgb565HexToHex } from './colorUtils';
import { downloadBlob } from './exportUtils';

export interface ParsedProjectResult {
  projectName?: string;
  width: number;
  height: number;
  colorFormat: ColorFormat;
  fps: number;
  frames: Frame[];
  ledConfig?: LedPreviewConfig;
}

/**
 * 导出可再次编辑的完整工程项目文件 (.pixelproject.json)
 */
export function exportProjectJson(
  projectName: string,
  width: number,
  height: number,
  colorFormat: ColorFormat,
  fps: number,
  frames: Frame[],
  ledConfig: LedPreviewConfig
) {
  const cleanName = projectName.trim() || 'pixel_matrix_project';
  const payload: ProjectSavePayload = {
    app: 'PixelMatrix Studio',
    schemaVersion: '1.0',
    metadata: {
      projectName: cleanName,
      savedAt: new Date().toISOString(),
      width,
      height,
      colorFormat,
      fps,
      totalFrames: frames.length,
      ledConfig,
    },
    frames: frames.map((f) => ({
      id: f.id,
      durationMs: f.durationMs,
      pixels: [...f.pixels],
    })),
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, `${cleanName}.pixelproject.json`);
}

/**
 * 智能解析外部导入的 JSON 字符串（兼容工程项目 JSON 与硬件方案商 JSON）
 */
export function parseImportedJson(jsonString: string): ParsedProjectResult {
  let data: any;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error('选中的文件不是合法的 JSON 数据');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('JSON 格式不正确');
  }

  // 1. 判断是否为 PixelMatrix Studio 工程文件 (ProjectSavePayload)
  if (data.app === 'PixelMatrix Studio' || (data.metadata && Array.isArray(data.frames) && data.frames[0]?.pixels)) {
    const meta = data.metadata || {};
    const width = Math.max(1, Math.min(64, parseInt(meta.width, 10) || 16));
    const height = Math.max(1, Math.min(64, parseInt(meta.height, 10) || 16));
    const colorFormat: ColorFormat = meta.colorFormat === 'RGB565' ? 'RGB565' : 'RGB888';
    const fps = Math.max(1, Math.min(30, parseInt(meta.fps, 10) || 8));

    const frames: Frame[] = data.frames.map((f: any, idx: number) => {
      const rawPixels: string[] = Array.isArray(f.pixels) ? f.pixels : [];
      const pixels = new Array(width * height).fill('#000000');
      for (let i = 0; i < width * height; i++) {
        if (rawPixels[i]) {
          pixels[i] = normalizeHex(rawPixels[i]);
        }
      }

      return {
        id: f.id || `imported_frame_${idx + 1}`,
        durationMs: typeof f.durationMs === 'number' && f.durationMs > 0 ? f.durationMs : Math.round(1000 / fps),
        pixels,
      };
    });

    return {
      projectName: meta.projectName || 'imported_project',
      width,
      height,
      colorFormat,
      fps,
      frames: frames.length > 0 ? frames : [{ id: 'f1', durationMs: Math.round(1000 / fps), pixels: new Array(width * height).fill('#000000') }],
      ledConfig: meta.ledConfig,
    };
  }

  // 2. 判断是否为硬件方案商交付 JSON (VendorExportPayload)
  if (data.schemaVersion === '1.0' && data.metadata && Array.isArray(data.frames)) {
    const meta = data.metadata;
    const width = Math.max(1, Math.min(64, parseInt(meta.width, 10) || 16));
    const height = Math.max(1, Math.min(64, parseInt(meta.height, 10) || 16));
    const colorFormat: ColorFormat = meta.colorFormat === 'RGB565' ? 'RGB565' : 'RGB888';
    const fps = Math.max(1, Math.min(30, parseInt(meta.fps, 10) || 8));

    const frames: Frame[] = data.frames.map((f: any, idx: number) => {
      const rawData: string[] = Array.isArray(f.data) ? f.data : [];
      const pixels = new Array(width * height).fill('#000000');

      for (let i = 0; i < width * height; i++) {
        const item = rawData[i];
        if (item) {
          if (colorFormat === 'RGB565' && item.startsWith('0x')) {
            pixels[i] = rgb565HexToHex(item);
          } else {
            pixels[i] = normalizeHex(item);
          }
        }
      }

      return {
        id: `vendor_frame_${idx + 1}`,
        durationMs: typeof f.durationMs === 'number' && f.durationMs > 0 ? f.durationMs : Math.round(1000 / fps),
        pixels,
      };
    });

    return {
      projectName: meta.projectName || 'vendor_import',
      width,
      height,
      colorFormat,
      fps,
      frames: frames.length > 0 ? frames : [{ id: 'f1', durationMs: Math.round(1000 / fps), pixels: new Array(width * height).fill('#000000') }],
    };
  }

  // 3. 兜底尝试提取 frames 或 pixels
  if (Array.isArray(data.pixels)) {
    const total = data.pixels.length;
    const side = Math.round(Math.sqrt(total));
    const width = Math.max(1, Math.min(64, side));
    const height = Math.max(1, Math.min(64, Math.floor(total / width)));
    return {
      width,
      height,
      colorFormat: 'RGB888',
      fps: 8,
      frames: [
        {
          id: 'imported_single',
          durationMs: 125,
          pixels: data.pixels.map((p: any) => normalizeHex(String(p))),
        },
      ],
    };
  }

  throw new Error('未能识别该 JSON 的点阵数据结构，请确保导入由本系统导出的工程文件或方案商标准 JSON');
}
