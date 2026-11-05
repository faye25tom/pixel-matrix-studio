import React from 'react';
import { useMatrixStore } from '../../store/useMatrixStore';
import { Sparkles, Circle, Square, RotateCcw } from 'lucide-react';
import { LedShape } from '../../types/matrix';

export const LedPreviewControls: React.FC = () => {
  const { ledConfig, setLedConfig } = useMatrixStore();

  const handleShapeChange = (shape: LedShape) => {
    setLedConfig({ shape });
  };

  const handleReset = () => {
    setLedConfig({
      shape: 'circle',
      gapRatio: 0.15,
      glowIntensity: 0.6,
      simulatePitchBlack: true,
    });
  };

  return (
    <div className="flex flex-col space-y-5 p-4 text-sm text-gray-200">
      <div className="flex items-center justify-between border-b border-[#2E2E3A] pb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-[#6366F1]" />
          <span className="font-semibold text-white">灯珠物理仿真参数</span>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition"
          title="重置为默认参数"
        >
          <RotateCcw className="h-3 w-3" />
          <span>重置</span>
        </button>
      </div>

      {/* 灯珠物理外形 */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-400">灯珠外形</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleShapeChange('circle')}
            className={`flex items-center justify-center space-x-2 rounded-lg border p-2.5 transition ${
              ledConfig.shape === 'circle'
                ? 'border-[#6366F1] bg-[#6366F1]/10 text-white shadow-sm'
                : 'border-[#2E2E3A] bg-[#18181F] text-gray-400 hover:bg-[#1E1E26]'
            }`}
          >
            <Circle className="h-4 w-4 fill-current" />
            <span className="text-xs">圆形灯珠</span>
          </button>
          <button
            onClick={() => handleShapeChange('square')}
            className={`flex items-center justify-center space-x-2 rounded-lg border p-2.5 transition ${
              ledConfig.shape === 'square'
                ? 'border-[#6366F1] bg-[#6366F1]/10 text-white shadow-sm'
                : 'border-[#2E2E3A] bg-[#18181F] text-gray-400 hover:bg-[#1E1E26]'
            }`}
          >
            <Square className="h-4 w-4 fill-current" />
            <span className="text-xs">方形矩阵</span>
          </button>
        </div>
      </div>

      {/* 灯珠间距 gapRatio */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">间距比例 (Gap)</span>
          <span className="font-mono text-white font-medium">
            {Math.round(ledConfig.gapRatio * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={40}
          value={Math.round(ledConfig.gapRatio * 100)}
          onChange={(e) => setLedConfig({ gapRatio: parseInt(e.target.value, 10) / 100 })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#2E2E3A] accent-[#6366F1]"
        />
        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
          <span>紧凑 (5%)</span>
          <span>宽松 (40%)</span>
        </div>
      </div>

      {/* 发光光晕 glowIntensity */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">发光光晕强度 (Glow)</span>
          <span className="font-mono text-white font-medium">
            {Math.round(ledConfig.glowIntensity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(ledConfig.glowIntensity * 100)}
          onChange={(e) => setLedConfig({ glowIntensity: parseInt(e.target.value, 10) / 100 })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#2E2E3A] accent-[#6366F1]"
        />
        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
          <span>无光晕 (0%)</span>
          <span>高饱和漫射 (100%)</span>
        </div>
      </div>

      {/* 黑色底板与熄灭灯珠暗纹 */}
      <div className="flex items-center justify-between rounded-lg border border-[#2E2E3A] bg-[#18181F] p-3">
        <div className="space-y-0.5">
          <span className="text-xs font-medium text-white">暗纹底板模拟</span>
          <p className="text-[11px] text-gray-400">
            还原未通电时 LED 硬件底板颗粒与轮廓
          </p>
        </div>
        <input
          type="checkbox"
          checked={ledConfig.simulatePitchBlack}
          onChange={(e) => setLedConfig({ simulatePitchBlack: e.target.checked })}
          className="h-4 w-4 rounded border-gray-600 bg-[#2E2E3A] text-[#6366F1] focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>

      {/* 硬件预览说明 */}
      <div className="rounded-lg border border-[#2E2E3A]/60 bg-[#121216] p-3 text-[11px] leading-relaxed text-gray-400">
        💡 <strong className="text-gray-300">效果提示：</strong>
        点击画布左上角的“LED 灯珠物理预览”即可切换为真实光晕硬件视觉，所有参数实时生效。
      </div>
    </div>
  );
};
