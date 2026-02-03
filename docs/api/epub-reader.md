# EpubReader

用于解析和阅读 EPUB 文件的主要类。

## 构造函数

### `new EpubReader(options?: EpubReaderOptions)`

创建新的 EPUB 阅读器实例。

**参数：**
- `options`（可选）：阅读器的配置选项

```typescript
const reader = new EpubReader({
  encoding: 'utf8',     // 文本编码（默认：'utf8'）
  loadCover: true       // 是否加载封面图片（默认：true）
});
```

## 方法

### `load(epubData): Promise<void>`

加载 EPUB 文件进行解析。

**参数：**
- `epubData`：EPUB 文件数据（ArrayBuffer、Uint8Array 或 Blob）

**返回：** 解析完成后解决的 Promise

```typescript
// 从 File 对象
await reader.load(file);

// 从 ArrayBuffer
const response = await fetch('book.epub');
const arrayBuffer = await response.arrayBuffer();
await reader.load(arrayBuffer);

// 从 Uint8Array
const uint8Array = new Uint8Array(arrayBuffer);
await reader.load(uint8Array);
```

**抛出：**
- 如果 EPUB 解析失败则抛出错误
- 如果文件格式无效则抛出错误

### `getInfo(): EpubInfo | null`

获取完整的 EPUB 信息，包括元数据、清单、脊和目录。

**返回：** EpubInfo 对象或 null

```typescript
const info = reader.getInfo();
if (info) {
  console.log('元数据：', info.metadata);
  console.log('章节数：', info.chapters.length);
  console.log('目录项数：', info.toc.length);
}
```

### `getMetadata(): EpubMetadata | null`

从 EPUB 获取图书元数据。

**返回：** EpubMetadata 对象或 null

```typescript
const metadata = reader.getMetadata();
if (metadata) {
  console.log('标题：', metadata.title);
  console.log('作者：', metadata.creator);
  console.log('描述：', metadata.description);
  console.log('语言：', metadata.language);
  console.log('出版社：', metadata.publisher);
  console.log('日期：', metadata.date);
}
```

### `getChapters(): EpubChapter[]`

按阅读顺序获取章节列表。

**返回：** EpubChapter 对象数组

```typescript
const chapters = reader.getChapters();
console.log(`图书包含 ${chapters.length} 个章节`);

chapters.forEach((chapter, index) => {
  console.log(`第 ${index + 1} 章：${chapter.id} (${chapter.href})`);
});
```

### `getTableOfContents(): EpubTableOfContents[]`

获取分层的目录结构。

**返回：** 顶级目录项数组（可能包含嵌套的子项）

```typescript
const toc = reader.getTableOfContents();

function printToc(items, level = 0) {
  items.forEach(item => {
    const indent = '  '.repeat(level);
    console.log(`${indent}• ${item.title}`);
    
    if (item.children) {
      printToc(item.children, level + 1);
    }
  });
}

printToc(toc);
```

### `getChapterContent(chapterHref): Promise<string>`

通过 href 获取章节内容。

**参数：**
- `chapterHref`：章节文件名的 href 路径

**返回：** 解析为章节 HTML 内容的 Promise

**抛出：**
- 如果找不到章节或无法加载则抛出错误

```typescript
const chapters = reader.getChapters();
const firstChapterContent = await reader.getChapterContent(chapters[0].href);
console.log('章节内容：', firstChapterContent);
```

### `getChapterContentByIndex(index): Promise<string>`

通过阅读顺序中的索引获取章节内容。

**参数：**
- `index`：从零开始的章节索引

**返回：** 解析为章节 HTML 内容的 Promise

**抛出：**
- 如果索引超出范围或无法加载章节则抛出错误

```typescript
try {
  const firstChapter = await reader.getChapterContentByIndex(0);
  const lastChapter = await reader.getChapterContentByIndex(reader.getChapters().length - 1);
} catch (error) {
  console.error('加载章节失败：', error.message);
}
```

### `getCoverImage(): Promise<string | null>`

获取封面图片的数据 URL。

**返回：** 解析为数据 URL 字符串或 null（如果未找到封面）的 Promise

```typescript
const coverImage = await reader.getCoverImage();
if (coverImage) {
  const img = document.getElementById('cover') as HTMLImageElement;
  img.src = coverImage;
}
```

### `getResource(href): Promise<string | null>`

获取任何嵌入式资源（图片、CSS 等）的 base64 数据。

**参数：**
- `href`：EPUB 内的资源文件路径

**返回：** 解析为 base64 字符串或 null（如果未找到资源）的 Promise

```typescript
// 加载图片
const imageData = await reader.getResource('images/chapter1-illustration.jpg');
if (imageData) {
  const dataUrl = `data:image/jpeg;base64,${imageData}`;
  // 使用 dataUrl...
}

// 加载 CSS
const cssData = await reader.getResource('styles/epub.css');
if (cssData) {
  const cssText = atob(cssData); // 解码 base64
  // 应用样式...
}
```

## 使用示例

### 完整阅读流程

