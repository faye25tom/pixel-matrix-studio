import { create } from 'zustand';
import {
  ColorFormat,
  DrawTool,
  Frame,
  HistorySnapshot,
  LedPreviewConfig,
} from '../types/matrix';
import { quantizeHexToRgb565Preview } from '../utils/colorUtils';

const MAX_HISTORY_STEPS = 30;

// 工具函数：创建全黑初始像素矩阵
export function createEmptyPixels(width: number, height: number): string[] {
  return new Array(width * height).fill('#000000');
}

// 工具函数：创建单帧
export function createFrame(width: number, height: number, fps: number, pixels?: string[]): Frame {
  return {
    id: 'frame_' + Math.random().toString(36).substring(2, 9),
    durationMs: Math.round(1000 / fps),
    pixels: pixels ? [...pixels] : createEmptyPixels(width, height),
  };
}

export interface MatrixStoreState {
  // 画布属性
  width: number;
  height: number;
  colorFormat: ColorFormat;

  // 帧与播放状态
  frames: Frame[];
  currentFrameIndex: number;
  isPlaying: boolean;
  fps: number;
  onionSkinEnabled: boolean;

  // 绘图工具与色彩
  activeTool: DrawTool;
  primaryColor: string;
  recentColors: string[];

  // 灯珠物理预览属性
  ledConfig: LedPreviewConfig;

