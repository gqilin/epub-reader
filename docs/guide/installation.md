# 安装

学习如何安装和设置 EPUB Reader Core 项目。

## 包管理器

### npm

```bash
npm install epub-reader-core
```

### yarn

```bash
yarn add epub-reader-core
```

### pnpm

```bash
pnpm add epub-reader-core
```

## 项目设置

### TypeScript 项目

如果你正在使用 TypeScript，一切都已就绪！包中包含内置的类型定义。

```typescript
import { EpubReader } from 'epub-reader-core';

const reader = new EpubReader();
// 完全的 TypeScript 支持和智能提示
```

### JavaScript 项目

对于 JavaScript 项目，你可以使用 ES 模块：

```javascript
import { EpubReader } from 'epub-reader-core';

const reader = new EpubReader();
await reader.load(epubFile);
```

或者使用 CommonJS：

```javascript
const { EpubReader } = require('epub-reader-core');

const reader = new EpubReader();
await reader.load(epubFile);
```

## 框架集成

### Vue 3

```typescript
// 在 Vue 组件中
import { EpubReader } from 'epub-reader-core';

export default {
  setup() {
    const reader = new EpubReader();
    
    const loadBook = async (file: File) => {
      await reader.load(file);
      const metadata = reader.getMetadata();
      // 在组件中使用元数据
    };
    
    return { loadBook };
  }
};
```

### React

```tsx
// 在 React 组件中
import { useState, useRef } from 'react';
import { EpubReader } from 'epub-reader-core';

function EpubComponent() {
  const [reader] = useState(() => new EpubReader());
  const fileInput = useRef<HTMLInputElement>(null);
  
  const loadBook = async () => {
    const file = fileInput.current?.files?.[0];
    if (file) {
      await reader.load(file);
      const metadata = reader.getMetadata();
      // 更新状态中的元数据
    }
  };
  
  return (
    <div>
      <input type="file" ref={fileInput} onChange={loadBook} />
    </div>
  );
}
```

### Angular

```typescript
import { Component } from '@angular/core';
import { EpubReader } from 'epub-reader-core';

@Component({
  selector: 'app-epub-reader',
  template: `
    <input type="file" (change)="loadBook($event)">
  `
})
export class EpubReaderComponent {
  private reader = new EpubReader();
  
  async loadBook(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      await this.reader.load(file);
      const metadata = this.reader.getMetadata();
      // 在组件中使用元数据
    }
  }
}
```

## CDN 使用

你也可以直接从 CDN 使用 EPUB Reader Core：

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/epub-reader-core/dist/index.js"></script>
</head>
<body>
  <script>
    const { EpubReader } = window.EpubReaderCore;
    const reader = new EpubReader();
    // 使用 reader...
  </script>
</body>
</html>
```

## 浏览器支持

EPUB Reader Core 需要支持 ES2020+ 的现代浏览器：

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 80+ |
| Firefox | 72+ |
| Safari | 13.1+ |
| Edge | 80+ |

## Polyfills

如果需要支持较旧的浏览器，你可能需要以下 polyfills：

- Promise
- ArrayBuffer/Uint8Array
- Fetch API

```bash
npm install core-js
```

```javascript
import 'core-js/stable';
import 'regenerator-runtime/runtime';
```

## 开发依赖

在开发中，你可能还需要安装库的类型定义：

```bash
npm install --save-dev @types/node
```

## 下一步

现在你已经安装了 EPUB Reader Core：

- [快速开始](/guide/getting-started) - 学习基础知识
- [基础用法](/guide/basic-usage) - 查看实用示例
- [API 参考](/api/epub-reader) - 探索所有可用方法