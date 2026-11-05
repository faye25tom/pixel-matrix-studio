import React from 'react';
import { useMatrixStore } from '../store/useMatrixStore';
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Minus,
  Square,
  Image as ImageIcon,
} from 'lucide-react';
import { DrawTool } from '../types/matrix';

interface LeftToolPanelProps {
  onOpenImport?: () => void;
}

export const LeftToolPanel: React.FC<LeftToolPanelProps> = ({ onOpenImport }) => {
  const {
    activeTool,
    setActiveTool,
    primaryColor,
    setPrimaryColor,
    recentColors,
  } = useMatrixStore();

  const tools: Array<{ id: DrawTool; label: string; icon: React.ReactNode; shortcut: string }> = [
    { id: 'pencil', label: '画笔', icon: <Pencil className="h-4 w-4" />, shortcut: 'B' },
    { id: 'eraser', label: '橡皮擦', icon: <Eraser className="h-4 w-4" />, shortcut: 'E' },
    { id: 'bucket', label: '油漆桶填充', icon: <PaintBucket className="h-4 w-4" />, shortcut: 'G' },
    { id: 'eyedropper', label: '吸管取色', icon: <Pipette className="h-4 w-4" />, shortcut: 'I' },
    { id: 'line', label: '直线工具', icon: <Minus className="h-4 w-4" />, shortcut: 'L' },
    { id: 'rect', label: '矩形工具', icon: <Square className="h-4 w-4" />, shortcut: 'R' },
  ];

  // 经典 LED 屏高对比高亮调色板
  const ledPresetPalette = [
    '#FF0055', '#FF3300', '#FF9900', '#FFD700',
    '#00FF66', '#00F0FF', '#0066FF', '#7F00FF',
    '#FF00D4', '#FFFFFF', '#8E8E9E', '#000000',
    '#FF5252', '#69F0AE', '#40C4FF', '#E040FB',
  ];

  return (
    <aside className="flex h-full w-16 flex-col items-center justify-between border-r border-[#2E2E3A] bg-[#121216] py-3">
      {/* 绘图工具组 */}
      <div className="flex flex-col items-center space-y-1.5">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition ${
              activeTool === t.id
                ? 'bg-[#6366F1] text-white shadow-md'
                : 'text-gray-400 hover:bg-[#1E1E26] hover:text-gray-200'
            }`}
          >
            {t.icon}
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-12 z-50 whitespace-nowrap rounded bg-[#1E1E26] px-2 py-1 text-xs text-white opacity-0 shadow border border-[#2E2E3A] transition group-hover:opacity-100">
              {t.label} ({t.shortcut})
            </span>
          </button>
        ))}

        <div className="my-2 h-px w-8 bg-[#2E2E3A]" />

        {/* 当前颜色大方块 & 原生色盘 */}
        <div className="relative group">
          <div
            className="h-9 w-9 rounded-lg border-2 border-white/20 shadow-inner cursor-pointer transition transform hover:scale-105"
            style={{ backgroundColor: primaryColor }}
            title="点击更换颜色"
          />
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
          />
          <span className="pointer-events-none absolute left-12 top-1 z-50 whitespace-nowrap rounded bg-[#1E1E26] px-2 py-1 text-xs font-mono text-white opacity-0 shadow border border-[#2E2E3A] transition group-hover:opacity-100">
            {primaryColor}
          </span>
        </div>
      </div>

      {/* 调色板与最近颜色 */}
      <div className="flex flex-col items-center space-y-3">
        {/* 经典 LED 颜色小格子 */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#18181F] border border-[#2E2E3A]">
          {ledPresetPalette.slice(0, 8).map((color, idx) => (
            <button
              key={idx}
              onClick={() => setPrimaryColor(color)}
              title={color}
              className={`h-4 w-4 rounded-sm border transition ${
                primaryColor.toUpperCase() === color.toUpperCase()
                  ? 'border-white scale-110 shadow'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* 最近使用颜色小圆点 */}
        {recentColors.length > 0 && (
          <div className="flex flex-col items-center space-y-1">
            <span className="text-[10px] text-gray-500 font-mono">REC</span>
            <div className="flex flex-col space-y-1">
              {recentColors.slice(0, 4).map((c, i) => (
                <button
                  key={i}
                  onClick={() => setPrimaryColor(c)}
                  className="h-3 w-3 rounded-full border border-black/40 hover:scale-125 transition"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        )}

        {/* 底部快捷导入图标 */}
        {onOpenImport && (
          <button
            onClick={onOpenImport}
            title="导入图片/GIF"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2E2E3A] text-gray-400 hover:bg-[#1E1E26] hover:text-white transition"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
