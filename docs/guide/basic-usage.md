# 基础用法

本指南涵盖使用 EPUB Reader Core 将要执行的基本操作。

## 加载 EPUB 文件

### 从文件输入

最常见的加载 EPUB 文件的方式是通过文件输入元素：

```typescript
import { EpubReader } from 'epub-reader-core';

const reader = new EpubReader();

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (file && file.type === 'application/epub+zip') {
    try {
      await reader.load(file);
      console.log('EPUB 加载成功！');
    } catch (error) {
      console.error('加载 EPUB 失败：', error);
    }
  }
}

// 使用
document.getElementById('file-input')?.addEventListener('change', handleFileSelect);
```

### 从 Fetch 响应

你也可以从网络请求加载 EPUB 文件：

```typescript
async function loadFromUrl(url: string) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    await reader.load(arrayBuffer);
    
    const metadata = reader.getMetadata();
    console.log('已加载：', metadata.title);
  } catch (error) {
    console.error('从 URL 加载失败：', error);
  }
}
```

### 拖拽功能

实现拖拽功能：

```typescript
const dropZone = document.getElementById('drop-zone');

dropZone?.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone?.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone?.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  
  const file = e.dataTransfer?.files[0];
  if (file && file.type === 'application/epub+zip') {
    await reader.load(file);
    // 处理已加载的 EPUB
  }
});
```

## 提取图书信息

### 元数据

一旦加载完成，你可以访问全面的图书元数据：

```typescript
const metadata = reader.getMetadata();

if (metadata) {
  console.log('图书信息：');
  console.log('标题：', metadata.title);
  console.log('作者：', metadata.creator);
  console.log('出版社：', metadata.publisher);
  console.log('语言：', metadata.language);
  console.log('描述：', metadata.description);
  console.log('发布日期：', metadata.date);
  console.log('标识符：', metadata.identifier);
  console.log('版权：', metadata.rights);
}
```

### 章节

获取图书中的章节列表：

```typescript
const chapters = reader.getChapters();

console.log(`图书包含 ${chapters.length} 个章节：`);
chapters.forEach((chapter, index) => {
  console.log(`第 ${index + 1} 章：${chapter.id} (${chapter.href})`);
});
```

### 目录

访问分层的目录结构：

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

## 阅读章节内容

### 按索引阅读

通过索引阅读章节：

```typescript
async function readFirstChapter() {
  try {
    const content = await reader.getChapterContentByIndex(0);
    console.log('第一章内容：', content.substring(0, 100) + '...');
  } catch (error) {
    console.error('阅读章节失败：', error);
  }
}
```

### 按链接阅读

通过文件路径阅读章节：

```typescript
const chapters = reader.getChapters();

async function readChapterByHref(href: string) {
  try {
    const content = await reader.getChapterContent(chapterHref);
    return content;
  } catch (error) {
    console.error(`阅读章节失败 ${href}：`, error);
    return null;
  }
}
```

### 安全章节阅读

```typescript
async function safeReadChapter(reader: EpubReader, index: number): Promise<string | null> {
  const chapters = reader.getChapters();
  
  // 验证索引
  if (index < 0 || index >= chapters.length) {
    console.error(`章节索引 ${index} 超出范围 (0-${chapters.length - 1})`);
    return null;
  }
  
  try {
    return await reader.getChapterContentByIndex(index);
  } catch (error) {
    console.error(`读取第 ${index} 章节时出错：`, error);
    return null;
  }
}
```

## 内容处理

### HTML 内容处理

章节内容通常是 HTML。以下是处理它的方法：

```typescript
function processChapterContent(htmlContent: string): {
  text: string;
  html: string;
  wordCount: number;
  images: string[];
} {
  // 提取纯文本
  const text = htmlContent.replace(/<[^>]*>/g, '').trim();
  
  // 计算字数
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  
  // 提取图片源
  const imgRegex = /<img[^>]+src="([^"]+)"/g;
  const images: string[] = [];
  let match;
  while ((match = imgRegex.exec(htmlContent)) !== null) {
    images.push(match[1]);
  }
  
  return {
    text,
    html: htmlContent,
    wordCount,
    images
  };
}

// 使用
const content = await reader.getChapterContentByIndex(0);
const processed = processChapterContent(content);
console.log(`字数统计：${processed.wordCount}`);
console.log(`找到图片：${processed.images.length}`);
```

### 内容清理

出于安全考虑，你可能需要清理 HTML 内容：

