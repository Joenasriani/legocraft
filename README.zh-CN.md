# Legocraft

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md">Português</a> ·
  <a href="README.ar.md">عربي</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.hi.md">हिन्दी</a> ·
  <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  <img src="docs/screenshots/Brick%20XR%20Builder%20Game%20Showcase.png" alt="Legocraft browser 3D brick-building sandbox showcase" width="100%">
</p>

[![CI](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml/badge.svg)](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml)

一个运行在浏览器中的开源 3D 积木搭建沙盒，使用 React Three Fiber、Three.js 和 WebXR 构建。

可直接在浏览器中通过桌面或触控操作搭建和编辑数字积木结构，保存和重新加载项目、导出作品，并在 WebXR 中体验同一工作空间。

> **项目状态：** 实验性。桌面与触控交互已实现。WebXR 功能已存在，但尚未完成真实 Meta Quest 硬件测试。请参阅 `docs/QUEST_QA.md`。

## 在线体验

应用地址：https://legocraftvr.vercel.app/

## 面向开发者

Legocraft 也是一个可直接研究的浏览器 3D 构建系统示例：网格吸附放置、生成式积木几何体、连接对象选择、本地持久化、GLB 导出，以及实验性的 WebXR 控制器交互，都位于同一个 React Three Fiber 代码库中。

- [查看架构](docs/ARCHITECTURE.md)
- [参与贡献](CONTRIBUTING.md)
- [查看 WebXR / Quest QA 矩阵](docs/QUEST_QA.md)

## 功能

- 在吸附式 3D 网格上放置、移动、旋转、改色和删除积木
- 多种矩形积木尺寸，以及圆形、圆锥、穹顶、斜坡、曲面、楔形、三角形和拱形
- 单选、多选和连接组选择
- 复制/粘贴、撤销和重做
- 内置预设：Horse、Sheep、Car、Road、Mountain、Tree、Cabin、Water Well、Pine Tree 和 Castle
- 浏览器本地持久化
- 以 `.json` 保存和导入项目数据
- 将当前结构导出为 `.glb`
- 导出 `.png` 截图
- 桌面与触控交互
- Orbit、Pan 和 Zoom 相机模式
- 保存、复制/粘贴、删除和编辑的键盘快捷键
- 启动时自动恢复本地保存的搭建内容
- 实验性 WebXR 模式，支持控制器、触觉反馈、移动、Snap Turn 和 VR 菜单

## 本地运行

### 要求

- 推荐 Node.js 22
- npm
- 支持 WebGL 的浏览器

### 安装

```bash
git clone https://github.com/Joenasriani/legocraft.git
cd legocraft
npm install
```

### 启动开发服务器

```bash
npm run dev
```

Vite 开发服务器配置在 `3000` 端口。

首次成功运行后，应在浏览器中加载 3D 构建工作区，并可放置和操作积木。

### 验证项目

```bash
npm run test
npm run lint
npm run build
```

这些命令定义于 `package.json`，并由 GitHub Actions 在 Node.js 22 环境下验证。

## 项目文件与导出

- `.json` 项目保存/导入
- `.glb` 3D 导出
- `.png` 截图
- 浏览器自动本地持久化

截图功能为 best-effort，具体效果可能取决于浏览器的 WebGL 行为。

## 验证与兼容性

GitHub Actions 当前使用 Node.js 22 执行：

- `npm ci`
- `npm run test`
- `npm run lint`
- `npm run build`

当前兼容状态：

| 环境 | 状态 |
| --- | --- |
| 生产构建 | CI 已验证 |
| 自动化测试 | CI 已验证 |
| TypeScript 检查 | CI 已验证 |
| 桌面浏览器交互 | 已实现；尚无正式跨浏览器矩阵 |
| 触控交互 | 已实现；尚无正式设备矩阵 |
| WebXR | 实验性 |
| Meta Quest 硬件 | 尚未在真实硬件上测试 |

## WebXR 状态

WebXR 交互已实现，包括控制器输入、触觉反馈、VR 菜单、移动控制和 Snap Turn。

尚未完成真实 Meta Quest 硬件测试，因此 Quest 专用兼容性和性能应视为实验性，不应视为保证。

请参阅 [`docs/QUEST_QA.md`](docs/QUEST_QA.md) 查看当前硬件 QA 矩阵。

## 在 Legocraft 基础上继续构建

任何能够带来真实改进、实验、功能、设计、工具、性能提升、无障碍提升或有用扩展的想法都欢迎。

当前游戏只是起点，而不是上限。

具体参与方式：

- **试玩：** 使用现有构建器，找出值得改进的交互或流程。
- **研究代码：** 使用 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 找到相关子系统。
- **添加积木：** 扩展积木定义和生成几何体。
- **创建预设：** 使用现有预设系统添加并验证可复用结构。
- **改进交互：** 优化桌面、触控、选择、编辑或相机行为。
- **测试 WebXR：** 执行 Quest QA 流程并报告真实硬件结果。
- **改进 XR：** 优化控制器兼容性、移动、触觉反馈、VR UI 或性能。
- **提高可靠性：** 为放置、选择、预设或共享域逻辑添加针对性测试。
- **创建 Issue：** 在实现前讨论较大改动或可复现问题。
- **提交 Pull Request：** 保持改动聚焦，并运行现有 CI 命令。

Legocraft 基于 MIT License 开源。你可以根据 [`LICENSE`](LICENSE) 的条款 fork、修改、扩展和再分发。贡献流程请参阅 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

### 当前贡献入口

- [WebXR / Meta Quest 硬件验证与扩展](https://github.com/Joenasriani/legocraft/issues/1)
- [将预设验证纳入自动化 Vitest 覆盖](https://github.com/Joenasriani/legocraft/issues/2)
- [扩展放置和选择规则的自动化测试覆盖](https://github.com/Joenasriani/legocraft/issues/3)

### 创意与空间设计贡献

并非所有有价值的贡献都需要写代码。设计师和技术美术可以通过 GitHub Issue 提出预设结构、空间构图、新形状概念、交互流程、搭建挑战或无障碍改进。清晰的草图、图示、参考布局和行为说明，只要与当前构建器兼容，都很有价值。

被接受的贡献会通过 Git 历史和 Pull Request 记录获得署名；若由其他人将已接受的提案实现为代码，应在实现讨论中引用提案作者。

### WebXR / Quest 前沿

Legocraft 已包含实验性的 WebXR 交互、控制器输入、移动、触觉反馈、VR 菜单以及 XR 专用搭建流程。真实 Meta Quest 硬件验证仍待进行。XR 层已文档化，并有意保持可扩展，方便开发者测试、改进、优化或进一步扩展。

## 技术栈

- React
- TypeScript
- Three.js
- React Three Fiber
- `@react-three/drei`
- `@react-three/xr`
- Zustand
- Vite
- Vitest

**作者：Joe Nasr** — 互动体验、3D 与 WebXR。

https://joe-nasr-signals.vercel.app/