```typescript
import { EpubReader } from 'epub-reader-core';

class EpubViewer {
  private reader = new EpubReader();
  private currentChapter = 0;
  
  async loadBook(file: File) {
    try {
      await this.reader.load(file);
      this.displayBookInfo();
      await this.displayChapter(0);
    } catch (error) {
      console.error('加载图书失败：', error);
    }
  }
  
  private displayBookInfo() {
    const metadata = this.reader.getMetadata();
    const chapters = this.reader.getChapters();
    
    console.log(`已加载：《${metadata?.title}》作者：${metadata?.creator}`);
    console.log(`总章节数：${chapters.length}`);
  }
  
  async displayChapter(index: number) {
    const chapters = this.reader.getChapters();
    if (index >= 0 && index < chapters.length) {
      try {
        const content = await this.reader.getChapterContentByIndex(index);
        this.currentChapter = index;
        this.renderContent(content);
      } catch (error) {
        console.error('加载章节失败：', error);
      }
    }
  }
  
  async nextChapter() {
    const chapters = this.reader.getChapters();
    if (this.currentChapter < chapters.length - 1) {
      await this.displayChapter(this.currentChapter + 1);
    }
  }
  
  async previousChapter() {
    if (this.currentChapter > 0) {
      await this.displayChapter(this.currentChapter - 1);
    }
  }
  
  private renderContent(htmlContent: string) {
    const container = document.getElementById('chapter-content');
    if (container) {
      container.innerHTML = htmlContent;
    }
  }
}

// 使用
const viewer = new EpubViewer();
const fileInput = document.getElementById('file-input') as HTMLInputElement;
fileInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    await viewer.loadBook(file);
  }
});
```

### 错误处理

```typescript
import { EpubReader, EpubMetadata } from 'epub-reader-core';

async function safeEpubOperation(file: File): Promise<{
  success: boolean;
  metadata?: EpubMetadata;
  error?: string;
}> {
  const reader = new EpubReader();
  
  try {
    await reader.load(file);
    const metadata = reader.getMetadata();
    
    if (!metadata?.title) {
      return {
        success: false,
        error: '未找到标题'
      };
    }
    
    return { success: true, metadata };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return {
      success: false,
      error: `加载 EPUB 失败：${errorMessage}`
    };
  }
}

// 使用
const result = await safeEpubOperation(file);
if (result.success) {
  console.log('图书已加载：', result.metadata?.title);
} else {
  console.error('错误：', result.error);
}
```

### 高级资源管理

```typescript
class AdvancedEpubReader {
  private reader: EpubReader;
  private resourceCache = new Map<string, string>();
  
  constructor(options?: any) {
    this.reader = new EpubReader(options);
  }
  
  async load(file: File): Promise<void> {
    await this.reader.load(file);
    await this.preloadCriticalResources();
  }
  
  private async preloadCriticalResources(): Promise<void> {
    // 预加载封面图片
    try {
      const cover = await this.reader.getCoverImage();
      if (cover) {
        console.log('封面图片已加载');
      }
    } catch (error) {
      console.warn('预加载封面失败：', error);
    }
    
    // 预加载第一章
    try {
      const firstChapter = await this.reader.getChapterContentByIndex(0);
      this.preloadChapterResources(firstChapter);
    } catch (error) {
      console.warn('预加载第一章失败：', error);
    }
  }
  
  private preloadChapterResources(htmlContent: string): void {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // 查找并预加载图片
    const images = doc.querySelectorAll('img[src]');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        this.loadResourceAsync(src);
      }
    });
  }
  
  private async loadResourceAsync(href: string): Promise<string | null> {
    if (this.resourceCache.has(href)) {
      return this.resourceCache.get(href)!;
    }
    
    try {
      const resourceData = await this.reader.getResource(href);
      if (resourceData) {
        this.resourceCache.set(href, resourceData);
        return resourceData;
      }
    } catch (error) {
      console.warn(`加载资源 ${href} 失败：`, error);
    }
    
    return null;
  }
  
  getReader(): EpubReader {
    return this.reader;
  }
  
  getCacheStats(): { size: number; items: string[] } {
    return {
      size: this.resourceCache.size,
      items: Array.from(this.resourceCache.keys())
    };
  }
}
```

## 最佳实践

1. **始终使用 try-catch 块** 加载 EPUB 文件或章节内容时
2. **检查返回值** - 方法在没有数据时可能返回 null
3. **尽可能缓存章节内容** 以避免重复加载
4. **调用 `getChapterContentByIndex()` 前验证索引**
5. **优雅地处理资源加载失败** - 某些资源可能不存在

## 性能考虑

- EPUB 文件可能很大，考虑懒加载章节内容
- 为频繁访问的图片和资源使用资源缓存
- 预加载关键资源（封面、第一章）以获得更好的用户体验
- 在切换不同的 EPUB 文件时清除缓存

## 浏览器兼容性

EpubReader 类在支持 ES2020+ 的所有现代浏览器中运行：
- Chrome 80+
- Firefox 72+
- Safari 13.1+
- Edge 80+

## 另见

- [类型参考](/api/types) - 类型定义
- [指南](/guide/) - 使用指南和示例
- [示例](/examples/) - 完整实现示例