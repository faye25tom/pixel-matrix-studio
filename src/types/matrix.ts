// 色彩编码模式：支持 RGB888 (24位真彩) 与 RGB565 (16位嵌入式常用格式)
export type ColorFormat = 'RGB888' | 'RGB565';

// 灯珠物理形状
export type LedShape = 'circle' | 'square';

// 绘图工具枚举
export type DrawTool = 'pencil' | 'eraser' | 'bucket' | 'eyedropper' | 'line' | 'rect';

// 动效类型与参数辅助类型
export type ScrollDirection = 'left' | 'right' | 'up' | 'down';
export type LaserWipeMode = 'left-to-right' | 'center-out';
export type RainbowDirection = 'horizontal' | 'diagonal';
export type EffectType = 'scroll' | 'breathing' | 'blink' | 'rainbow' | 'laser' | 'text';

// 历史快照（用于全局 Undo/Redo）
export interface HistorySnapshot {
  frames: Frame[];
  currentFrameIndex: number;
  width: number;
  height: number;
}

// 单帧数据结构
export interface Frame {
  id: string;
  durationMs: number; // 当前帧停留毫秒数，默认由全局 FPS 决定 (1000 / fps)
  // 长度为 width * height 的一维数组，按从上到下、从左到右顺序存储大写 '#RRGGBB'，熄灭像素为 '#000000'
  pixels: string[];
}

// 真实灯珠物理预览配置
export interface LedPreviewConfig {
  shape: LedShape;            // 圆形灯珠 | 方形灯珠
  gapRatio: number;           // 灯珠间距比例 (0.05 ~ 0.40)
  glowIntensity: number;      // 发光光晕强度 (0 ~ 1.0)
  simulatePitchBlack: boolean;// 是否模拟黑色亚克力底板与未点亮灯珠暗纹
}

// AI 大模型配置（保存在 localStorage）
export interface AiWorkshopConfig {
  baseUrl: string;            // 默认 'https://api.openai.com/v1'，兼容 DeepSeek/硅基流动/Ollama
  apiKey: string;
  modelName: string;          // 如 'gpt-4o-mini' 或 'deepseek-chat'
  temperature: number;        // 默认 0.4
}

// 紧凑型 AI 调色板协议格式
export interface AiMatrixProtocol {
  palette: Record<string, string>;
  frames: Array<{
    durationMs?: number;
    rows: string[];
  }>;
}

// 动效生成参数配置接口集合
export interface ScrollEffectParams {
  direction: ScrollDirection;
  step?: number;
}

export interface BreathingEffectParams {
  frameCount: number;         // 8 ~ 24
  minBrightness: number;      // 0.1 ~ 0.5
}

export interface BlinkEffectParams {
  frameCount: number;         // 闪烁总帧数
  invertMode: boolean;        // 是否反色而非熄灭
}

export interface RainbowEffectParams {
  frameCount: number;         // 12 ~ 24
  direction: RainbowDirection;// 水平 / 对角线
}

export interface LaserWipeEffectParams {
  frameCount: number;
  mode: LaserWipeMode;        // 从左到右 / 中心向四周
}

export interface TextMatrixParams {
  text: string;
  fontSize: number;
  textColor: string;
  bgColor: string;
  autoScroll: boolean;
  scrollDirection: ScrollDirection;
}

// 交付给硬件方案商的标准导出 JSON 结构
export interface VendorExportPayload {
  schemaVersion: '1.0';
  metadata: {
    projectName: string;
    exportedAt: string;
    width: number;            // 1 ~ 64
    height: number;           // 1 ~ 64
    colorFormat: ColorFormat;
    fps: number;
    totalFrames: number;
  };
  frames: Array<{
    frameIndex: number;
    durationMs: number;
    // 当 colorFormat === 'RGB888' 时，输出 ['#FF0055', '#000000', ...]
    // 当 colorFormat === 'RGB565' 时，输出 16进制字符串 ['0xF80A', '0x0000', ...]
    data: string[];
    // 附带十进制整型数组，方便 C/App 方案商直接解析字节数值
    rawUint16OrUint24?: number[];
  }>;
}

// 可再次编辑的完整工程项目 JSON 结构
export interface ProjectSavePayload {
  app: 'PixelMatrix Studio';
  schemaVersion: '1.0';
  metadata: {
    projectName: string;
    savedAt: string;
    width: number;
    height: number;
    colorFormat: ColorFormat;
    fps: number;
    totalFrames: number;
    ledConfig?: LedPreviewConfig;
  };
  frames: Frame[];
}
