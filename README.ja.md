# Legocraft

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md">Português</a> ·
  <a href="README.ar.md">العربية</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.hi.md">हिन्दी</a> ·
  <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  <img src="docs/screenshots/Brick%20XR%20Builder%20App%20Showcase.png" alt="Legocraft browser 3D brick-building sandbox showcase" width="100%">
</p>

[![CI](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml/badge.svg)](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml)

React Three Fiber、Three.js、WebXR で構築された、ブラウザ上で動作するオープンソースの 3D ブリック建築サンドボックスです。

デスクトップまたはタッチ操作でブラウザ上のデジタルブリック構造を作成・編集し、プロジェクトの保存・再読み込み、作品のエクスポート、同じワークスペースの WebXR 体験ができます。

> **プロジェクト状態:** 実験段階。デスクトップとタッチ操作は実装済みです。WebXR 機能も存在しますが、実機の Meta Quest での QA はまだ完了していません。 `docs/QUEST_QA.md` を参照してください。

## 試す

ライブアプリ: https://legocraftvr.vercel.app/

## 開発者向け

Legocraft は、ブラウザベースの 3D 建築システムを調べられる実例でもあります。グリッドスナップ配置、生成ブリックジオメトリ、接続オブジェクト選択、ローカル永続化、GLB エクスポート、実験的な WebXR コントローラー操作が、同じ React Three Fiber コードベースに実装されています。

- [アーキテクチャを見る](docs/ARCHITECTURE.md)
- [コントリビュートする](CONTRIBUTING.md)
- [WebXR / Quest QA マトリクスを見る](docs/QUEST_QA.md)

## 機能

- スナップ式 3D グリッド上でブリックの配置、移動、回転、色変更、削除
- 複数サイズの直方体ブリックに加え、円形、円錐、ドーム、スロープ、曲面、ウェッジ、三角形、アーチ形状
- 単体選択、複数選択、接続グループ選択
- コピー/貼り付け、Undo/Redo
- 内蔵プリセット: Horse、Sheep、Car、Road、Mountain、Tree、Cabin、Water Well、Pine Tree、Castle
- ブラウザ内ローカル永続化
- `.json` 形式でのプロジェクト保存・読み込み
- 現在の構造を `.glb` でエクスポート
- `.png` スクリーンショット出力
- デスクトップとタッチ操作
- Orbit / Pan / Zoom カメラモード
- 保存、コピー/貼り付け、削除、編集のキーボードショートカット
- 起動時のローカル保存データ自動復元
- コントローラー、ハプティクス、移動、Snap Turn、VR メニューを備えた実験的 WebXR モード

## ローカル実行

### 必要環境

- Node.js 22 推奨
- npm
- WebGL 対応ブラウザ

### インストール

```bash
git clone https://github.com/Joenasriani/legocraft.git
cd legocraft
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

Vite 開発サーバーはポート `3000` に設定されています。

正常に起動すると、ブラウザに 3D 建築ワークスペースが表示され、ブリックを配置・操作できます。

### プロジェクト検証

```bash
npm run test
npm run lint
npm run build
```

これらのコマンドは `package.json` に定義され、Node.js 22 上の GitHub Actions で検証されます。

## プロジェクトファイルとエクスポート

- `.json` プロジェクト保存/読み込み
- `.glb` 3D エクスポート
- `.png` スクリーンショット
- ブラウザ内の自動ローカル永続化

スクリーンショット取得は best-effort であり、ブラウザの WebGL 挙動に依存する場合があります。

## 検証と互換性

GitHub Actions は現在 Node.js 22 で次を実行します。

- `npm ci`
- `npm run test`
- `npm run lint`
- `npm run build`

現在の互換性:

| 環境 | 状態 |
| --- | --- |
| 本番ビルド | CI 検証済み |
| 自動テスト | CI 検証済み |
| TypeScript チェック | CI 検証済み |
| デスクトップブラウザ操作 | 実装済み。正式なクロスブラウザ表は未作成 |
| タッチ操作 | 実装済み。正式なデバイス表は未作成 |
| WebXR | 実験的 |
| Meta Quest 実機 | 未テスト |

## WebXR 状態

コントローラー入力、ハプティックフィードバック、VR メニュー、移動操作、Snap Turn を含む WebXR インタラクションは実装済みです。

実機 Meta Quest テストは **まだ** 完了していないため、Quest 固有の互換性や性能は保証ではなく実験的なものとして扱ってください。

現在のハードウェア QA マトリクスは [`docs/QUEST_QA.md`](docs/QUEST_QA.md) を参照してください。

## Legocraft を拡張する

実際の改善、実験、機能、デザイン、ツール、性能向上、アクセシビリティ向上、または有用な拡張につながるアイデアなら歓迎します。

現在のゲームは出発点であり、上限ではありません。

具体的な参加方法:

- **遊ぶ:** 現在のビルダーを試し、改善価値のある操作やワークフローを見つける。
- **コードを見る:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) で関連サブシステムを探す。
- **ブリックを追加:** ブリック定義と生成ジオメトリを拡張する。
- **プリセットを作る:** 既存のプリセットシステムで再利用可能な構造を追加・検証する。
- **操作を改善:** デスクトップ、タッチ、選択、編集、カメラ挙動を改善する。
- **WebXR をテスト:** Quest QA 手順を実行し、実機結果を報告する。
- **XR を改善:** コントローラー互換性、移動、ハプティクス、VR UI、性能を改善する。
- **信頼性を高める:** 配置、選択、プリセット、共有ドメインロジックに焦点を当てたテストを追加する。
- **Issue を開く:** 大きな変更や再現可能な制約を実装前に議論する。
- **Pull Request を送る:** 変更を絞り、既存の CI コマンドを実行する。

Legocraft は MIT License のオープンソースです。[ `LICENSE` ](LICENSE) の条件に従い、fork、変更、拡張、再配布できます。貢献手順は [`CONTRIBUTING.md`](CONTRIBUTING.md) を参照してください。

### 現在のコントリビューター入口

- [WebXR / Meta Quest 実機検証と拡張](https://github.com/Joenasriani/legocraft/issues/1)
- [プリセット検証を Vitest 自動テストへ移行](https://github.com/Joenasriani/legocraft/issues/2)
- [配置・選択ルールの自動テスト拡張](https://github.com/Joenasriani/legocraft/issues/3)

### クリエイティブ / 空間デザインの貢献

有用な貢献のすべてにコードが必要なわけではありません。デザイナーやテクニカルアーティストは GitHub Issue を通じて、プリセット構造、空間構成、新しい形状案、インタラクションフロー、建築チャレンジ、アクセシビリティ改善を提案できます。明確なスケッチ、図、参考レイアウト、挙動メモは、既存のビルダーと互換性がある内容なら有用です。

採用された貢献は Git 履歴と Pull Request 記録でクレジットされます。採用済みコンセプトを別の人がコード化する場合、実装の議論で提案者を参照してください。

### WebXR / Quest のフロンティア

Legocraft にはすでに実験的な WebXR インタラクション、コントローラー入力、移動、ハプティクス、VR メニュー、XR 専用の建築フローがあります。実機 Meta Quest の検証はまだ未完了です。XR レイヤーは文書化され、テスト、改善、最適化、さらなる拡張ができるよう意図的に拡張可能です。

## スタック

- React
- TypeScript
- Three.js
- React Three Fiber
- `@react-three/drei`
- `@react-three/xr`
- Zustand
- Vite
- Vitest

**Created by Joe Nasr** — Interactive experiences, 3D and WebXR.

https://joe-nasr-signals.vercel.app/
