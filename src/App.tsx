import React, { useState, useEffect } from 'react';
import { TopToolbar } from './components/TopToolbar';
import { LeftToolPanel } from './components/LeftToolPanel';
import { MatrixCanvas } from './components/MatrixCanvas';
import { BottomTimeline } from './components/BottomTimeline';
import { LedPreviewControls } from './components/RightPanel/LedPreviewControls';
import { EffectsWorkshop } from './components/RightPanel/EffectsWorkshop';
import { AiPromptWorkshop } from './components/RightPanel/AiPromptWorkshop';
import { ImportMediaModal } from './components/Modals/ImportMediaModal';
import { ExportModal } from './components/Modals/ExportModal';
import { useMatrixStore } from './store/useMatrixStore';
import { Sparkles, Wand2, Cpu } from 'lucide-react';

export const App: React.FC = () => {
  const { undo, redo, togglePlayback, setActiveTool } = useMatrixStore();

  const [activeRightTab, setActiveRightTab] = useState<'led' | 'effects' | 'ai'>('led');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // 全局快捷键绑定
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果弹窗打开或在输入框中，不触发单键快捷键
      if (
        isImportOpen ||
        isExportOpen ||
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          redo();
        }
        return;
      }

      // 常用工具快捷键
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlayback();
          break;
        case 'b':
          setActiveTool('pencil');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'g':
          setActiveTool('bucket');
          break;
        case 'i':
          setActiveTool('eyedropper');
          break;
        case 'l':
          setActiveTool('line');
          break;
        case 'r':
          setActiveTool('rect');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, togglePlayback, setActiveTool, isImportOpen, isExportOpen]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0A0A0C] text-gray-100 antialiased font-sans">
      {/* 顶部工具栏 */}
      <TopToolbar
        onOpenImport={() => setIsImportOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* 中部核心工作台布局 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧工具栏 */}
        <LeftToolPanel onOpenImport={() => setIsImportOpen(true)} />

        {/* 中央点阵画布 */}
        <main className="relative flex-1 overflow-hidden bg-[#0A0A0C]">
          <MatrixCanvas />
        </main>

        {/* 右侧工作台面板 */}
        <aside className="flex w-84 min-w-[320px] max-w-[360px] flex-col border-l border-[#2E2E3A] bg-[#121216]">
          {/* 右侧三合一导航 Tabs */}
          <div className="flex border-b border-[#2E2E3A] bg-[#18181F] text-xs">
            <button
              onClick={() => setActiveRightTab('led')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-3 font-medium transition ${
                activeRightTab === 'led'
                  ? 'border-b-2 border-[#6366F1] bg-[#1E1E26] text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>灯珠仿真</span>
            </button>
            <button
              onClick={() => setActiveRightTab('effects')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-3 font-medium transition ${
                activeRightTab === 'effects'
                  ? 'border-b-2 border-[#6366F1] bg-[#1E1E26] text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>动效工坊</span>
            </button>
            <button
              onClick={() => setActiveRightTab('ai')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-3 font-medium transition ${
                activeRightTab === 'ai'
                  ? 'border-b-2 border-[#6366F1] bg-[#1E1E26] text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI 工坊</span>
            </button>
          </div>

          {/* 右侧面板内容容器 */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2E2E3A]">
            {activeRightTab === 'led' && <LedPreviewControls />}
            {activeRightTab === 'effects' && <EffectsWorkshop />}
            {activeRightTab === 'ai' && <AiPromptWorkshop />}
          </div>
        </aside>
      </div>

      {/* 底部多帧时间轴 */}
      <BottomTimeline />

      {/* 导入外部图片与 GIF 弹窗 */}
      <ImportMediaModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      {/* 方案交付与通用媒体导出弹窗 */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};

export default App;
