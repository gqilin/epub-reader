---
layout: home

hero:
  name: EPUB Reader Core
  text: 框架无关的 EPUB 解析
  tagline: 一个适用于任何 Web 框架的 TypeScript EPUB 解析库
  image:
    src: /epub-logo.svg
    alt: EPUB Reader Core
  actions:
    - theme: brand
      text: 开始使用
      link: /guide/getting-started
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/your-username/epub-reader-core

features:
  - icon: 🎯
    title: 框架无关
    details: 适用于 Vue、React、Angular 或原生 JavaScript - 无框架依赖
  - icon: 📚
    title: 完整的 EPUB 支持
    details: 解析 EPUB 2.0 和 3.0 格式的元数据、目录、章节和资源
  - icon: 🎨
    title: TypeScript 优先
    details: 完整的 TypeScript 支持和智能提示
  - icon: 🚀
    title: 轻量且快速
    details: 针对性能优化，支持 Tree-shaking 和最小化打包
  - icon: 🖼️
    title: 富媒体内容支持
    details: 提取封面图片，处理嵌入式资源，渲染 HTML 内容
  - icon: 🔧
    title: 易于使用
    details: 简单的 API，提供常用的 EPUB 阅读任务方法

---

## 快速开始

```bash
npm install epub-reader-core
```

```typescript
import { EpubReader } from 'epub-reader-core';

const reader = new EpubReader();
await reader.load(epubFile);

const metadata = reader.getMetadata();
console.log(`正在阅读：《${metadata.title}》作者：${metadata.creator}`);
```

<div class="tip custom-block" style="margin-top: 2rem;">
<p class="custom-block-title">🎉 准备深入了解了？</p>
<p>查看我们的 <a href="/guide/getting-started">快速开始</a> 指南，学习如何将 EPUB Reader Core 集成到你的项目中！</p>
</div>