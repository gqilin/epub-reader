# 快速开始

欢迎使用 EPUB Reader Core！本指南将帮助你在 Web 应用中快速开始解析 EPUB 文件。

## 什么是 EPUB Reader Core？

EPUB Reader Core 是一个**框架无关**的 TypeScript 库，让你能够：

- 从各种输入格式解析 EPUB 文件
- 提取图书元数据（标题、作者、描述等）
- 使用目录导航章节
- 检索和显示章节内容
- 提取封面图片和嵌入式资源

## 浏览器兼容性

EPUB Reader Core 在支持以下特性的现代浏览器中运行：

- ES2020+ 特性
- File API
- JavaScript Promises
- ArrayBuffer/Uint8Array

支持的浏览器包括：
- Chrome 80+
- Firefox 72+
- Safari 13.1+
- Edge 80+

## 安装

### 使用 npm

```bash
npm install epub-reader-core
```

### 使用 yarn

```bash
yarn add epub-reader-core
```

### 使用 pnpm

```bash
pnpm add epub-reader-core
```

## 基础用法

### 1. 导入库

```typescript
import { EpubReader } from 'epub-reader-core';
```

### 2. 创建阅读器实例

```typescript
const reader = new EpubReader({
  encoding: 'utf8',      // 可选：文本编码
  loadCover: true        // 可选：加载封面图片
});
```

### 3. 加载 EPUB 文件

```typescript
// 从文件输入
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const file = fileInput.files[0];
await reader.load(file);

// 从 ArrayBuffer/Uint8Array
const response = await fetch('path/to/book.epub');
const arrayBuffer = await response.arrayBuffer();
await reader.load(arrayBuffer);
```

### 4. 访问图书信息

```typescript
// 获取元数据
const metadata = reader.getMetadata();
console.log('标题：', metadata.title);
console.log('作者：', metadata.creator);

// 获取章节
const chapters = reader.getChapters();
console.log('总章节数：', chapters.length);

// 获取目录
const toc = reader.getTableOfContents();
console.log('目录项数：', toc.length);
```

### 5. 阅读章节内容

```typescript
// 阅读第一章
const firstChapter = await reader.getChapterContentByIndex(0);
console.log(firstChapter);
```

## 下一步

现在你已经掌握了基础，可以探索以下主题：

- [元数据提取](/guide/metadata) - 了解所有可用的元数据字段
- [章节阅读](/guide/chapters) - 深入了解章节内容处理
- [目录导航](/guide/table-of-contents) - 导航复杂的目录结构
- [资源和图片](/guide/resources) - 处理嵌入式资源

## 需要帮助？

- 查看[示例](/examples/vue3)获取完整实现
- 访问 [API 参考](/api/epub-reader)获取详细方法文档
- 在 [GitHub](https://github.com/your-username/epub-reader-core/issues) 上提问