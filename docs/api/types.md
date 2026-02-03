# 类型定义

EPUB Reader Core 的完整类型定义。

## EpubReaderOptions

EpubReader 构造函数的配置选项。

```typescript
interface EpubReaderOptions {
  encoding?: string;    // 文本编码（默认：'utf8'）
  loadCover?: boolean;   // 是否加载封面图片（默认：true）
}
```

### 示例

```typescript
const options: EpubReaderOptions = {
  encoding: 'utf8',
  loadCover: true
};

const reader = new EpubReader(options);
```

## EpubMetadata

从 EPUB 文件提取的图书元数据。

```typescript
interface EpubMetadata {
  title?: string;       // 图书标题
  creator?: string;     // 作者或创建者
  description?: string; // 图书描述
  language?: string;    // 语言代码（如："en", "zh"）
  publisher?: string;   // 出版社名称
  identifier?: string;  // 唯一标识符（ISBN、UUID 等）
  date?: string;        // 发布日期
  rights?: string;      // 版权信息
  cover?: string;       // 封面图片 ID 引用
}
```

### 示例

```typescript
const metadata: EpubMetadata = {
  title: "了不起的盖茨比",
  creator: "F·司各特·菲茨杰拉德",
  description: "一部经典的美国小说",
  language: "en",
  publisher: "Scribner",
  date: "1925-04-10",
  rights: "公共领域"
};
```

## EpubChapter

代表 EPUB 中的单个章节。

```typescript
interface EpubChapter {
  id: string;      // 唯一标识符
  href: string;    // EPUB 内的文件路径
  title?: string;  // 清单中的可选标题
  order: number;   // 阅读顺序
}
```

### 示例

```typescript
const chapter: EpubChapter = {
  id: "chapter-1",
  href: "OEBPS/chapter-1.xhtml",
  title: "第 1 章",
  order: 0
};
```

## EpubManifest

代表 EPUB 清单中的文件。

```typescript
interface EpubManifest {
  id: string;        // 唯一标识符
  href: string;      // EPUB 内的文件路径
  mediaType: string; // MIME 类型（如："application/xhtml+xml"）
}
```

### 示例

```typescript
const manifestItem: EpubManifest = {
  id: "chapter-1",
  href: "chapter-1.xhtml",
  mediaType: "application/xhtml+xml"
};
```

## EpubSpine

代表 EPUB 脊中的项目（阅读顺序）。

```typescript
interface EpubSpine {
  idref: string;    // 对清单项目 ID 的引用
  linear?: string;  // 项目是否属于线性阅读流程
}
```

### 示例

```typescript
const spineItem: EpubSpine = {
  idref: "chapter-1",
  linear: "yes"
};
```

## EpubTableOfContents

代表目录中的项目。

```typescript
interface EpubTableOfContents {
  id: string;                       // 唯一标识符
  href: string;                     // 章节文件引用
  title: string;                    // 显示标题
  children?: EpubTableOfContents[];  // 嵌套项目
  order: number;                    // 显示顺序
}
```

### 示例

```typescript
const tocItem: EpubTableOfContents = {
  id: "toc-chapter-1",
  href: "chapter-1.xhtml",
  title: "第 1 章：开始",
  order: 0,
  children: [
    {
      id: "toc-section-1",
      href: "chapter-1.xhtml#section-1",
      title: "第 1.1 节",
      order: 1
    }
  ]
};
```

## EpubInfo

完整的 EPUB 信息容器。

```typescript
interface EpubInfo {
  metadata: EpubMetadata;              // 图书元数据
  manifest: EpubManifest[];            // 文件清单
  spine: EpubSpine[];                  // 阅读顺序
  toc: EpubTableOfContents[];          // 目录
  chapters: EpubChapter[];             // 章节列表
}
```

### 示例

```typescript
const epubInfo: EpubInfo = {
  metadata: {
    title: "示例图书",
    creator: "示例作者",
    language: "zh"
  },
  manifest: [
    {
      id: "chapter-1",
      href: "chapter-1.xhtml",
      mediaType: "application/xhtml+xml"
    }
  ],
  spine: [
    {
      idref: "chapter-1",
      linear: "yes"
    }
  ],
  toc: [
    {
      id: "toc-chapter-1",
      href: "chapter-1.xhtml",
      title: "第 1 章",
      order: 0
    }
  ],
  chapters: [
    {
      id: "chapter-1",
      href: "chapter-1.xhtml",
      order: 0
    }
  ]
};
```

## 工具类型

### 语言代码类型

EPUB 元数据中使用的常见语言代码：

```typescript
type LanguageCode = 
  | 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja' | 'ko' | 'ru' | 'pt' | 'it'
  | 'ar' | 'he' | 'th' | 'vi' | 'hi' | 'bn' | 'tr' | 'pl' | 'nl' | 'sv'
  | string; // 允许任何字符串作为后备
```

### MIME 类型类型

EPUB 资源的常见 MIME 类型：

```typescript
type MimeType = 
  | 'application/xhtml+xml'
  | 'application/xml'
  | 'text/css'
  | 'text/html'
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/svg+xml'
  | 'application/x-dtbncx+xml' // NCX 目录
  | string; // 允许任何字符串作为后备
```

## 类型守卫

### Is EpubMetadata

检查对象是否为 EpubMetadata 的类型守卫：

```typescript
function isEpubMetadata(obj: any): obj is EpubMetadata {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}
```

### Is EpubChapter

检查对象是否为 EpubChapter 的类型守卫：

```typescript
function isEpubChapter(obj: any): obj is EpubChapter {
  return obj && 
         typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.href === 'string' &&
         typeof obj.order === 'number';
}
```