```typescript
function sanitizeHtml(html: string): string {
  // 移除脚本标签和潜在危险内容
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '') // 移除事件处理器
    .replace(/javascript:/gi, '') // 移除 javascript: URLs
    .replace(/<iframe\b[^>]*>/gi, ''); // 移除 iframes
}

const sanitized = sanitizeHtml(content);
```

### 内容预览

生成章节内容预览：

```typescript
function generatePreview(htmlContent: string, maxLength: number = 300): string {
  // 移除 HTML 标签并截断
  const text = htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

// 使用
const preview = generatePreview(content, 150);
console.log('预览：', preview);
```

## 导航

### 章节导航类

```typescript
class ChapterNavigator {
  private reader: EpubReader;
  private currentIndex: number = 0;
  
  constructor(reader: EpubReader) {
    this.reader = reader;
  }
  
  async getCurrentChapter(): Promise<string | null> {
    return this.safeReadChapter(this.currentIndex);
  }
  
  async nextChapter(): Promise<string | null> {
    const chapters = this.reader.getChapters();
    if (this.currentIndex < chapters.length - 1) {
      this.currentIndex++;
      return this.getCurrentChapter();
    }
    return null;
  }
  
  async previousChapter(): Promise<string | null> {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.getCurrentChapter();
    }
    return null;
  }
  
  async goToChapter(index: number): Promise<string | null> {
    const chapters = this.reader.getChapters();
    if (index >= 0 && index < chapters.length) {
      this.currentIndex = index;
      return this.getCurrentChapter();
    }
    return null;
  }
  
  getCurrentIndex(): number {
    return this.currentIndex;
  }
  
  getTotalChapters(): number {
    return this.reader.getChapters().length;
  }
  
  private async safeReadChapter(index: number): Promise<string | null> {
    try {
      return await this.reader.getChapterContentByIndex(index);
    } catch (error) {
      console.error(`读取章节 ${index} 失败：`, error);
      return null;
    }
  }
}
```

### 进度跟踪

```typescript
class ReadingProgress {
  private totalChapters: number;
  private currentChapter: number = 0;
  private bookmarks: Set<number> = new Set();
  
  constructor(totalChapters: number) {
    this.totalChapters = totalChapters;
  }
  
  setCurrentChapter(index: number) {
    this.currentChapter = index;
  }
  
  getProgress(): number {
    return ((this.currentChapter + 1) / this.totalChapters) * 100;
  }
  
  getProgressText(): string {
    return `第 ${this.currentChapter + 1} 章，共 ${this.totalChapters} 章 (${Math.round(this.getProgress())}%)`;
  }
  
  toggleBookmark(chapterIndex: number) {
    if (this.bookmarks.has(chapterIndex)) {
      this.bookmarks.delete(chapterIndex);
    } else {
      this.bookmarks.add(chapterIndex);
    }
  }
  
  isBookmarked(chapterIndex: number): boolean {
    return this.bookmarks.has(chapterIndex);
  }
  
  getBookmarks(): number[] {
    return Array.from(this.bookmarks).sort((a, b) => a - b);
  }
}
```

## 显示内容

### Vue 3 示例

```vue
<template>
  <div class="chapter-reader">
    <div class="chapter-header">
      <h2>{{ currentChapterTitle }}</h2>
      <div class="navigation">
        <button @click="previousChapter" :disabled="currentChapterIndex === 0">
          上一章
        </button>
        <span class="progress">
          {{ currentChapterIndex + 1 }} / {{ totalChapters }}
        </span>
        <button @click="nextChapter" :disabled="currentChapterIndex >= totalChapters - 1">
          下一章
        </button>
      </div>
    </div>
    
    <div class="chapter-content" v-html="chapterContent"></div>
    
    <div v-if="loading" class="loading">加载章节中...</div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { EpubReader } from 'epub-reader-core';

const props = defineProps<{ reader: EpubReader }>();

const chapters = ref(props.reader.getChapters());
const currentChapterIndex = ref(0);
const chapterContent = ref('');
const loading = ref(false);
const error = ref('');
const currentChapterTitle = ref('');

const totalChapters = computed(() => chapters.value.length);

const loadChapter = async (index: number) => {
  loading.value = true;
  error.value = '';
  
  try {
    chapterContent.value = await props.reader.getChapterContentByIndex(index);
    currentChapterTitle.value = getChapterTitle(chapters.value[index], index);
  } catch (err) {
    error.value = '加载章节失败';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const getChapterTitle = (chapter: EpubChapter, index: number): string => {
  const toc = props.reader.getTableOfContents();
  const tocItem = toc.find(item => 
    item.href.includes(chapter.href.split('/').pop() || '')
  );
  return tocItem?.title || chapter.title || `第 ${index + 1} 章`;
};

const nextChapter = () => {
  if (currentChapterIndex.value < totalChapters.value - 1) {
    currentChapterIndex.value++;
  }
};

const previousChapter = () => {
  if (currentChapterIndex.value > 0) {
    currentChapterIndex.value--;
  }
};

watch(currentChapterIndex, loadChapter);
onMounted(() => loadChapter(0));
</script>
```

