import React, { useState } from 'react';
import { useMatrixStore } from '../../store/useMatrixStore';
import {
  generateScrollEffect,
  generateBreathingEffect,
  generateBlinkEffect,
  generateRainbowWaveEffect,
  generateLaserWipeEffect,
  generateTextMatrixFrames,
} from '../../utils/effectGenerators';
import {
  Sparkles,
  MoveRight,
  SunMedium,
  Zap,
  Rainbow,
  Scan,
  Type,
  PlayCircle,
  PlusCircle,
} from 'lucide-react';
import {
  ScrollDirection,
  RainbowDirection,
  LaserWipeMode,
  EffectType,
  Frame,
} from '../../types/matrix';

export const EffectsWorkshop: React.FC = () => {
  const {
    width,
    height,
    fps,
    frames,
    currentFrameIndex,
    replaceFrames,
    commitSnapshot,
  } = useMatrixStore();

  const currentFrame = frames[currentFrameIndex];
  const [selectedEffect, setSelectedEffect] = useState<EffectType>('scroll');
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');

  // 1. Scroll 跑马灯参数
  const [scrollDir, setScrollDir] = useState<ScrollDirection>('left');

  // 2. Breathing 呼吸灯参数
  const [breathFrames, setBreathFrames] = useState(16);
  const [breathMinBright, setBreathMinBright] = useState(0.2);

  // 3. Blink 闪烁参数
  const [blinkFrames, setBlinkFrames] = useState(8);
  const [blinkInvert, setBlinkInvert] = useState(false);

  // 4. Rainbow 彩虹参数
  const [rainbowFrames, setRainbowFrames] = useState(16);
  const [rainbowDir, setRainbowDir] = useState<RainbowDirection>('diagonal');

  // 5. Laser Wipe 激光扫描参数
  const [laserFrames, setLaserFrames] = useState(16);
  const [laserMode, setLaserMode] = useState<LaserWipeMode>('left-to-right');

  // 6. Text Matrix 文字参数
  const [textContent, setTextContent] = useState('PIXEL');
  const [textFontSize, setTextFontSize] = useState(Math.max(10, Math.floor(height * 0.75)));
  const [textColor, setTextColor] = useState('#00FF66');
  const [textAutoScroll, setTextAutoScroll] = useState(true);
  const [textScrollDir, setTextScrollDir] = useState<ScrollDirection>('left');

  const effectTabs = [
    { id: 'scroll' as EffectType, name: '跑马灯', icon: <MoveRight className="h-4 w-4" /> },
    { id: 'breathing' as EffectType, name: '呼吸灯', icon: <SunMedium className="h-4 w-4" /> },
    { id: 'blink' as EffectType, name: '频闪反色', icon: <Zap className="h-4 w-4" /> },
    { id: 'rainbow' as EffectType, name: '彩虹流光', icon: <Rainbow className="h-4 w-4" /> },
    { id: 'laser' as EffectType, name: '激光扫描', icon: <Scan className="h-4 w-4" /> },
    { id: 'text' as EffectType, name: '文字点阵', icon: <Type className="h-4 w-4" /> },
  ];

  const handleGenerate = () => {
    if (!currentFrame) return;
    const basePixels = currentFrame.pixels;
    let generated: Frame[] = [];

    switch (selectedEffect) {
      case 'scroll':
        generated = generateScrollEffect(basePixels, width, height, scrollDir, fps);
        break;
      case 'breathing':
        generated = generateBreathingEffect(basePixels, width, height, breathFrames, breathMinBright, fps);
        break;
      case 'blink':
        generated = generateBlinkEffect(basePixels, width, height, blinkFrames, blinkInvert, fps);
        break;
      case 'rainbow':
        generated = generateRainbowWaveEffect(basePixels, width, height, rainbowFrames, rainbowDir, fps);
        break;
      case 'laser':
        generated = generateLaserWipeEffect(basePixels, width, height, laserFrames, laserMode, fps);
        break;
      case 'text':
        generated = generateTextMatrixFrames(
          textContent,
          textFontSize,
          textColor,
          '#000000',
          width,
          height,
          textAutoScroll,
          textScrollDir,
          fps
        );
        break;
    }

    if (generated.length === 0) return;

    if (applyMode === 'replace') {
      replaceFrames(generated);
    } else {
      commitSnapshot();
      useMatrixStore.setState((state) => ({
        frames: [...state.frames, ...generated],
        isPlaying: true,
      }));
    }
  };

  return (
    <div className="flex flex-col space-y-4 p-4 text-xs text-gray-200">
      <div className="flex items-center space-x-2 border-b border-[#2E2E3A] pb-3">
        <Sparkles className="h-4 w-4 text-[#6366F1]" />
        <span className="font-semibold text-white text-sm">参数化动效生成器</span>
      </div>

      {/* 动效类型小卡片网格选择 */}
      <div className="grid grid-cols-3 gap-1.5">
        {effectTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedEffect(tab.id)}
            className={`flex flex-col items-center justify-center space-y-1 rounded-lg border p-2 transition ${
              selectedEffect === tab.id
                ? 'border-[#6366F1] bg-[#6366F1]/15 text-white shadow-sm'
                : 'border-[#2E2E3A] bg-[#18181F] text-gray-400 hover:bg-[#1E1E26] hover:text-gray-200'
            }`}
          >
            {tab.icon}
            <span className="text-[11px] font-medium">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* 动态参数调节区 */}
      <div className="rounded-xl border border-[#2E2E3A] bg-[#18181F] p-3.5 space-y-3.5">
        {/* 1. 跑马灯 */}
        {selectedEffect === 'scroll' && (
          <div className="space-y-3">
            <label className="text-gray-400 font-medium">滚动方向</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['left', 'right', 'up', 'down'] as ScrollDirection[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setScrollDir(d)}
                  className={`rounded border p-1.5 uppercase font-mono text-[11px] transition ${
                    scrollDir === d
                      ? 'border-[#6366F1] bg-[#6366F1] text-white'
                      : 'border-[#2E2E3A] bg-[#121216] text-gray-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              根据画布宽/高自动计算无缝平移循环序列（当前尺寸共将生成 {scrollDir === 'left' || scrollDir === 'right' ? width : height} 帧）。
            </p>
          </div>
        )}

        {/* 2. 呼吸灯 */}
        {selectedEffect === 'breathing' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>动画帧数</span>
                <span className="font-mono text-white">{breathFrames} 帧</span>
              </div>
              <input
                type="range"
                min={8}
                max={24}
                step={2}
                value={breathFrames}
                onChange={(e) => setBreathFrames(parseInt(e.target.value, 10))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#2E2E3A] accent-[#6366F1]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>最低暗度</span>
                <span className="font-mono text-white">{Math.round(breathMinBright * 100)}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                value={Math.round(breathMinBright * 100)}
                onChange={(e) => setBreathMinBright(parseInt(e.target.value, 10) / 100)}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#2E2E3A] accent-[#6366F1]"
              />
            </div>
          </div>
        )}

        {/* 3. 频闪反色 */}
        {selectedEffect === 'blink' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>闪烁周期帧数</span>
                <span className="font-mono text-white">{blinkFrames} 帧</span>
              </div>
              <input
                type="range"
                min={4}
                max={16}
                step={2}
                value={blinkFrames}
                onChange={(e) => setBlinkFrames(parseInt(e.target.value, 10))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#2E2E3A] accent-[#6366F1]"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#2E2E3A] bg-[#121216] p-2.5">
              <div>
                <span className="font-medium text-white">反色模式</span>
                <p className="text-[10px] text-gray-400">奇数帧取反色而非熄灭</p>
              </div>
              <input
                type="checkbox"
                checked={blinkInvert}
                onChange={(e) => setBlinkInvert(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-gray-600 bg-[#2E2E3A] text-[#6366F1]"
              />
            </div>
          </div>
        )}

        {/* 4. 彩虹流光 */}
        {selectedEffect === 'rainbow' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>流光帧数</span>
                <span className="font-mono text-white">{rainbowFrames} 帧</span>
              </div>
              <input
                type="range"
                min={8}
                max={24}
                step={2}
                value={rainbowFrames}
                onChange={(e) => setRainbowFrames(parseInt(e.target.value, 10))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#2E2E3A] accent-[#6366F1]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 font-medium">流动方向</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setRainbowDir('horizontal')}
                  className={`rounded border p-1.5 text-[11px] transition ${
                    rainbowDir === 'horizontal'
                      ? 'border-[#6366F1] bg-[#6366F1] text-white'
                      : 'border-[#2E2E3A] bg-[#121216] text-gray-400'
                  }`}
                >
                  水平流光
                </button>
                <button
                  onClick={() => setRainbowDir('diagonal')}
                  className={`rounded border p-1.5 text-[11px] transition ${
                    rainbowDir === 'diagonal'
                      ? 'border-[#6366F1] bg-[#6366F1] text-white'
                      : 'border-[#2E2E3A] bg-[#121216] text-gray-400'
                  }`}
                >
                  45° 对角线
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. 激光扫描 */}
        {selectedEffect === 'laser' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>扫描总帧数</span>
                <span className="font-mono text-white">{laserFrames} 帧</span>
              </div>
              <input
                type="range"
                min={8}
                max={24}
                value={laserFrames}
                onChange={(e) => setLaserFrames(parseInt(e.target.value, 10))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#2E2E3A] accent-[#6366F1]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 font-medium">展开模式</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLaserMode('left-to-right')}
                  className={`rounded border p-1.5 text-[11px] transition ${
                    laserMode === 'left-to-right'
                      ? 'border-[#6366F1] bg-[#6366F1] text-white'
                      : 'border-[#2E2E3A] bg-[#121216] text-gray-400'
                  }`}
                >
                  从左到右
                </button>
                <button
                  onClick={() => setLaserMode('center-out')}
                  className={`rounded border p-1.5 text-[11px] transition ${
                    laserMode === 'center-out'
                      ? 'border-[#6366F1] bg-[#6366F1] text-white'
                      : 'border-[#2E2E3A] bg-[#121216] text-gray-400'
                  }`}
                >
                  中心向四周
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. 文字转点阵 */}
        {selectedEffect === 'text' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-gray-400 font-medium">文本内容</label>
              <input
                type="text"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="输入中英文文本..."
                className="w-full rounded border border-[#2E2E3A] bg-[#121216] px-2.5 py-1.5 text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>字号 (px)</span>
                  <span className="font-mono text-white">{textFontSize}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={Math.max(16, height * 1.5)}
                  value={textFontSize}
                  onChange={(e) => setTextFontSize(parseInt(e.target.value, 10))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#2E2E3A] accent-[#6366F1]"
                />
              </div>

              <div className="space-y-1">
                <span className="text-gray-400 block">文字颜色</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="h-7 w-10 cursor-pointer rounded border border-[#2E2E3A] bg-transparent"
                  />
                  <span className="font-mono text-[11px] text-gray-300">{textColor}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#2E2E3A] bg-[#121216] p-2">
              <span className="text-white">自动生成跑马灯动画</span>
              <input
                type="checkbox"
                checked={textAutoScroll}
                onChange={(e) => setTextAutoScroll(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-gray-600 bg-[#2E2E3A] text-[#6366F1]"
              />
            </div>

            {textAutoScroll && (
              <div className="space-y-1">
                <label className="text-gray-400">滚动方向</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['left', 'up'] as ScrollDirection[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setTextScrollDir(d)}
                      className={`rounded border p-1 text-[11px] uppercase font-mono ${
                        textScrollDir === d
                          ? 'border-[#6366F1] bg-[#6366F1] text-white'
                          : 'border-[#2E2E3A] bg-[#121216] text-gray-400'
                      }`}
                    >
                      {d === 'left' ? '横向向左' : '纵向向上'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 注入模式选择：覆盖 vs 追加 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setApplyMode('replace')}
          className={`flex-1 flex items-center justify-center space-x-1.5 rounded-lg border py-2 transition ${
            applyMode === 'replace'
              ? 'border-[#6366F1] bg-[#6366F1]/15 text-white font-medium'
              : 'border-[#2E2E3A] bg-[#18181F] text-gray-400 hover:text-gray-200'
          }`}
        >
          <PlayCircle className="h-3.5 w-3.5" />
          <span>覆盖全部帧</span>
        </button>
        <button
          onClick={() => setApplyMode('append')}
          className={`flex-1 flex items-center justify-center space-x-1.5 rounded-lg border py-2 transition ${
            applyMode === 'append'
              ? 'border-[#6366F1] bg-[#6366F1]/15 text-white font-medium'
              : 'border-[#2E2E3A] bg-[#18181F] text-gray-400 hover:text-gray-200'
          }`}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>追加到末尾</span>
        </button>
      </div>

      {/* 一键生成按钮 */}
      <button
        onClick={handleGenerate}
        className="flex h-10 w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] font-semibold text-white shadow-lg transition hover:from-[#4F46E5] hover:to-[#7C3AED] active:scale-98"
      >
        <Sparkles className="h-4 w-4" />
        <span>一键生成动效并预览</span>
      </button>
    </div>
  );
};
