import React, { useState, useEffect, useRef } from 'react';
import { useMatrixStore } from '../store/useMatrixStore';
import {
  Undo2,
  Redo2,
  Trash2,
  Upload,
  Download,
  Save,
  FolderOpen,
} from 'lucide-react';
import { ColorFormat } from '../types/matrix';
import { exportProjectJson, parseImportedJson } from '../utils/projectJsonUtils';

interface TopToolbarProps {
  onOpenImport?: () => void;
  onOpenExport?: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  onOpenImport,
  onOpenExport,
}) => {
  const {
    width,
    height,
    fps,
    frames,
    colorFormat,
    ledConfig,
    setDimensions,
    setColorFormat,
    undo,
    redo,
    canUndo,
    canRedo,
    clearCurrentFrame,
    loadProject,
  } = useMatrixStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputW, setInputW] = useState(width.toString());
  const [inputH, setInputH] = useState(height.toString());

  useEffect(() => {
    setInputW(width.toString());
    setInputH(height.toString());
  }, [width, height]);

  const handleApplyDimensions = () => {
    const parsedW = parseInt(inputW, 10);
    const parsedH = parseInt(inputH, 10);
    if (!isNaN(parsedW) && !isNaN(parsedH)) {
      setDimensions(parsedW, parsedH, 'crop');
    } else {
      setInputW(width.toString());
      setInputH(height.toString());
    }
  };

  // 一键快速保存可编辑工程文件
  const handleQuickSaveProject = () => {
    exportProjectJson(
      'pixel_matrix_art',
      width,
      height,
      colorFormat,
      fps,
      frames,
      ledConfig
    );
  };

  // 打开并加载 JSON 工程文件
  const handleOpenFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const project = parseImportedJson(content);
        loadProject(project);
        alert(`已成功打开工程: ${project.projectName || '点阵项目'} (${project.width}×${project.height}, 共 ${project.frames.length} 帧)`);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : '打开项目文件失败');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const presetSizes = [
    { label: '8×8', w: 8, h: 8 },
    { label: '16×16', w: 16, h: 16 },
    { label: '32×16', w: 32, h: 16 },
    { label: '32×32', w: 32, h: 32 },
    { label: '64×64', w: 64, h: 64 },
  ];

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-[#2E2E3A] bg-[#121216] px-4">
      {/* 隐藏的文件输入框用于打开工程文件 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleOpenFileSelect}
        className="hidden"
      />

      {/* 左侧：Logo 与 尺寸调节 */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366F1] to-[#EC4899] font-black text-white text-xs shadow-md">
            PM
          </div>
          <span className="font-bold tracking-tight text-white text-sm hidden sm:inline">
            PixelMatrix <span className="text-[#6366F1]">Studio</span>
          </span>
        </div>

        <div className="h-4 w-px bg-[#2E2E3A]" />

        {/* 尺寸输入 */}
        <div className="flex items-center space-x-1.5 text-xs">
          <div className="flex items-center space-x-1 rounded-md border border-[#2E2E3A] bg-[#18181F] px-2 py-1">
            <span className="text-gray-400">W:</span>
            <input
              type="number"
              min={1}
              max={64}
              value={inputW}
              onChange={(e) => setInputW(e.target.value)}
              onBlur={handleApplyDimensions}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyDimensions()}
              className="w-8 bg-transparent text-center font-mono text-white focus:outline-none"
            />
            <span className="text-gray-500">×</span>
            <span className="text-gray-400">H:</span>
            <input
              type="number"
              min={1}
              max={64}
              value={inputH}
              onChange={(e) => setInputH(e.target.value)}
              onBlur={handleApplyDimensions}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyDimensions()}
              className="w-8 bg-transparent text-center font-mono text-white focus:outline-none"
            />
          </div>

          {/* 预设尺寸按钮组 */}
          <div className="hidden lg:flex items-center space-x-1">
            {presetSizes.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setDimensions(preset.w, preset.h, 'crop')}
                className={`rounded px-2 py-1 font-mono text-xs transition ${
                  width === preset.w && height === preset.h
                    ? 'bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/40'
                    : 'text-gray-400 hover:bg-[#1E1E26] hover:text-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 中间：色彩模式与历史撤销重做 */}
      <div className="flex items-center space-x-3">
        {/* 色彩模式切换 */}
        <div className="flex items-center rounded-lg border border-[#2E2E3A] bg-[#18181F] p-0.5 text-xs">
          {(['RGB888', 'RGB565'] as ColorFormat[]).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setColorFormat(fmt)}
              className={`rounded px-2 py-1 font-semibold transition ${
                colorFormat === fmt
                  ? 'bg-[#2E2E3A] text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title={fmt === 'RGB565' ? '16位嵌入式常用色彩（色阶模拟）' : '24位全彩模式'}
            >
              {fmt}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-[#2E2E3A]" />

        {/* 撤销 / 重做 */}
        <div className="flex items-center space-x-1">
          <button
            onClick={undo}
            disabled={!canUndo()}
            title="撤销 (Ctrl+Z)"
            className="rounded p-1.5 text-gray-300 transition hover:bg-[#1E1E26] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            title="重做 (Ctrl+Y)"
            className="rounded p-1.5 text-gray-300 transition hover:bg-[#1E1E26] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        {/* 清空当前帧 */}
        <button
          onClick={() => {
            if (window.confirm('确定要清空当前帧吗？')) {
              clearCurrentFrame();
            }
          }}
          title="清空当前帧"
          className="rounded p-1.5 text-rose-400 transition hover:bg-rose-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* 右侧：工程保存/打开、导入与导出 */}
      <div className="flex items-center space-x-2">
        {/* 打开已有工程文件 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="打开已有工程项目 JSON 文件"
          className="flex items-center space-x-1.5 rounded-lg border border-[#2E2E3A] bg-[#18181F] px-2.5 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-[#252530] hover:text-white"
        >
          <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">打开工程</span>
        </button>

        {/* 快速保存工程文件 */}
        <button
          onClick={handleQuickSaveProject}
          title="保存为下次可继续编辑的工程 JSON 文件"
          className="flex items-center space-x-1.5 rounded-lg border border-[#2E2E3A] bg-[#18181F] px-2.5 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-[#252530] hover:text-white"
        >
          <Save className="h-3.5 w-3.5 text-emerald-400" />
          <span className="hidden sm:inline">保存工程</span>
        </button>

        <div className="h-4 w-px bg-[#2E2E3A]" />

        {/* 导入媒体 (支持图片/GIF/JSON) */}
        <button
          onClick={onOpenImport}
          className="flex items-center space-x-1.5 rounded-lg border border-[#2E2E3A] bg-[#18181F] px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-[#252530] hover:text-white"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>导入媒体</span>
        </button>

        {/* 导出弹窗 */}
        <button
          onClick={onOpenExport}
          className="flex items-center space-x-1.5 rounded-lg bg-[#6366F1] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4F46E5] active:scale-95"
        >
          <Download className="h-3.5 w-3.5" />
          <span>导出方案 / 媒体</span>
        </button>
      </div>
    </header>
  );
};