## 性能优化

### 懒加载

```typescript
class LazyChapterLoader {
  private reader: EpubReader;
  private loadedChapters = new Map<number, string>();
  private chapters: EpubChapter[];
  
  constructor(reader: EpubReader) {
    this.reader = reader;
    this.chapters = reader.getChapters();
  }
  
  async getChapter(index: number): Promise<string> {
    // 如果可用则返回缓存内容
    if (this.loadedChapters.has(index)) {
      return this.loadedChapters.get(index)!;
    }
    
    // 加载并缓存章节
    const content = await this.reader.getChapterContentByIndex(index);
    this.loadedChapters.set(index, content);
    
    return content;
  }
  
  preloadAdjacent(currentIndex: number): Promise<void>[] {
    const promises: Promise<void>[] = [];
    
    // 预加载上一章
    if (currentIndex > 0 && !this.loadedChapters.has(currentIndex - 1)) {
      promises.push(
        this.getChapter(currentIndex - 1).then(() => {})
      );
    }
    
    // 预加载下一章
    if (currentIndex < this.chapters.length - 1 && !this.loadedChapters.has(currentIndex + 1)) {
      promises.push(
        this.getChapter(currentIndex + 1).then(() => {})
      );
    }
    
    return promises;
  }
}
```

## 完整章节管理示例

```typescript
import { EpubReader, EpubChapter } from 'epub-reader-core';

export class EpubChapterManager {
  private reader: EpubReader;
  private chapters: EpubChapter[];
  private currentIndex: number = 0;
  private cache = new Map<number, string>();
  
  constructor(reader: EpubReader) {
    this.reader = reader;
    this.chapters = reader.getChapters();
  }
  
  // 导航
  async goToChapter(index: number): Promise<string> {
    if (index < 0 || index >= this.chapters.length) {
      throw new Error(`章节索引 ${index} 超出范围`);
    }
    
    this.currentIndex = index;
    return this.getCurrentChapter();
  }
  
  async nextChapter(): Promise<string> {
    if (this.currentIndex >= this.chapters.length - 1) {
      throw new Error('已在最后一章');
    }
    
    return this.goToChapter(this.currentIndex + 1);
  }
  
  async previousChapter(): Promise<string> {
    if (this.currentIndex <= 0) {
      throw new Error('已在第一章');
    }
    
    return this.goToChapter(this.currentIndex - 1);
  }
  
  // 内容访问
  async getCurrentChapter(): Promise<string> {
    return this.loadChapter(this.currentIndex);
  }
  
  private async loadChapter(index: number): Promise<string> {
    if (this.cache.has(index)) {
      return this.cache.get(index)!;
    }
    
    const content = await this.reader.getChapterContentByIndex(index);
    this.cache.set(index, content);
    return content;
  }
  
  // 章节信息
  getChapterTitle(index: number): string {
    const chapter = this.chapters[index];
    if (!chapter) return '未知章节';
    
    const toc = this.reader.getTableOfContents();
    const tocItem = toc.find(item => 
      item.href.includes(chapter.href.split('/').pop() || '')
    );
    
    return tocItem?.title || chapter.title || `第 ${index + 1} 章`;
  }
  
  // 统计
  getTotalChapters(): number {
    return this.chapters.length;
  }
  
  getCurrentIndex(): number {
    return this.currentIndex;
  }
  
  getProgress(): number {
    return ((this.currentIndex + 1) / this.chapters.length) * 100;
  }
  
  // 工具
  clearCache(): void {
    this.cache.clear();
  }
}
```

## 下一步

既然你已经掌握了章节阅读：

- [目录导航](/guide/table-of-contents) - 导航复杂的图书结构
- [资源和图片](/guide/resources) - 处理嵌入式资源
- [API 参考](/api/epub-reader) - 探索所有可用方法