  // 历史栈 (Undo / Redo)
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];

  // Actions
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setDimensions: (newWidth: number, newHeight: number, resizeMode?: 'crop' | 'rescale') => void;
  setColorFormat: (format: ColorFormat) => void;
  setActiveTool: (tool: DrawTool) => void;
  setPrimaryColor: (color: string) => void;
  addRecentColor: (color: string) => void;
  setLedConfig: (config: Partial<LedPreviewConfig>) => void;

  // 帧操作
  setCurrentFrameIndex: (index: number) => void;
  setFps: (fps: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlayback: () => void;
  setOnionSkinEnabled: (enabled: boolean) => void;

  addFrame: (insertAfterCurrent?: boolean) => void;
  duplicateFrame: (index?: number) => void;
  deleteFrame: (index?: number) => void;
  reorderFrames: (fromIndex: number, toIndex: number) => void;
  clearCurrentFrame: () => void;
  replaceFrames: (newFrames: Frame[], newFps?: number) => void;
  loadProject: (project: {
    width: number;
    height: number;
    colorFormat?: ColorFormat;
    fps?: number;
    frames: Frame[];
    ledConfig?: Partial<LedPreviewConfig>;
  }) => void;

  // 像素修改与历史栈
  commitSnapshot: () => void;
  setPixel: (x: number, y: number, color: string, recordHistory?: boolean) => void;
  setPixelsBatch: (updates: Array<{ x: number; y: number; color: string }>, recordHistory?: boolean) => void;
  updateCurrentFramePixels: (pixels: string[], recordHistory?: boolean) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useMatrixStore = create<MatrixStoreState>((set, get) => {
  const initialWidth = 16;
  const initialHeight = 16;
  const initialFps = 8;
  const initialFrame = createFrame(initialWidth, initialHeight, initialFps);

  const initialLedConfig: LedPreviewConfig = {
    shape: 'circle',
    gapRatio: 0.15,
    glowIntensity: 0.6,
    simulatePitchBlack: true,
  };

  const initialRecentColors = [
    '#FF0055',
    '#FF5500',
    '#FFAA00',
    '#00FF66',
    '#00F0FF',
    '#0055FF',
    '#AA00FF',
    '#FFFFFF',
  ];

  return {
    width: initialWidth,
    height: initialHeight,
    colorFormat: 'RGB888',

    frames: [initialFrame],
    currentFrameIndex: 0,
    isPlaying: false,
    fps: initialFps,
    onionSkinEnabled: false,

    activeTool: 'pencil',
    primaryColor: '#FF0055',
    recentColors: initialRecentColors,

    ledConfig: initialLedConfig,

    historyPast: [],
    historyFuture: [],

    setWidth: (w) => get().setDimensions(w, get().height, 'crop'),
    setHeight: (h) => get().setDimensions(get().width, h, 'crop'),

    setDimensions: (newWidth, newHeight, resizeMode = 'crop') => {
      // 限制 1 ~ 64
      const clampedW = Math.max(1, Math.min(64, Math.round(newWidth)));
      const clampedH = Math.max(1, Math.min(64, Math.round(newHeight)));
      const { width: oldW, height: oldH, frames } = get();

      if (clampedW === oldW && clampedH === oldH) return;

      get().commitSnapshot();

      const newFrames = frames.map((frame) => {
        const newPixels = createEmptyPixels(clampedW, clampedH);

        if (resizeMode === 'crop') {
          // 保持左上角对齐裁剪或扩充
          for (let y = 0; y < Math.min(oldH, clampedH); y++) {
            for (let x = 0; x < Math.min(oldW, clampedW); x++) {
              const oldIdx = y * oldW + x;
              const newIdx = y * clampedW + x;
              newPixels[newIdx] = frame.pixels[oldIdx] || '#000000';
            }
          }
        } else {
          // 最近邻缩放重采样
          for (let ny = 0; ny < clampedH; ny++) {
            for (let nx = 0; nx < clampedW; nx++) {
              const srcX = Math.min(oldW - 1, Math.floor((nx / clampedW) * oldW));
              const srcY = Math.min(oldH - 1, Math.floor((ny / clampedH) * oldH));
              const oldIdx = srcY * oldW + srcX;
              const newIdx = ny * clampedW + nx;
              newPixels[newIdx] = frame.pixels[oldIdx] || '#000000';
            }
          }
        }

        return {
          ...frame,
          pixels: newPixels,
        };
      });

      set({
        width: clampedW,
        height: clampedH,
        frames: newFrames,
        historyFuture: [],
      });
    },

    setColorFormat: (format) => {
      const { colorFormat, frames } = get();
      if (format === colorFormat) return;

      if (format === 'RGB565') {
        // 将现有所有帧的颜色转换为 RGB565 损失后的颜色显示
        const convertedFrames = frames.map((f) => ({
          ...f,
          pixels: f.pixels.map((hex) => quantizeHexToRgb565Preview(hex)),
        }));
        set({ colorFormat: format, frames: convertedFrames });
      } else {
        set({ colorFormat: format });
      }
    },

    setActiveTool: (tool) => set({ activeTool: tool }),

    setPrimaryColor: (color) => {
      const normalized = color.toUpperCase();
      set({ primaryColor: normalized });
      get().addRecentColor(normalized);
    },

    addRecentColor: (color) => {
      const normalized = color.toUpperCase();
      const existing = get().recentColors.filter((c) => c !== normalized);
      set({ recentColors: [normalized, ...existing].slice(0, 16) });
    },

    setLedConfig: (config) => {
      set((state) => ({
        ledConfig: { ...state.ledConfig, ...config },
      }));
    },

    setCurrentFrameIndex: (index) => {
      const { frames } = get();
      if (index >= 0 && index < frames.length) {
        set({ currentFrameIndex: index });
      }
    },

    setFps: (fps) => {
      const clampedFps = Math.max(1, Math.min(30, Math.round(fps)));
      const durationMs = Math.round(1000 / clampedFps);
      set((state) => ({
        fps: clampedFps,
        frames: state.frames.map((f) => ({ ...f, durationMs })),
      }));
    },

    setIsPlaying: (isPlaying) => set({ isPlaying }),

    togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

    setOnionSkinEnabled: (onionSkinEnabled) => set({ onionSkinEnabled }),

    commitSnapshot: () => {
      const { frames, currentFrameIndex, width, height, historyPast } = get();
      // 深拷贝快照
      const snapshot: HistorySnapshot = {
        width,
        height,
        currentFrameIndex,
        frames: frames.map((f) => ({ ...f, pixels: [...f.pixels] })),
      };

      const newPast = [...historyPast, snapshot].slice(-MAX_HISTORY_STEPS);
      set({ historyPast: newPast, historyFuture: [] });
    },

    setPixel: (x, y, color, recordHistory = true) => {
      const { width, height, currentFrameIndex, frames, colorFormat } = get();
      if (x < 0 || x >= width || y < 0 || y >= height) return;

      const targetFrame = frames[currentFrameIndex];
      if (!targetFrame) return;

      const idx = y * width + x;
      const targetColor = colorFormat === 'RGB565' ? quantizeHexToRgb565Preview(color) : color.toUpperCase();
      if (targetFrame.pixels[idx] === targetColor) return;

      if (recordHistory) {
        get().commitSnapshot();
      }

      const newPixels = [...targetFrame.pixels];
      newPixels[idx] = targetColor;

      const newFrames = [...frames];
      newFrames[currentFrameIndex] = {
        ...targetFrame,
        pixels: newPixels,
      };

      set({ frames: newFrames });
    },

    setPixelsBatch: (updates, recordHistory = true) => {
      const { width, height, currentFrameIndex, frames, colorFormat } = get();
      const targetFrame = frames[currentFrameIndex];
      if (!targetFrame || updates.length === 0) return;

      if (recordHistory) {
        get().commitSnapshot();
      }

      const newPixels = [...targetFrame.pixels];
      for (const { x, y, color } of updates) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = y * width + x;
          newPixels[idx] = colorFormat === 'RGB565' ? quantizeHexToRgb565Preview(color) : color.toUpperCase();
        }
      }

      const newFrames = [...frames];
      newFrames[currentFrameIndex] = {
        ...targetFrame,
        pixels: newPixels,
      };

      set({ frames: newFrames });
    },

    updateCurrentFramePixels: (pixels, recordHistory = true) => {
      const { width, height, currentFrameIndex, frames, colorFormat } = get();
      const targetFrame = frames[currentFrameIndex];
      if (!targetFrame) return;

      if (recordHistory) {
        get().commitSnapshot();
      }

      const processed = colorFormat === 'RGB565'
        ? pixels.map((c) => quantizeHexToRgb565Preview(c))
        : pixels.map((c) => c.toUpperCase());

      const newFrames = [...frames];
      newFrames[currentFrameIndex] = {
        ...targetFrame,
        pixels: processed.slice(0, width * height),
      };

      set({ frames: newFrames });
    },

    addFrame: (insertAfterCurrent = true) => {
      get().commitSnapshot();
      const { width, height, fps, frames, currentFrameIndex } = get();
      const newFrame = createFrame(width, height, fps);
      const newFrames = [...frames];

      const insertIndex = insertAfterCurrent ? currentFrameIndex + 1 : newFrames.length;
      newFrames.splice(insertIndex, 0, newFrame);

      set({
        frames: newFrames,
        currentFrameIndex: insertIndex,
      });
    },

    duplicateFrame: (index) => {
      get().commitSnapshot();
      const { frames, currentFrameIndex } = get();
      const targetIndex = index ?? currentFrameIndex;
      const srcFrame = frames[targetIndex];
      if (!srcFrame) return;

      const cloned: Frame = {
        id: 'frame_' + Math.random().toString(36).substring(2, 9),
        durationMs: srcFrame.durationMs,
        pixels: [...srcFrame.pixels],
      };

      const newFrames = [...frames];
      newFrames.splice(targetIndex + 1, 0, cloned);

      set({
        frames: newFrames,
        currentFrameIndex: targetIndex + 1,
      });
    },

    deleteFrame: (index) => {
      const { frames, currentFrameIndex } = get();
      if (frames.length <= 1) {
        // 如果只有 1 帧，删除相当于清空
        get().clearCurrentFrame();
        return;
      }

      get().commitSnapshot();
      const targetIndex = index ?? currentFrameIndex;
      const newFrames = frames.filter((_, idx) => idx !== targetIndex);
      const newIndex = Math.min(targetIndex, newFrames.length - 1);

      set({
        frames: newFrames,
        currentFrameIndex: newIndex,
      });
    },

    reorderFrames: (fromIndex, toIndex) => {
      const { frames, currentFrameIndex } = get();
      if (
        fromIndex < 0 ||
        fromIndex >= frames.length ||
        toIndex < 0 ||
        toIndex >= frames.length ||
        fromIndex === toIndex
      ) {
        return;
      }

      get().commitSnapshot();
      const newFrames = [...frames];
      const [moved] = newFrames.splice(fromIndex, 1);
      newFrames.splice(toIndex, 0, moved);

      let nextIndex = currentFrameIndex;
      if (currentFrameIndex === fromIndex) {
        nextIndex = toIndex;
      } else if (fromIndex < currentFrameIndex && toIndex >= currentFrameIndex) {
        nextIndex--;
      } else if (fromIndex > currentFrameIndex && toIndex <= currentFrameIndex) {
        nextIndex++;
      }

      set({
        frames: newFrames,
        currentFrameIndex: nextIndex,
      });
    },

    clearCurrentFrame: () => {
      get().commitSnapshot();
      const { width, height, currentFrameIndex, frames } = get();
      const target = frames[currentFrameIndex];
      if (!target) return;

      const newFrames = [...frames];
      newFrames[currentFrameIndex] = {
        ...target,
        pixels: createEmptyPixels(width, height),
      };

      set({ frames: newFrames });
    },

    replaceFrames: (newFrames, newFps) => {
      if (!newFrames || newFrames.length === 0) return;
      get().commitSnapshot();

      const fps = newFps ?? get().fps;
      set({
        frames: newFrames,
        currentFrameIndex: 0,
        fps,
        isPlaying: true, // 替换后自动开启播放动效
      });
    },

    loadProject: ({ width, height, colorFormat, fps, frames, ledConfig }) => {
      get().commitSnapshot();

      const clampedW = Math.max(1, Math.min(64, Math.round(width)));
      const clampedH = Math.max(1, Math.min(64, Math.round(height)));
      const nextFps = fps ? Math.max(1, Math.min(30, Math.round(fps))) : get().fps;
      const nextFormat = colorFormat || get().colorFormat;

      set((state) => ({
        width: clampedW,
        height: clampedH,
        colorFormat: nextFormat,
        fps: nextFps,
        frames: frames && frames.length > 0 ? frames : [createFrame(clampedW, clampedH, nextFps)],
        currentFrameIndex: 0,
        isPlaying: false,
        ledConfig: ledConfig ? { ...state.ledConfig, ...ledConfig } : state.ledConfig,
        historyFuture: [],
      }));
    },

    undo: () => {
      const { historyPast, historyFuture, frames, currentFrameIndex, width, height } = get();
      if (historyPast.length === 0) return;

      const currentSnapshot: HistorySnapshot = {
        width,
        height,
        currentFrameIndex,
        frames: frames.map((f) => ({ ...f, pixels: [...f.pixels] })),
      };

      const previous = historyPast[historyPast.length - 1];
      const newPast = historyPast.slice(0, -1);
      const newFuture = [currentSnapshot, ...historyFuture].slice(0, MAX_HISTORY_STEPS);

      set({
        width: previous.width,
        height: previous.height,
        currentFrameIndex: Math.min(previous.currentFrameIndex, previous.frames.length - 1),
        frames: previous.frames.map((f) => ({ ...f, pixels: [...f.pixels] })),
        historyPast: newPast,
        historyFuture: newFuture,
      });
    },

    redo: () => {
      const { historyPast, historyFuture, frames, currentFrameIndex, width, height } = get();
      if (historyFuture.length === 0) return;

      const currentSnapshot: HistorySnapshot = {
        width,
        height,
        currentFrameIndex,
        frames: frames.map((f) => ({ ...f, pixels: [...f.pixels] })),
      };

      const next = historyFuture[0];
      const newFuture = historyFuture.slice(1);
      const newPast = [...historyPast, currentSnapshot].slice(-MAX_HISTORY_STEPS);

      set({
        width: next.width,
        height: next.height,
        currentFrameIndex: Math.min(next.currentFrameIndex, next.frames.length - 1),
        frames: next.frames.map((f) => ({ ...f, pixels: [...f.pixels] })),
        historyPast: newPast,
        historyFuture: newFuture,
      });
    },

    canUndo: () => get().historyPast.length > 0,
    canRedo: () => get().historyFuture.length > 0,
  };
});