## 类型工具

### 章节工具

```typescript
interface ChapterUtils {
  getChapterTitle(chapter: EpubChapter, toc: EpubTableOfContents[]): string;
  isChapterInToc(chapter: EpubChapter, toc: EpubTableOfContents[]): boolean;
  getChapterByHref(href: string, chapters: EpubChapter[]): EpubChapter | undefined;
}
```

### 目录工具

```typescript
interface TocUtils {
  flattenToc(toc: EpubTableOfContents[]): EpubTableOfContents[];
  findTocByHref(toc: EpubTableOfContents[], href: string): EpubTableOfContents | null;
  searchToc(toc: EpubTableOfContents[], searchTerm: string): EpubTableOfContents[];
}
```

### 元数据工具

```typescript
interface MetadataUtils {
  formatMetadata(metadata: EpubMetadata): FormattedMetadata;
  parseDate(dateString: string): Date | null;
  getLanguageName(languageCode: string): string;
}

interface FormattedMetadata {
  title: string;
  author: string;
  description: string;
  language: string;
  publisher: string;
  date: string;
  rights: string;
}
```

## 使用示例

### 类型安全的 EPUB 加载

```typescript
import { EpubReader, EpubMetadata, EpubChapter } from 'epub-reader-core';

async function loadEpubSafely(file: File): Promise<{
  success: boolean;
  metadata?: EpubMetadata;
  chapters?: EpubChapter[];
  error?: string;
}> {
  const reader = new EpubReader();
  
  try {
    await reader.load(file);
    
    const metadata = reader.getMetadata();
    const chapters = reader.getChapters();
    
    // 类型检查
    if (!metadata) {
      return { success: false, error: '未找到元数据' };
    }
    
    if (!chapters || chapters.length === 0) {
      return { success: false, error: '未找到章节' };
    }
    
    return { success: true, metadata, chapters };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return { success: false, error: errorMessage };
  }
}
```

### 自定义类型扩展

```typescript
// 使用自定义属性扩展基础类型
interface CustomEpubMetadata extends EpubMetadata {
  tags?: string[];        // 自定义标签
  rating?: number;        // 评分 1-5
  lastRead?: Date;        // 最后阅读时间戳
  isFavorite?: boolean;   // 用户收藏标记
}

interface CustomEpubChapter extends EpubChapter {
  wordCount?: number;     // 章节字数
  readingTime?: number;   // 预估阅读时间（分钟）
  isRead?: boolean;       // 阅读状态
  bookmark?: number;       // 书签位置（字符偏移）
}

// 自定义元数据的类型守卫
function isCustomEpubMetadata(obj: any): obj is CustomEpubMetadata {
  return isEpubMetadata(obj) && (
    (obj.tags === undefined || Array.isArray(obj.tags)) &&
    (obj.rating === undefined || typeof obj.rating === 'number') &&
    (obj.lastRead === undefined || obj.lastRead instanceof Date) &&
    (obj.isFavorite === undefined || typeof obj.isFavorite === 'boolean')
  );
}
```

### 类型安全的资源处理

```typescript
interface ResourceLoader {
  loadImage(href: string): Promise<string | null>;  // 返回数据 URL
  loadCss(href: string): Promise<string | null>;    // 返回 CSS 文本
  loadFont(href: string): Promise<ArrayBuffer | null>; // 返回字体数据
}

class TypedEpubReader {
  private reader: EpubReader;
  
  constructor(options?: EpubReaderOptions) {
    this.reader = new EpubReader(options);
  }
  
  async loadFile(file: File): Promise<EpubInfo> {
    await this.reader.load(file);
    const info = this.reader.getInfo();
    
    if (!info) {
      throw new Error('解析 EPUB 信息失败');
    }
    
    return info;
  }
  
  async getResourceType(href: string): Promise<{
    type: string;
    data: string | ArrayBuffer | null;
  }> {
    // 确定 MIME 类型
    const extension = href.split('.').pop()?.toLowerCase();
    let type = 'application/octet-stream';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        type = 'image/jpeg';
        break;
      case 'png':
        type = 'image/png';
        break;
      case 'css':
        type = 'text/css';
        break;
      case 'js':
        type = 'application/javascript';
        break;
      // ... 更多情况
    }
    
    // 加载资源
    const data = await this.reader.getResource(href);
    
    return { type, data: data ? atob(data) : null };
  }
}
```

## 错误类型

### EPUB 错误类型

用于更好错误处理的自定义错误类型：

```typescript
class EpubLoadError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'EpubLoadError';
  }
}

class EpubParseError extends Error {
  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'EpubParseError';
  }
}

class ChapterNotFoundError extends Error {
  constructor(chapterHref: string) {
    super(`未找到章节：${chapterHref}`);
    this.name = 'ChapterNotFoundError';
  }
}

class ResourceNotFoundError extends Error {
  constructor(resourceHref: string) {
    super(`未找到资源：${resourceHref}`);
    this.name = 'ResourceNotFoundError';
  }
}
```

### 使用类型的错误处理

```typescript
type EpubOperationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: Error;
};

async function safeEpubOperation<T>(
  operation: () => Promise<T>
): Promise<EpubOperationResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error };
    }
    return { 
      success: false, 
      error: new Error('发生未知错误') 
    };
  }
}

// 使用
const result = await safeEpubOperation(() => 
  reader.getChapterContentByIndex(0)
);

if (result.success) {
  console.log('章节内容：', result.data);
} else {
  console.error('加载章节失败：', result.error.message);
}
```

## 另见

- [EpubReader API](/api/epub-reader) - 主要类方法
- [指南](/guide/) - 使用指南和示例
- [示例](/examples/) - 完整实现示例