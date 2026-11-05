import React, { useEffect, useRef } from 'react';
import { useMatrixStore } from '../store/useMatrixStore';
import {
  Play,
  Pause,
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
} from 'lucide-react';
import { Frame } from '../types/matrix';

// 单帧微型 Canvas 缩略图
const FrameThumbnail: React.FC<{
  frame: Frame;
  width: number;
  height: number;
  isSelected: boolean;
  index: number;
  onClick: () => void;
}> = ({ frame, width, height, isSelected, index, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const hex = frame.pixels[y * width + x] || '#000000';
        ctx.fillStyle = hex;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [frame.pixels, width, height]);

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-between rounded-lg border-2 p-1 transition cursor-pointer ${
        isSelected
          ? 'border-[#6366F1] bg-[#6366F1]/10'
          : 'border-[#2E2E3A] bg-[#18181F] hover:border-gray-500 hover:bg-[#202028]'
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-[#0A0A0C]">
        <canvas
          ref={canvasRef}
          className="h-full w-full object-contain [image-rendering:pixelated]"
        />
      </div>
      <span className="mt-1 font-mono text-[10px] text-gray-400 group-hover:text-white">
        #{index + 1}
      </span>
    </div>
  );
};

export const BottomTimeline: React.FC = () => {
  const {
    frames,
    currentFrameIndex,
    isPlaying,
    fps,
    onionSkinEnabled,
    width,
    height,
    setCurrentFrameIndex,
    togglePlayback,
    setFps,
    setOnionSkinEnabled,
    addFrame,
    duplicateFrame,
    deleteFrame,
    reorderFrames,
  } = useMatrixStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 播放器时钟驱动
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;

    const intervalMs = Math.max(16, Math.round(1000 / fps));
    const timer = setInterval(() => {
      const nextIndex = (useMatrixStore.getState().currentFrameIndex + 1) % frames.length;
      useMatrixStore.getState().setCurrentFrameIndex(nextIndex);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, fps, frames.length]);

  return (
    <footer className="flex h-24 w-full items-center justify-between border-t border-[#2E2E3A] bg-[#121216] px-4">
      {/* 左侧：播放控制与 FPS 调节 */}
      <div className="flex items-center space-x-4">
        {/* 播放/暂停按钮 */}
        <button
          onClick={togglePlayback}
          className={`flex h-10 w-10 items-center justify-center rounded-lg shadow-md transition ${
            isPlaying
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'
          }`}
          title={isPlaying ? '暂停 (Space)' : '播放 (Space)'}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
        </button>

        {/* FPS 滑块与指示 */}
        <div className="flex flex-col space-y-1">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center space-x-1">
              <Sliders className="h-3 w-3" />
              <span>帧率</span>
            </span>
            <span className="font-mono text-white font-semibold">
              {fps} FPS <span className="text-gray-500 text-[10px]">({Math.round(1000 / fps)}ms)</span>
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value, 10))}
            className="h-1.5 w-28 cursor-pointer appearance-none rounded-lg bg-[#2E2E3A] accent-[#6366F1]"
          />
        </div>

        <div className="h-6 w-px bg-[#2E2E3A]" />

        {/* 洋葱皮开关 */}
        <button
          onClick={() => setOnionSkinEnabled(!onionSkinEnabled)}
          className={`flex items-center space-x-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
            onionSkinEnabled
              ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
              : 'border-[#2E2E3A] bg-[#18181F] text-gray-400 hover:text-gray-200'
          }`}
          title="洋葱皮：半透明透视上一帧作为参考"
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden md:inline">洋葱皮</span>
        </button>
      </div>

      {/* 中部：帧序列水平时间轴 */}
      <div className="flex flex-1 items-center space-x-2 px-6 overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex flex-1 items-center space-x-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-[#2E2E3A]"
        >
          {frames.map((frame, idx) => (
            <FrameThumbnail
              key={frame.id}
              frame={frame}
              width={width}
              height={height}
              isSelected={currentFrameIndex === idx}
              index={idx}
              onClick={() => setCurrentFrameIndex(idx)}
            />
          ))}
        </div>
      </div>

      {/* 右侧：帧管理按钮组 */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => addFrame(true)}
          className="flex items-center space-x-1 rounded-lg border border-[#2E2E3A] bg-[#18181F] px-2.5 py-1.5 text-xs text-gray-300 hover:bg-[#252530] hover:text-white transition"
          title="添加新帧"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">加帧</span>
        </button>

        <button
          onClick={() => duplicateFrame()}
          className="flex items-center space-x-1 rounded-lg border border-[#2E2E3A] bg-[#18181F] px-2.5 py-1.5 text-xs text-gray-300 hover:bg-[#252530] hover:text-white transition"
          title="复制当前帧"
        >
          <Copy className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">复制</span>
        </button>

        <button
          onClick={() => deleteFrame()}
          disabled={frames.length <= 1}
          className="rounded-lg border border-[#2E2E3A] bg-[#18181F] p-1.5 text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="删除当前帧"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        <div className="h-4 w-px bg-[#2E2E3A]" />

        {/* 顺序左右调整 */}
        <button
          onClick={() => reorderFrames(currentFrameIndex, currentFrameIndex - 1)}
          disabled={currentFrameIndex <= 0}
          className="rounded-lg border border-[#2E2E3A] bg-[#18181F] p-1.5 text-gray-300 hover:bg-[#252530] disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="前移一帧"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => reorderFrames(currentFrameIndex, currentFrameIndex + 1)}
          disabled={currentFrameIndex >= frames.length - 1}
          className="rounded-lg border border-[#2E2E3A] bg-[#18181F] p-1.5 text-gray-300 hover:bg-[#252530] disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="后移一帧"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </footer>
  );
};
