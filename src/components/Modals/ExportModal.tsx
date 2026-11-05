import React, { useState, useMemo } from 'react';
import { useMatrixStore } from '../../store/useMatrixStore';
import {
  buildVendorExportPayload,
  exportVendorJson,
  exportAnimatedGif,
  exportSpriteSheetPng,
  exportPngSequenceZip,
  ScanOrder,
} from '../../utils/exportUtils';
import { exportProjectJson } from '../../utils/projectJsonUtils';
import { ColorFormat } from '../../types/matrix';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode2,
  Film,
  Image as ImageIcon,
  Archive,
  Loader2,
  Sparkles,
  Save,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const {
    width,
    height,
    fps,
    frames,
    colorFormat: defaultColorFormat,
    ledConfig,
  } = useMatrixStore();

  const [projectName, setProjectName] = useState('pixel_matrix_art');
  const [selectedFormat, setSelectedFormat] = useState<ColorFormat>(defaultColorFormat);
  const [scanOrder, setScanOrder] = useState<ScanOrder>('row-major');

  // 媒体导出参数
  const [scale, setScale] = useState<number>(8);
  const [withLedLook, setWithLedLook] = useState<boolean>(true);

  // 状态
  const [isCopied, setIsCopied] = useState(false);
  const [exportingType, setExportingType] = useState<string | null>(null);

  // 实时生成预览的 JSON 字符串片段
  const jsonPreviewText = useMemo(() => {
    const payload = buildVendorExportPayload(
      projectName,
      width,
      height,
      selectedFormat,
      fps,
      frames,
      scanOrder
    );

    // 为了预览流畅，截取部分展示
    const previewPayload = {
      ...payload,
      frames: payload.frames.slice(0, 2).map((f) => ({
        ...f,
        data: f.data.length > 16 ? [...f.data.slice(0, 16), `... (共 ${f.data.length} 项)`] : f.data,
      })),
      _note: payload.frames.length > 2 ? `... 省略其余 ${payload.frames.length - 2} 帧` : undefined,
    };

    return JSON.stringify(previewPayload, null, 2);
  }, [projectName, width, height, selectedFormat, fps, frames, scanOrder]);

  const handleCopyJson = () => {
    const fullPayload = buildVendorExportPayload(
      projectName,
      width,
      height,
      selectedFormat,
      fps,
      frames,
      scanOrder
    );
    navigator.clipboard.writeText(JSON.stringify(fullPayload, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    exportVendorJson(
      projectName,
      width,
      height,
      selectedFormat,
      fps,
      frames,
      scanOrder
    );
  };

  const handleSaveProjectFile = () => {
    exportProjectJson(
      projectName,
      width,
      height,
      selectedFormat,
      fps,
      frames,
      ledConfig
    );
  };

  const handleExportGif = async () => {
    setExportingType('gif');
    try {
      await exportAnimatedGif(projectName, frames, width, height, scale, withLedLook, ledConfig);
    } catch (err: unknown) {
      console.error('GIF 导出错误:', err);
      alert(err instanceof Error ? err.message : '导出 GIF 失败');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportSpriteSheet = async () => {
    setExportingType('spritesheet');
    try {
      await exportSpriteSheetPng(projectName, frames, width, height, scale, withLedLook, ledConfig);
    } catch (err: unknown) {
      console.error('Sprite Sheet 导出错误:', err);
      alert(err instanceof Error ? err.message : '导出精灵图失败');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportZip = async () => {
    setExportingType('zip');
    try {
      await exportPngSequenceZip(projectName, frames, width, height, scale, fps, withLedLook, ledConfig);
    } catch (err: unknown) {
      console.error('ZIP 导出错误:', err);
      alert(err instanceof Error ? err.message : '导出 PNG 序列包失败');
    } finally {
      setExportingType(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="flex h-[92vh] max-h-[760px] w-full max-w-4xl flex-col rounded-2xl border border-[#2E2E3A] bg-[#121216] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#2E2E3A] px-6 bg-[#18181F]">
          <div className="flex items-center space-x-2.5">
            <Download className="h-5 w-5 text-[#6366F1]" />
            <h2 className="text-base font-semibold text-white">方案交付与通用媒体导出</h2>
            <span className="rounded bg-[#6366F1]/20 px-2 py-0.5 text-xs text-[#818CF8] font-mono">
              {width} × {height} ({frames.length} 帧)
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
          {/* 左栏：硬件方案商数据交付 (JSON) 与 可编辑工程存档 */}
          <div className="flex w-1/2 flex-col border-r border-[#2E2E3A] p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center space-x-2 border-b border-[#2E2E3A] pb-2 text-white font-medium text-sm">
              <FileCode2 className="h-4 w-4 text-[#6366F1]" />
              <span>数据导出与可再次编辑工程保存</span>
            </div>

            <div className="space-y-3 text-xs">
              {/* 项目名称 */}
              <div className="space-y-1">
                <label className="text-gray-400">项目标识 (Project Name)</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full rounded border border-[#2E2E3A] bg-[#18181F] px-2.5 py-1.5 text-white focus:border-[#6366F1] focus:outline-none font-mono"
                />
              </div>

              {/* 色彩标准与走线模式 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-400">色彩输出标准</label>
                  <div className="flex rounded-lg border border-[#2E2E3A] bg-[#18181F] p-0.5">
                    {(['RGB888', 'RGB565'] as ColorFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setSelectedFormat(fmt)}
                        className={`flex-1 rounded py-1 font-semibold transition ${
                          selectedFormat === fmt
                            ? 'bg-[#6366F1] text-white shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400">走线扫描排列顺序</label>
                  <div className="flex rounded-lg border border-[#2E2E3A] bg-[#18181F] p-0.5">
                    <button
                      onClick={() => setScanOrder('row-major')}
                      className={`flex-1 rounded py-1 transition ${
                        scanOrder === 'row-major'
                          ? 'bg-[#6366F1] text-white shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      逐行扫描
                    </button>
                    <button
                      onClick={() => setScanOrder('serpentine')}
                      className={`flex-1 rounded py-1 transition ${
                        scanOrder === 'serpentine'
                          ? 'bg-[#6366F1] text-white shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      S型蛇形走线
                    </button>
                  </div>
                </div>
              </div>

              {/* JSON 代码实时预览 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-gray-400">
                  <span>结构预览 (JSON Preview)</span>
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center space-x-1 text-[#818CF8] hover:text-white transition"
                  >
                    {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{isCopied ? '已复制' : '复制全文'}</span>
                  </button>
                </div>
                <pre className="h-32 w-full overflow-auto rounded-lg border border-[#2E2E3A] bg-[#0A0A0C] p-2.5 font-mono text-[11px] text-emerald-400 scrollbar-thin">
                  {jsonPreviewText}
                </pre>
              </div>

              {/* 导出按钮组 */}
              <div className="space-y-2 pt-1">
                {/* 1. 保存完整工程文件 */}
                <button
                  onClick={handleSaveProjectFile}
                  className="flex h-9 w-full items-center justify-center space-x-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 font-semibold text-emerald-300 hover:bg-emerald-500/20 active:scale-98 transition shadow"
                  title="保存包含画布尺寸、FPS、物理预览设置及完整帧的工程文件，支持随时重新导入编辑"
                >
                  <Save className="h-4 w-4" />
                  <span>保存为可再次编辑的工程文件 (.json)</span>
                </button>

                {/* 2. 方案商交付文件 */}
                <button
                  onClick={handleDownloadJson}
                  className="flex h-9 w-full items-center justify-center space-x-2 rounded-lg bg-[#6366F1] font-semibold text-white shadow-lg transition hover:bg-[#4F46E5] active:scale-98"
                >
                  <Download className="h-4 w-4" />
                  <span>下载方案商标准交付 JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* 右栏：通用媒体导出 (GIF / PNG / ZIP) */}
          <div className="flex w-1/2 flex-col justify-between p-5 space-y-4 overflow-y-auto text-xs text-gray-300">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#2E2E3A] pb-2 text-white font-medium text-sm">
                <Sparkles className="h-4 w-4 text-[#6366F1]" />
                <span>通用媒体格式导出</span>
              </div>

              {/* 渲染分辨率放大倍数 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-gray-400">
                  <span>导出缩放倍数 (Scale)</span>
                  <span className="font-mono text-white font-semibold">
                    {scale}x ({width * scale} × {height * scale} px)
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 4, 8, 16].map((s) => (
                    <button
                      key={s}
                      onClick={() => setScale(s)}
                      className={`rounded-lg border p-2 font-mono transition ${
                        scale === s
                          ? 'border-[#6366F1] bg-[#6366F1]/15 text-white'
                          : 'border-[#2E2E3A] bg-[#18181F] text-gray-400 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* 是否带真实物理灯珠效果 */}
              <div className="flex items-center justify-between rounded-lg border border-[#2E2E3A] bg-[#18181F] p-3">
                <div className="space-y-0.5">
                  <span className="font-medium text-white">渲染真实物理灯珠与发光光晕</span>
                  <p className="text-[10px] text-gray-400">
                    勾选将导出带真实 LED 圆形/方形灯珠和光晕渲染画面；取消则导出纯净方块点阵
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={withLedLook}
                  onChange={(e) => setWithLedLook(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-gray-600 bg-[#2E2E3A] text-[#6366F1]"
                />
              </div>

              {/* 三大媒体导出动作 */}
              <div className="space-y-2.5 pt-2">
                {/* 1. GIF */}
                <div className="flex items-center justify-between rounded-xl border border-[#2E2E3A] bg-[#18181F] p-3 hover:border-gray-500 transition">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
                      <Film className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">动态 GIF 动图</div>
                      <div className="text-[11px] text-gray-400">循环播放，适配社交媒体与演示</div>
                    </div>
                  </div>
                  <button
                    onClick={handleExportGif}
                    disabled={exportingType !== null}
                    className="flex items-center space-x-1.5 rounded-lg bg-[#2E2E3A] px-3.5 py-2 font-medium text-white hover:bg-[#3E3E4E] transition disabled:opacity-40"
                  >
                    {exportingType === 'gif' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>导出 .gif</span>
                  </button>
                </div>

                {/* 2. Sprite Sheet */}
                <div className="flex items-center justify-between rounded-xl border border-[#2E2E3A] bg-[#18181F] p-3 hover:border-gray-500 transition">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">PNG 长条精灵图</div>
                      <div className="text-[11px] text-gray-400">全帧水平拼接，适合游戏与前端动画引擎</div>
                    </div>
                  </div>
                  <button
                    onClick={handleExportSpriteSheet}
                    disabled={exportingType !== null}
                    className="flex items-center space-x-1.5 rounded-lg bg-[#2E2E3A] px-3.5 py-2 font-medium text-white hover:bg-[#3E3E4E] transition disabled:opacity-40"
                  >
                    {exportingType === 'spritesheet' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>导出 .png</span>
                  </button>
                </div>

                {/* 3. PNG Sequence Zip */}
                <div className="flex items-center justify-between rounded-xl border border-[#2E2E3A] bg-[#18181F] p-3 hover:border-gray-500 transition">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Archive className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">PNG 序列帧压缩包</div>
                      <div className="text-[11px] text-gray-400">单帧独立图片与 manifest.json 归档</div>
                    </div>
                  </div>
                  <button
                    onClick={handleExportZip}
                    disabled={exportingType !== null}
                    className="flex items-center space-x-1.5 rounded-lg bg-[#2E2E3A] px-3.5 py-2 font-medium text-white hover:bg-[#3E3E4E] transition disabled:opacity-40"
                  >
                    {exportingType === 'zip' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>导出 .zip</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 提示 */}
            <div className="rounded-lg border border-[#2E2E3A]/60 bg-[#18181F] p-2.5 text-[10px] text-gray-500">
              💡 纯浏览器本地离线生成，零数据上传外传，安全保护商业点阵素材。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

