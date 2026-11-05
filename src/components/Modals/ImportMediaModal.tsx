import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMatrixStore } from '../../store/useMatrixStore';
import {
  decodeStaticImage,
  decodeGifImage,
  convertDecodedFramesToStudio,
  DecodedImageFrame,
  ScaleAlgorithm,
  QuantizeMode,
  DitherOptions,
} from '../../utils/ditherUtils';
import { parseImportedJson, ParsedProjectResult } from '../../utils/projectJsonUtils';
import {
  X,
  UploadCloud,
  FileImage,
  Play,
  Pause,
  Layers,
  Sliders,
  Check,
} from 'lucide-react';
import { Frame } from '../../types/matrix';

interface ImportMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportMediaModal: React.FC<ImportMediaModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { width, height, replaceFrames, commitSnapshot, loadProject } = useMatrixStore();

  const [, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isJsonFile, setIsJsonFile] = useState(false);
  const [parsedProjectData, setParsedProjectData] = useState<ParsedProjectResult | null>(null);
  const [decodedFrames, setDecodedFrames] = useState<DecodedImageFrame[]>([]);
  const [processedFrames, setProcessedFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 转换参数
  const [scaleAlgo, setScaleAlgo] = useState<ScaleAlgorithm>('nearest');
  const [quantizeMode, setQuantizeMode] = useState<QuantizeMode>('rgb888');
  const [ditherStrength, setDitherStrength] = useState(0.8);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [transparentColor, setTransparentColor] = useState('#000000');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  // 动态预览当前帧播放
  const [previewFrameIndex, setPreviewFrameIndex] = useState(0);
  const [isLivePreviewPlaying, setIsLivePreviewPlaying] = useState(true);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // 加载选中的文件
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMessage(null);
    setLoading(true);
    setIsJsonFile(false);
    setParsedProjectData(null);

    try {
      if (selectedFile.name.toLowerCase().endsWith('.json') || selectedFile.type === 'application/json') {
        const text = await selectedFile.text();
        const project = parseImportedJson(text);
        setIsJsonFile(true);
        setParsedProjectData(project);
        setProcessedFrames(project.frames);
        setDecodedFrames([]);
        setFilePreviewUrl(null);
        setPreviewFrameIndex(0);
        return;
      }

      const url = URL.createObjectURL(selectedFile);
      setFilePreviewUrl(url);

      const isGif = selectedFile.type === 'image/gif' || selectedFile.name.toLowerCase().endsWith('.gif');
      let decoded: DecodedImageFrame[] = [];

      if (isGif) {
        decoded = await decodeGifImage(selectedFile);
      } else {
        decoded = await decodeStaticImage(selectedFile);
      }

      setDecodedFrames(decoded);
      setPreviewFrameIndex(0);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : '解析文件失败');
    } finally {
      setLoading(false);
    }
  };

  // 重新计算像素化结果
  const recomputeDither = useCallback(() => {
    if (isJsonFile) return; // JSON 已经直接为点阵帧
    if (decodedFrames.length === 0) return;
    const options: DitherOptions = {
      targetWidth: width,
      targetHeight: height,
      scaleAlgorithm: scaleAlgo,
      quantizeMode,
      ditherStrength,
      brightness,
      contrast,
      transparentColor,
    };
    const frames = convertDecodedFramesToStudio(decodedFrames, options);
    setProcessedFrames(frames);
  }, [
    isJsonFile,
    decodedFrames,
    width,
    height,
    scaleAlgo,
    quantizeMode,
    ditherStrength,
    brightness,
    contrast,
    transparentColor,
  ]);

  useEffect(() => {
    recomputeDither();
  }, [recomputeDither]);

  // 预览 Canvas 播放时钟
  useEffect(() => {
    if (!isLivePreviewPlaying || processedFrames.length <= 1) return;

    const currentFrame = processedFrames[previewFrameIndex];
    const duration = currentFrame ? Math.max(30, currentFrame.durationMs) : 125;

    const timer = setTimeout(() => {
      setPreviewFrameIndex((prev) => (prev + 1) % processedFrames.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [isLivePreviewPlaying, previewFrameIndex, processedFrames]);

  // 绘制右侧当前像素预览
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = processedFrames[previewFrameIndex];
    if (!frame) {
      ctx.fillStyle = '#0A0A0C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const scale = Math.max(4, Math.floor(220 / Math.max(width, height)));
    canvas.width = width * scale;
    canvas.height = height * scale;

    ctx.fillStyle = '#0A0A0C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        ctx.fillStyle = frame.pixels[idx] || '#000000';
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }, [processedFrames, previewFrameIndex, width, height]);

  // 提交导入
  const handleConfirmImport = () => {
    if (processedFrames.length === 0) return;

    if (isJsonFile && parsedProjectData && importMode === 'replace') {
      loadProject(parsedProjectData);
      onClose();
      return;
    }

    if (importMode === 'replace') {
      replaceFrames(processedFrames);
    } else {
      commitSnapshot();
      useMatrixStore.setState((state) => ({
        frames: [...state.frames, ...processedFrames],
        isPlaying: true,
      }));
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="flex h-[90vh] max-h-[720px] w-full max-w-4xl flex-col rounded-2xl border border-[#2E2E3A] bg-[#121216] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#2E2E3A] px-6 bg-[#18181F]">
          <div className="flex items-center space-x-2.5">
            <Layers className="h-5 w-5 text-[#6366F1]" />
            <h2 className="text-base font-semibold text-white">
              外部图片与 GIF 动图像素化导入
            </h2>
            <span className="rounded bg-[#6366F1]/20 px-2 py-0.5 text-xs text-[#818CF8] font-mono">
              目标尺寸: {width} × {height}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-[#252530] hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 主体左右双栏 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧：文件上传与视觉对比 */}
          <div className="flex w-1/2 flex-col border-r border-[#2E2E3A] p-5 space-y-4 overflow-y-auto">
            {/* 上传拖拽区域 */}
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#2E2E3A] bg-[#18181F]/50 p-4 text-center cursor-pointer hover:border-[#6366F1] transition">
              <UploadCloud className="h-8 w-8 text-[#6366F1] mb-1" />
              <span className="text-xs font-semibold text-white">点击或拖拽上传图片 / GIF / JSON 工程文件</span>
              <span className="text-[11px] text-gray-400 mt-0.5">支持 PNG, JPG, WebP, GIF 动图及 .pixelproject.json / 方案商 JSON</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,.json,application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className="hidden"
              />
            </label>

            {errorMessage && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                {errorMessage}
              </div>
            )}

            {/* 原始图片 vs 点阵输出对照 */}
            <div className="grid grid-cols-2 gap-3 flex-1 min-h-[220px]">
              {/* 原图 / JSON 信息 */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#2E2E3A] bg-[#0A0A0C] p-2 relative overflow-hidden">
                <span className="absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-gray-400">
                  {isJsonFile ? 'JSON 数据源' : '原媒体'}
                </span>
                {isJsonFile && parsedProjectData ? (
                  <div className="flex flex-col items-center text-center p-3 text-xs space-y-1">
                    <FileImage className="h-8 w-8 text-emerald-400 mb-1" />
                    <span className="font-semibold text-white">{parsedProjectData.projectName || '点阵工程'}</span>
                    <span className="text-gray-400 text-[11px]">尺寸: {parsedProjectData.width} × {parsedProjectData.height}</span>
                    <span className="text-gray-400 text-[11px]">色彩模式: {parsedProjectData.colorFormat}</span>
                    <span className="text-gray-400 text-[11px]">帧率: {parsedProjectData.fps} FPS</span>
                    <span className="text-[#818CF8] font-mono text-[11px] mt-1">包含 {parsedProjectData.frames.length} 帧可编辑内容</span>
                  </div>
                ) : filePreviewUrl ? (
                  <img
                    src={filePreviewUrl}
                    alt="Original"
                    className="max-h-48 max-w-full object-contain rounded"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-600 text-xs">
                    <FileImage className="h-8 w-8 mb-1" />
                    <span>暂无上传</span>
                  </div>
                )}
                {decodedFrames.length > 0 && (
                  <span className="mt-2 text-[10px] font-mono text-gray-400">
                    原始: {decodedFrames[0].width}×{decodedFrames[0].height} | {decodedFrames.length} 帧
                  </span>
                )}
              </div>

              {/* 实时点阵像素化 */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#2E2E3A] bg-[#0A0A0C] p-2 relative overflow-hidden">
                <span className="absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-[#818CF8]">
                  点阵输出 ({width}×{height})
                </span>
                <canvas
                  ref={previewCanvasRef}
                  className="rounded [image-rendering:pixelated] max-h-48 max-w-full shadow-lg"
                />
                {processedFrames.length > 1 && (
                  <div className="mt-2 flex items-center space-x-2">
                    <button
                      onClick={() => setIsLivePreviewPlaying(!isLivePreviewPlaying)}
                      className="rounded bg-[#1E1E26] p-1 text-gray-300 hover:text-white"
                    >
                      {isLivePreviewPlaying ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3 fill-current" />
                      )}
                    </button>
                    <span className="text-[10px] font-mono text-gray-400">
                      帧 {previewFrameIndex + 1}/{processedFrames.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：算法与抖动参数调节 */}
          <div className="flex w-1/2 flex-col justify-between p-5 space-y-4 overflow-y-auto text-xs text-gray-300">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-white font-medium">
                <Sliders className="h-4 w-4 text-[#6366F1]" />
                <span>量化算法与抖动控制</span>
              </div>

              {/* 缩放采样模式 */}
              <div className="space-y-1.5">
                <label className="text-gray-400">缩放采样算法</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setScaleAlgo('nearest')}
                    className={`rounded-lg border p-2 text-left transition ${
                      scaleAlgo === 'nearest'
                        ? 'border-[#6366F1] bg-[#6366F1]/15 text-white'
                        : 'border-[#2E2E3A] bg-[#18181F] text-gray-400'
                    }`}
                  >
                    <div className="font-semibold text-xs">最近邻插值</div>
                    <div className="text-[10px] text-gray-400">适合像素画/ICON</div>
                  </button>
                  <button
                    onClick={() => setScaleAlgo('bilinear')}
                    className={`rounded-lg border p-2 text-left transition ${
                      scaleAlgo === 'bilinear'
                        ? 'border-[#6366F1] bg-[#6366F1]/15 text-white'
                        : 'border-[#2E2E3A] bg-[#18181F] text-gray-400'
                    }`}
                  >
                    <div className="font-semibold text-xs">双线性平滑</div>
                    <div className="text-[10px] text-gray-400">适合照片/连续色调</div>
                  </button>
                </div>
              </div>

              {/* 色彩量化模式 */}
              <div className="space-y-1.5">
                <label className="text-gray-400">色彩量化标准</label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'rgb888', label: '无限制 24位真彩 (RGB888)' },
                      { id: 'rgb565', label: '嵌入式 16位色 (RGB565)' },
                      { id: 'palette16', label: '经典高亮 16 色调色板' },
                      { id: 'monochrome', label: '黑白单色阈值 (1-Bit)' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setQuantizeMode(m.id)}
                      className={`rounded-lg border p-2 text-left transition ${
                        quantizeMode === m.id
                          ? 'border-[#6366F1] bg-[#6366F1]/15 text-white'
                          : 'border-[#2E2E3A] bg-[#18181F] text-gray-400'
                      }`}
                    >
                      <span className="font-medium text-xs">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Floyd-Steinberg 抖动强度 */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Floyd-Steinberg 抖动强度</span>
                  <span className="font-mono text-white">{Math.round(ditherStrength * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(ditherStrength * 100)}
                  onChange={(e) => setDitherStrength(parseInt(e.target.value, 10) / 100)}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded bg-[#2E2E3A] accent-[#6366F1]"
                />
              </div>

              {/* 亮度与对比度 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>亮度</span>
                    <span className="font-mono text-white">{brightness}</span>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded bg-[#2E2E3A] accent-[#6366F1]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>对比度</span>
                    <span className="font-mono text-white">{contrast}</span>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded bg-[#2E2E3A] accent-[#6366F1]"
                  />
                </div>
              </div>

              {/* 透明底替换色 */}
              <div className="flex items-center justify-between rounded-lg border border-[#2E2E3A] bg-[#18181F] p-2.5">
                <span className="text-gray-300">透明背景填充底色</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={transparentColor}
                    onChange={(e) => setTransparentColor(e.target.value)}
                    className="h-6 w-8 cursor-pointer rounded border border-[#2E2E3A] bg-transparent"
                  />
                  <span className="font-mono text-[11px] text-gray-400">{transparentColor}</span>
                </div>
              </div>
            </div>

            {/* 底部确认操作 */}
            <div className="border-t border-[#2E2E3A] pt-4 space-y-3">
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-[#6366F1] focus:ring-0"
                  />
                  <span>替换所有帧</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-[#6366F1] focus:ring-0"
                  />
                  <span>追加到时间轴末尾</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-[#2E2E3A] bg-[#18181F] px-4 py-2 font-medium text-gray-300 hover:bg-[#252530]"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={processedFrames.length === 0 || loading}
                  className="flex items-center space-x-1.5 rounded-lg bg-[#6366F1] px-5 py-2 font-semibold text-white shadow-lg hover:bg-[#4F46E5] disabled:opacity-40 transition"
                >
                  <Check className="h-4 w-4" />
                  <span>确认导入到画布 ({processedFrames.length} 帧)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
