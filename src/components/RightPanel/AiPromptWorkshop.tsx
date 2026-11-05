import React, { useState } from 'react';
import { useMatrixStore } from '../../store/useMatrixStore';
import {
  DEFAULT_AI_CONFIG,
  generateSingleFrameFromPrompt,
  generateAnimationFromPrompt,
  modifyCurrentFrameWithPrompt,
} from '../../utils/llmClient';
import { AiWorkshopConfig, Frame } from '../../types/matrix';
import {
  Bot,
  Settings,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Wand2,
  Film,
  Key,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';

const STORAGE_KEY = 'pixel_matrix_ai_config';

export const AiPromptWorkshop: React.FC = () => {
  const { width, height, frames, currentFrameIndex, replaceFrames } = useMatrixStore();
  const currentFrame = frames[currentFrameIndex];

  // 配置状态
  const [config, setConfig] = useState<AiWorkshopConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // 容错读取
    }
    return DEFAULT_AI_CONFIG;
  });

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  // 创作模式
  const [mode, setMode] = useState<'single' | 'animation' | 'modify'>('single');
  const [promptText, setPromptText] = useState('');
  const [animFrames, setAnimFrames] = useState(4);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 灵感词库
  const inspirationTags = [
    '跳动爱心脉冲',
    '赛博朋克霓虹笑脸',
    '跳跃的经典吃豆人',
    '舞动的像素火焰',
    '招财猫挥手',
    '8位元像素小火箭升空',
    '闪烁的赛博眼球',
    '像素超级马里奥蘑菇',
  ];

  const handleSaveConfig = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 2000);
  };

  const applyPreset = (preset: { baseUrl: string; modelName: string }) => {
    setConfig((prev) => ({
      ...prev,
      baseUrl: preset.baseUrl,
      modelName: preset.modelName,
    }));
  };

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      setErrorMessage('请输入提示词描述');
      return;
    }
    if (!config.baseUrl) {
      setErrorMessage('请先展开 API 设置填写 Base URL');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      let resultFrames: Frame[] = [];

      if (mode === 'single') {
        resultFrames = await generateSingleFrameFromPrompt(promptText, width, height, config);
      } else if (mode === 'animation') {
        resultFrames = await generateAnimationFromPrompt(promptText, animFrames, width, height, config);
      } else if (mode === 'modify') {
        if (!currentFrame) throw new Error('当前画布没有可用帧');
        resultFrames = await modifyCurrentFrameWithPrompt(
          currentFrame.pixels,
          promptText,
          width,
          height,
          config
        );
      }

      if (resultFrames.length > 0) {
        replaceFrames(resultFrames);
      }
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : '大模型生成失败';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = '网络或跨域(CORS)错误：请检查目标 API 是否允许浏览器直连，或使用支持前端跨域的中转地址。';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 p-4 text-xs text-gray-200">
      {/* 标题与设置折叠按钮 */}
      <div className="flex items-center justify-between border-b border-[#2E2E3A] pb-3">
        <div className="flex items-center space-x-2">
          <Bot className="h-4 w-4 text-[#6366F1]" />
          <span className="font-semibold text-white text-sm">AI 大模型提示词工坊</span>
        </div>
        <button
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`flex items-center space-x-1 rounded px-2 py-1 transition ${
            isConfigOpen ? 'bg-[#2E2E3A] text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>{isConfigOpen ? '收起配置' : 'API 设置'}</span>
          {isConfigOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* 可折叠的 API 配置面板 */}
      {isConfigOpen && (
        <div className="rounded-xl border border-[#2E2E3A] bg-[#18181F] p-3.5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-medium text-white flex items-center space-x-1">
              <Key className="h-3.5 w-3.5 text-[#6366F1]" />
              <span>OpenAI 兼容接口配置</span>
            </span>
            {isSavedSuccess && (
              <span className="flex items-center space-x-1 text-emerald-400 text-[11px]">
                <Check className="h-3 w-3" />
                <span>已保存到本地</span>
              </span>
            )}
          </div>

          {/* 快捷模板填充 */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() =>
                applyPreset({
                  baseUrl: 'https://api.deepseek.com/v1',
                  modelName: 'deepseek-chat',
                })
              }
              className="rounded bg-[#121216] px-2 py-1 text-[10px] text-gray-300 hover:text-white border border-[#2E2E3A]"
            >
              DeepSeek
            </button>
            <button
              onClick={() =>
                applyPreset({
                  baseUrl: 'https://api.openai.com/v1',
                  modelName: 'gpt-4o-mini',
                })
              }
              className="rounded bg-[#121216] px-2 py-1 text-[10px] text-gray-300 hover:text-white border border-[#2E2E3A]"
            >
              OpenAI
            </button>
            <button
              onClick={() =>
                applyPreset({
                  baseUrl: 'https://api.siliconflow.cn/v1',
                  modelName: 'deepseek-ai/DeepSeek-V3',
                })
              }
              className="rounded bg-[#121216] px-2 py-1 text-[10px] text-gray-300 hover:text-white border border-[#2E2E3A]"
            >
              硅基流动
            </button>
            <button
              onClick={() =>
                applyPreset({
                  baseUrl: 'http://localhost:11434/v1',
                  modelName: 'qwen2.5-coder:7b',
                })
              }
              className="rounded bg-[#121216] px-2 py-1 text-[10px] text-gray-300 hover:text-white border border-[#2E2E3A]"
            >
              Ollama 本地
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-gray-400">Base URL</label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full rounded border border-[#2E2E3A] bg-[#121216] px-2.5 py-1.5 text-white focus:border-[#6366F1] focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-gray-400">API Key</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full rounded border border-[#2E2E3A] bg-[#121216] px-2.5 py-1.5 text-white focus:border-[#6366F1] focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-gray-400">Model Name</label>
              <input
                type="text"
                value={config.modelName}
                onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                placeholder="gpt-4o-mini"
                className="w-full rounded border border-[#2E2E3A] bg-[#121216] px-2 py-1 text-white focus:border-[#6366F1] focus:outline-none font-mono text-[11px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-gray-400">Temperature</label>
              <input
                type="number"
                step={0.1}
                min={0}
                max={1}
                value={config.temperature}
                onChange={(e) =>
                  setConfig({ ...config, temperature: parseFloat(e.target.value) || 0.4 })
                }
                className="w-full rounded border border-[#2E2E3A] bg-[#121216] px-2 py-1 text-white focus:border-[#6366F1] focus:outline-none font-mono text-[11px]"
              />
            </div>
          </div>

          <button
            onClick={handleSaveConfig}
            className="w-full rounded bg-[#2E2E3A] py-1.5 font-medium text-white hover:bg-[#3E3E4E] transition"
          >
            保存 API 配置
          </button>
        </div>
      )}

      {/* 创作模式切换 */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => setMode('single')}
          className={`flex flex-col items-center justify-center space-y-1 rounded-lg border p-2 transition ${
            mode === 'single'
              ? 'border-[#6366F1] bg-[#6366F1]/15 text-white'
              : 'border-[#2E2E3A] bg-[#18181F] text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span className="font-medium text-[11px]">文生单帧</span>
        </button>
        <button
          onClick={() => setMode('animation')}
          className={`flex flex-col items-center justify-center space-y-1 rounded-lg border p-2 transition ${
            mode === 'animation'
              ? 'border-[#6366F1] bg-[#6366F1]/15 text-white'
              : 'border-[#2E2E3A] bg-[#18181F] text-gray-400 hover:text-white'
          }`}
        >
          <Film className="h-4 w-4" />
          <span className="font-medium text-[11px]">连贯动画</span>
        </button>
        <button
          onClick={() => setMode('modify')}
          className={`flex flex-col items-center justify-center space-y-1 rounded-lg border p-2 transition ${
            mode === 'modify'
              ? 'border-[#6366F1] bg-[#6366F1]/15 text-white'
              : 'border-[#2E2E3A] bg-[#18181F] text-gray-400 hover:text-white'
          }`}
        >
          <Wand2 className="h-4 w-4" />
          <span className="font-medium text-[11px]">局部修改</span>
        </button>
      </div>

      {/* 动画帧数调节（多帧模式下） */}
      {mode === 'animation' && (
        <div className="rounded-lg border border-[#2E2E3A] bg-[#18181F] p-3 space-y-1">
          <div className="flex justify-between text-gray-400">
            <span>生成动画循环帧数</span>
            <span className="font-mono text-white font-medium">{animFrames} 帧</span>
          </div>
          <input
            type="range"
            min={2}
            max={8}
            value={animFrames}
            onChange={(e) => setAnimFrames(parseInt(e.target.value, 10))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded bg-[#2E2E3A] accent-[#6366F1]"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
            <span>极速 (2帧)</span>
            <span>平滑 (8帧)</span>
          </div>
        </div>
      )}

      {/* 提示词输入框 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-gray-400 font-medium">
            {mode === 'modify' ? '修改指令' : '点阵画面描述'}
          </label>
          <span className="text-[10px] text-gray-500 font-mono">
            匹配尺寸: {width} × {height}
          </span>
        </div>
        <textarea
          rows={3}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder={
            mode === 'modify'
              ? '例如：把背景改成星空深蓝，为角色戴上一顶黄色王冠...'
              : '例如：一只戴墨镜的赛博朋克像素猫，荧光粉与青绿配色...'
          }
          className="w-full resize-none rounded-xl border border-[#2E2E3A] bg-[#18181F] p-3 text-white placeholder-gray-500 focus:border-[#6366F1] focus:outline-none"
        />
      </div>

      {/* 灵感词快捷标签 */}
      <div className="space-y-1.5">
        <span className="text-gray-500 text-[10px]">快捷灵感词：</span>
        <div className="flex flex-wrap gap-1.5">
          {inspirationTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setPromptText(tag)}
              className="rounded-full border border-[#2E2E3A] bg-[#18181F] px-2.5 py-0.5 text-[10px] text-gray-400 hover:border-[#6366F1] hover:text-white transition"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 错误提示 */}
      {errorMessage && (
        <div className="flex items-start space-x-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-400 leading-normal">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 协议与容错说明 */}
      <div className="rounded-lg border border-[#2E2E3A]/60 bg-[#121216] p-2.5 text-[10px] text-gray-500 leading-relaxed">
        ⚡ <strong>紧凑调色板字符协议：</strong>已内置自适应行高补齐与截断解析引擎，无论小模型在 {width}×{height} 下多写或少写字符，画面 100% 不错位崩溃。
      </div>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex h-10 w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-98 disabled:opacity-40"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>AI 正在绘制点阵中...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            <span>立即让 AI 创作点阵</span>
          </>
        )}
      </button>
    </div>
  );
};
