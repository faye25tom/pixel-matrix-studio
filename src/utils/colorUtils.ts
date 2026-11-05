/**
 * 颜色工具库：提供 RGB888 与 RGB565 互转、HSV 色彩计算及高精度色彩量化
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface Rgb565Result {
  hex16: string;  // 如 '0xF800'
  uint16: number; // 如 63488
}

/**
 * 规范化 Hex 字符串为大写 #RRGGBB 格式
 */
export function normalizeHex(hex: string): string {
  if (!hex) return '#000000';
  let cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  if (cleaned.length < 6) {
    cleaned = cleaned.padEnd(6, '0');
  }
  return ('#' + cleaned.slice(0, 6)).toUpperCase();
}

/**
 * 将十六进制颜色字符串转换为 RGB 分量对象
 */
export function hexToRgb(hex: string): RgbColor {
  const norm = normalizeHex(hex).slice(1);
  const r = parseInt(norm.substring(0, 2), 16) || 0;
  const g = parseInt(norm.substring(2, 4), 16) || 0;
  const b = parseInt(norm.substring(4, 6), 16) || 0;
  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b)),
  };
}

/**
 * 将 RGB 分量数值（0~255）转换为大写 #RRGGBB 字符串
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 将 RGB888 Hex 转换为 RGB565 格式（嵌入式 16 位整型与 0xXXXX 字符串）
 * 转换公式：((R & 0xF8) << 8) | ((G & 0xFC) << 3) | (B >> 3)
 */
export function hexToRgb565Hex(hex: string): Rgb565Result {
  const { r, g, b } = hexToRgb(hex);
  const r5 = (r & 0xf8) >> 3;
  const g6 = (g & 0xfc) >> 2;
  const b5 = (b & 0xf8) >> 3;
  const uint16 = (r5 << 11) | (g6 << 5) | b5;
  const hex16 = '0x' + uint16.toString(16).padStart(4, '0').toUpperCase();
  return { hex16, uint16 };
}

/**
 * 将 16位 RGB565 格式 (例如 '0xF800' 或数字 63488) 还原为 '#RRGGBB'
 */
export function rgb565HexToHex(input: string | number): string {
  let val = 0;
  if (typeof input === 'number') {
    val = input;
  } else if (typeof input === 'string') {
    val = parseInt(input.trim().replace(/^0x/i, ''), 16) || 0;
  }

  const r5 = (val >> 11) & 0x1f;
  const g6 = (val >> 5) & 0x3f;
  const b5 = val & 0x1f;

  const r8 = (r5 << 3) | (r5 >> 2);
  const g8 = (g6 << 2) | (g6 >> 4);
  const b8 = (b5 << 3) | (b5 >> 2);

  return rgbToHex(r8, g8, b8);
}

/**
 * 模拟 RGB565 色深损失后的 RGB888 预览颜色 (#RRGGBB)
 * 公式：
 * R5 = (R >> 3); G6 = (G >> 2); B5 = (B >> 3);
 * R8 = (R5 << 3) | (R5 >> 2);
 * G8 = (G6 << 2) | (G6 >> 4);
 * B8 = (B5 << 3) | (B5 >> 2);
 */
export function quantizeHexToRgb565Preview(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const r5 = r >> 3;
  const g6 = g >> 2;
  const b5 = b >> 3;

  const r8 = (r5 << 3) | (r5 >> 2);
  const g8 = (g6 << 2) | (g6 >> 4);
  const b8 = (b5 << 3) | (b5 >> 2);

  return rgbToHex(r8, g8, b8);
}

/**
 * HSV 转 RGB
 * @param h 0 ~ 360
 * @param s 0 ~ 1
 * @param v 0 ~ 1
 */
export function hsvToRgb(h: number, s: number, v: number): RgbColor {
  const clampedH = ((h % 360) + 360) % 360;
  const clampedS = Math.max(0, Math.min(1, s));
  const clampedV = Math.max(0, Math.min(1, v));

  const c = clampedV * clampedS;
  const x = c * (1 - Math.abs(((clampedH / 60) % 2) - 1));
  const m = clampedV - c;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (clampedH >= 0 && clampedH < 60) {
    rPrime = c; gPrime = x; bPrime = 0;
  } else if (clampedH >= 60 && clampedH < 120) {
    rPrime = x; gPrime = c; bPrime = 0;
  } else if (clampedH >= 120 && clampedH < 180) {
    rPrime = 0; gPrime = c; bPrime = x;
  } else if (clampedH >= 180 && clampedH < 240) {
    rPrime = 0; gPrime = x; bPrime = c;
  } else if (clampedH >= 240 && clampedH < 300) {
    rPrime = x; gPrime = 0; bPrime = c;
  } else {
    rPrime = c; gPrime = 0; bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

/**
 * HSV 转换为大写 #RRGGBB 字符串
 */
export function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

/**
 * RGB 转 HSV
 */
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = 60 * (((gNorm - bNorm) / delta) % 6);
    } else if (max === gNorm) {
      h = 60 * ((bNorm - rNorm) / delta + 2);
    } else {
      h = 60 * ((rNorm - gNorm) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

/**
 * 判断两个 Hex 颜色是否一致（均转为规范大写）
 */
export function isSameColor(hex1: string, hex2: string): boolean {
  return normalizeHex(hex1) === normalizeHex(hex2);
}

/**
 * 欧氏色差距离平方 (r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2
 */
export function colorDistanceSq(c1: RgbColor, c2: RgbColor): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return dr * dr + dg * dg + db * db;
}
