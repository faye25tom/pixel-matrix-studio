<div align="center">

# 🎨 PixelMatrix Studio (点阵屏像素画与动效生产工具)

面向硬件产品团队、嵌入式方案商与独立创作者的**纯前端 Web 端点阵屏像素画与动画生产工作台**。

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-teal.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[在线体验](#快速开始) · [核心特性](#-核心特性) · [方案商格式规范](#-方案商-json-数据规范) · [快速开始](#-快速开始)

</div>

---

## 🌟 核心特性

- 🖥️ **零后端纯浏览器运行架构**：所有算法处理、GIF 编解码、动效生成、图像量化与 AI API 请求均在浏览器本地离线完成，无任何后端依赖，数据隐私 100% 安全。
- 💡 **真实 LED 灯珠物理仿真渲染引擎**：
  - 支持“网格编辑模式”与“真实物理灯珠预览模式”一键切换。
  - 支持调节圆形 / 方形灯珠外形、间距比例（`gapRatio`）、发光光晕漫射（`glowIntensity`）、LED 芯片高光核心以及未通电底板暗纹。
- 🪄 **内置 6 种参数化动效一键生成器**：
  1. **跑马灯平移 (Scroll)**：支持上/下/左/右四向无缝循环平移。
  2. **正弦呼吸灯 (Breathing)**：平滑正弦亮度曲线呼吸调节。
  3. **闪烁频闪 (Blink)**：支持黑屏频闪与反色交替模式。
  4. **彩虹渐变流光 (Rainbow)**：HSV 动态流动彩虹光谱。
  5. **激光扫描展开 (Laser Wipe)**：从左向右或中心向外展开，边缘带高亮白激光。
  6. **文字转点阵 (Text Matrix)**：中英文输入阈值二值化消除模糊抗锯齿，支持自动跑马灯滚动。
- 🖼️ **外部图片与 GIF 动图本地像素化导入**：
  - 支持上传 `.png / .jpg / .webp / .gif`。
  - 集成 **Floyd-Steinberg 误差扩散抖动算法** 与高精度缩放（最近邻 Nearest / 双线性 Bilinear）。
  - 支持无限制 RGB888、嵌入式 RGB565、经典高亮 16 色调色板与 1-Bit 黑白单色量化。
- 🤖 **AI 提示词工坊（紧凑调色板字符矩阵协议）**：
  - 兼容 OpenAI、DeepSeek、硅基流动、Ollama 本地大模型。
  - 支持“文生单帧”、“文生连贯多帧动画 (2~8帧)”与“基于当前画面 AI 局部重绘”。
  - 独创**调色板字典 + 行字符串矩阵协议**，节省 75% 以上 Tokens，并内置自适应行高补齐与溢出截断容错，大模型 100% 不错位崩溃。
- 📦 **双向工程存档与多格式交付**：
  - **项目工程文件存档 (`.pixelproject.json`)**：保存画布尺寸、FPS、色彩模式、灯珠配置与完整帧序列，随时重新打开恢复二次编辑。
  - **硬件方案商标准交付 JSON**：支持 RGB888 / RGB565（输出 `0xXXXX` 16进制与十进制整型数组），支持标准逐行与 WS2812 蛇形 S 走线。
  - **通用媒体文件导出**：支持导出无损动态 `.gif`、水平拼接长条雪碧图 `.png`、多帧独立打包 `.zip`（附带 `manifest.json`）。

---

## 🛠️ 技术栈

| 模块分类 | 选型方案 | 说明 |
| :--- | :--- | :--- |
| **构建与框架** | Vite + React 18 + TypeScript | 极致响应与强类型保障 |
| **样式方案** | Tailwind CSS | 现代深色工业风 Dark UI |
| **状态管理** | Zustand | 扁平化极简状态流，支持 30 步 Undo/Redo 历史栈 |
| **图标库** | Lucide React | 语义化矢量图标 |
| **GIF 解码** | `gifuct-js` | 本地解析动图每帧 patch 与 delay |
| **GIF 编码** | `gifenc` | 极速前端动图渲染与调色板量化 |
| **打包压缩** | `jszip` | 前端序列帧 ZIP 归档与下载 |

---

## 🚀 快速开始

### 1. 克隆代码仓库

```bash
git clone https://github.com/faye25tom/pixel-matrix-studio.git
cd pixel-matrix-studio
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

启动完成后，在浏览器访问 `http://127.0.0.1:5173` 即可开启创作！

### 4. 生产环境构建

```bash
npm run build
```

构建产物将输出在 `dist/` 目录，可直接托管部署至 GitHub Pages、Vercel、Netlify 或任何静态服务器。

---

## 📐 方案商 JSON 数据规范

交付给硬件工程师或嵌入式方案商的标准 JSON 结构示例：

```json
{
  "schemaVersion": "1.0",
  "metadata": {
    "projectName": "pixel_matrix_art",
    "exportedAt": "2026-11-05T15:00:00.000Z",
    "width": 16,
    "height": 16,
    "colorFormat": "RGB565",
    "fps": 8,
    "totalFrames": 2
  },
  "frames": [
    {
      "frameIndex": 0,
      "durationMs": 125,
      "data": [
        "0xF800",
        "0x07E0",
        "0x001F"
      ],
      "rawUint16OrUint24": [
        63488,
        2016,
        31
      ]
    }
  ]
}
```

---

## ⌨️ 常用快捷键

| 快捷键 | 功能 |
| :--- | :--- |
| <kbd>B</kbd> | 画笔工具 (Pencil) |
| <kbd>E</kbd> | 橡皮擦 (Eraser) |
| <kbd>G</kbd> | 油漆桶四连通填充 (Bucket) |
| <kbd>I</kbd> | 吸管工具 (Eyedropper) |
| <kbd>L</kbd> | 直线工具 (Line) |
| <kbd>R</kbd> | 矩形工具 (Rectangle，按住 Shift 为实心矩形) |
| <kbd>Space</kbd> | 播放 / 暂停动画 |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | 撤销 (Undo) |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | 重做 (Redo) |

---

## 📄 开源许可证

本项目基于 [MIT 许可证](LICENSE) 开源。欢迎 Star、Fork 与提 Issue / PR！
