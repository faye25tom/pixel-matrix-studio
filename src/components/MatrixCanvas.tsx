import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useMatrixStore } from '../store/useMatrixStore';
import { hexToRgb, isSameColor } from '../utils/colorUtils';
import { LedPreviewConfig } from '../types/matrix';
import { Eye, Grid, Sparkles } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

// Bresenham 直线算法
function getBresenhamLine(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let currX = x0;
  let currY = y0;

  while (true) {
    points.push({ x: currX, y: currY });
    if (currX === x1 && currY === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }

  return points;
}

// 矩形生成算法（支持实心与空心）
function getRectPoints(x0: number, y0: number, x1: number, y1: number, filled = false): Point[] {
  const points: Point[] = [];
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (filled || x === minX || x === maxX || y === minY || y === maxY) {
        points.push({ x, y });
      }
    }
  }
  return points;
}

export const MatrixCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    width,
    height,
    frames,
    currentFrameIndex,
    activeTool,
    primaryColor,
    ledConfig,
    onionSkinEnabled,
    setPixel,
    setPixelsBatch,
    setPrimaryColor,
    commitSnapshot,
  } = useMatrixStore();

  const [viewMode, setViewMode] = useState<'grid' | 'led'>('grid');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentHover, setCurrentHover] = useState<Point | null>(null);
  const [previewPoints, setPreviewPoints] = useState<Point[]>([]);
  const [isRightClick, setIsRightClick] = useState(false);
  const [cellSize, setCellSize] = useState(24);

  const currentFrame = frames[currentFrameIndex];
  const previousFrame = currentFrameIndex > 0 ? frames[currentFrameIndex - 1] : null;

  // 自适应计算 Canvas 单元格大小
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const padding = 32;
      const availW = Math.max(100, clientWidth - padding);
      const availH = Math.max(100, clientHeight - padding);
      const calculatedCell = Math.max(4, Math.min(64, Math.floor(Math.min(availW / width, availH / height))));
      setCellSize(calculatedCell);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [width, height]);

  // BFS 油漆桶填充算法
  const handleBucketFill = useCallback((startX: number, startY: number, fillColor: string) => {
    if (!currentFrame) return;
    const startIndex = startY * width + startX;
    const targetColor = currentFrame.pixels[startIndex] || '#000000';
    if (isSameColor(targetColor, fillColor)) return;

    commitSnapshot();

    const visited = new Uint8Array(width * height);
    const queue: Point[] = [{ x: startX, y: startY }];
    visited[startIndex] = 1;

    const updates: Array<{ x: number; y: number; color: string }> = [];

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      updates.push({ x, y, color: fillColor });

      const neighbors: Point[] = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      ];

      for (const n of neighbors) {
        if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
          const nIdx = n.y * width + n.x;
          if (!visited[nIdx]) {
            visited[nIdx] = 1;
            if (isSameColor(currentFrame.pixels[nIdx] || '#000000', targetColor)) {
              queue.push(n);
            }
          }
        }
      }
    }

    setPixelsBatch(updates, false);
  }, [currentFrame, width, height, commitSnapshot, setPixelsBatch]);

  // 获取鼠标相对点阵像素坐标
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    if (x < 0 || x >= width || y < 0 || y >= height) return null;
    return { x, y };
  };

  // 绘制渲染 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFrame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const totalW = width * cellSize;
    const totalH = height * cellSize;
    canvas.width = totalW;
    canvas.height = totalH;

    // 清空背景
    ctx.fillStyle = '#0A0A0C';
    ctx.fillRect(0, 0, totalW, totalH);

    // 1. 洋葱皮渲染（上一帧以 25% 半透明显示）
    if (onionSkinEnabled && previousFrame) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const hex = previousFrame.pixels[y * width + x];
          if (hex && !isSameColor(hex, '#000000')) {
            ctx.fillStyle = hex;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }
      ctx.restore();
    }

    // 2. 当前帧渲染
    if (viewMode === 'grid') {
      renderGridMode(ctx, width, height, cellSize, currentFrame.pixels, previewPoints, primaryColor, isRightClick);
    } else {
      renderLedMode(ctx, width, height, cellSize, currentFrame.pixels, previewPoints, ledConfig, primaryColor, isRightClick);
    }

    // 3. 悬停十字准星或格子边框指示
    if (currentHover && currentHover.x >= 0 && currentHover.x < width && currentHover.y >= 0 && currentHover.y < height) {
      ctx.save();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        currentHover.x * cellSize + 0.5,
        currentHover.y * cellSize + 0.5,
        cellSize - 1,
        cellSize - 1
      );
      ctx.restore();
    }
  }, [
    width,
    height,
    cellSize,
    currentFrame,
    previousFrame,
    onionSkinEnabled,
    viewMode,
    previewPoints,
    ledConfig,
    currentHover,
    activeTool,
    primaryColor,
    isRightClick,
  ]);

  // 鼠标交互事件
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasCoords(e);
    if (!pt) return;

    const rightClick = e.button === 2;
    setIsRightClick(rightClick);
    setIsDrawing(true);
    setStartPoint(pt);

    const drawColor = rightClick ? '#000000' : primaryColor;

    if (activeTool === 'eyedropper') {
      const idx = pt.y * width + pt.x;
      const picked = currentFrame?.pixels[idx] || '#000000';
      setPrimaryColor(picked);
      setIsDrawing(false);
      return;
    }

    if (activeTool === 'bucket') {
      handleBucketFill(pt.x, pt.y, drawColor);
      setIsDrawing(false);
      return;
    }

    if (activeTool === 'pencil' || activeTool === 'eraser') {
      commitSnapshot();
      setPixel(pt.x, pt.y, activeTool === 'eraser' ? '#000000' : drawColor, false);
    } else if (activeTool === 'line' || activeTool === 'rect') {
      setPreviewPoints([pt]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasCoords(e);
    setCurrentHover(pt);

    if (!isDrawing || !pt) return;

    const drawColor = isRightClick ? '#000000' : primaryColor;

    if (activeTool === 'pencil' || activeTool === 'eraser') {
      const colorToSet = activeTool === 'eraser' ? '#000000' : drawColor;
      setPixel(pt.x, pt.y, colorToSet, false);
    } else if (activeTool === 'line' && startPoint) {
      const linePts = getBresenhamLine(startPoint.x, startPoint.y, pt.x, pt.y);
      setPreviewPoints(linePts);
    } else if (activeTool === 'rect' && startPoint) {
      const rectPts = getRectPoints(startPoint.x, startPoint.y, pt.x, pt.y, e.shiftKey);
      setPreviewPoints(rectPts);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const drawColor = isRightClick ? '#000000' : primaryColor;

    if ((activeTool === 'line' || activeTool === 'rect') && previewPoints.length > 0) {
      commitSnapshot();
      const updates = previewPoints.map((p) => ({
        x: p.x,
        y: p.y,
        color: drawColor,
      }));
      setPixelsBatch(updates, false);
    }

    setStartPoint(null);
    setPreviewPoints([]);
  };

  const handleMouseLeave = () => {
    if (isDrawing && (activeTool === 'line' || activeTool === 'rect') && previewPoints.length > 0) {
      const drawColor = isRightClick ? '#000000' : primaryColor;
      commitSnapshot();
      const updates = previewPoints.map((p) => ({
        x: p.x,
        y: p.y,
        color: drawColor,
      }));
      setPixelsBatch(updates, false);
    }
    setIsDrawing(false);
    setCurrentHover(null);
    setPreviewPoints([]);
    setStartPoint(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#0A0A0C] p-4"
    >
      {/* 视图模式切换悬浮小工具 */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-1 rounded-lg border border-[#2E2E3A] bg-[#18181F]/90 p-1 backdrop-blur shadow-lg">
        <button
          onClick={() => setViewMode('grid')}
          className={`flex items-center space-x-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
            viewMode === 'grid'
              ? 'bg-[#6366F1] text-white shadow-sm'
              : 'text-gray-400 hover:bg-[#252530] hover:text-gray-200'
          }`}
          title="网格编辑模式"
        >
          <Grid className="h-3.5 w-3.5" />
          <span>网格编辑</span>
        </button>
        <button
          onClick={() => setViewMode('led')}
          className={`flex items-center space-x-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
            viewMode === 'led'
              ? 'bg-[#6366F1] text-white shadow-sm'
              : 'text-gray-400 hover:bg-[#252530] hover:text-gray-200'
          }`}
          title="真实物理 LED 灯珠效果"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>LED 灯珠物理预览</span>
        </button>
      </div>

      {/* 坐标指示与洋葱皮提示 */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center space-x-3 text-xs text-gray-400">
        <div className="rounded border border-[#2E2E3A] bg-[#18181F]/80 px-2 py-0.5 font-mono">
          {currentHover ? `X: ${currentHover.x}, Y: ${currentHover.y}` : `${width} × ${height}`}
        </div>
        {onionSkinEnabled && (
          <div className="flex items-center space-x-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-400">
            <Eye className="h-3 w-3" />
            <span>洋葱皮已开启</span>
          </div>
        )}
      </div>

      {/* 画布 */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => e.preventDefault()}
        className="cursor-crosshair rounded shadow-2xl transition-all"
        style={{
          width: width * cellSize,
          height: height * cellSize,
        }}
      />
    </div>
  );
};

// 辅助渲染：编辑网格模式
function renderGridMode(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number,
  pixels: string[],
  previewPoints: Point[],
  primaryColor: string,
  isRightClick: boolean
) {
  // 1. 绘制像素格子
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const color = pixels[idx] || '#000000';
      ctx.fillStyle = color;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  // 2. 绘制拖拽预览覆盖层
  if (previewPoints.length > 0) {
    const previewColor = isRightClick ? '#000000' : primaryColor;
    ctx.fillStyle = previewColor;
    for (const pt of previewPoints) {
      if (pt.x >= 0 && pt.x < width && pt.y >= 0 && pt.y < height) {
        ctx.fillRect(pt.x * cellSize, pt.y * cellSize, cellSize, cellSize);
      }
    }
  }

  // 3. 绘制细致参考网格线
  ctx.save();
  ctx.strokeStyle = '#23232C';
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize + 0.5, 0);
    ctx.lineTo(x * cellSize + 0.5, height * cellSize);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellSize + 0.5);
    ctx.lineTo(width * cellSize, y * cellSize + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

// 辅助渲染：真实 LED 灯珠物理渲染模式
function renderLedMode(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number,
  pixels: string[],
  previewPoints: Point[],
  ledConfig: LedPreviewConfig,
  primaryColor: string,
  isRightClick: boolean
) {
  const { shape, gapRatio, glowIntensity, simulatePitchBlack } = ledConfig;
  const radius = (cellSize * (1 - gapRatio)) / 2;

  // 临时映射预览像素
  const pixelMap = [...pixels];
  if (previewPoints.length > 0) {
    const previewColor = isRightClick ? '#000000' : primaryColor;
    for (const pt of previewPoints) {
      if (pt.x >= 0 && pt.x < width && pt.y >= 0 && pt.y < height) {
        pixelMap[pt.y * width + pt.x] = previewColor;
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const hex = pixelMap[idx] || '#000000';
      const rgb = hexToRgb(hex);
      const isLit = rgb.r + rgb.g + rgb.b >= 12;

      const centerX = x * cellSize + cellSize / 2;
      const centerY = y * cellSize + cellSize / 2;

      if (!isLit) {
        // 未点亮灯珠暗纹底板
        if (simulatePitchBlack) {
          ctx.save();
          ctx.fillStyle = '#16161B';
          drawLedShape(ctx, shape, centerX, centerY, radius);
          ctx.fill();
          ctx.restore();
        }
      } else {
        // 点亮灯珠与光晕模拟
        ctx.save();
        if (glowIntensity > 0) {
          ctx.shadowColor = hex;
          ctx.shadowBlur = cellSize * glowIntensity * 0.85;
        }

        ctx.fillStyle = hex;
        drawLedShape(ctx, shape, centerX, centerY, radius);
        ctx.fill();

        // 芯片中心高光小白点
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }
}

function drawLedShape(
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
