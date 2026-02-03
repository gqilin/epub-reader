# Reading Chapters

Learn how to access and display chapter content from EPUB files.

## Chapter Structure

EPUB chapters are typically HTML files that contain the book's content. Each chapter has:

```typescript
interface EpubChapter {
  id: string;      // Unique identifier
  href: string;    // File path within EPUB
  title?: string;  // Optional title from manifest
  order: number;   // Reading order
}
```

## Getting Chapter Information

### List All Chapters

```typescript
import { EpubReader } from 'epub-reader-core';

const reader = new EpubReader();
await reader.load(epubFile);

const chapters = reader.getChapters();
console.log(`Book contains ${chapters.length} chapters:`);

chapters.forEach((chapter, index) => {
  console.log(`Chapter ${index + 1}:`);
  console.log(`  ID: ${chapter.id}`);
  console.log(`  Href: ${chapter.href}`);
  console.log(`  Order: ${chapter.order}`);
  if (chapter.title) {
    console.log(`  Title: ${chapter.title}`);
  }
});
```

### Get Chapter Titles

```typescript
function getChapterTitles(reader: EpubReader): Array<{index: number; title: string}> {
  const chapters = reader.getChapters();
  const toc = reader.getTableOfContents();
  
  return chapters.map((chapter, index) => {
    // Try to find title from table of contents
    const tocItem = toc.find(item => item.href.includes(chapter.href.split('/').pop() || ''));
    const title = tocItem?.title || chapter.title || `Chapter ${index + 1}`;
    
    return { index, title };
  });
}

const chapterTitles = getChapterTitles(reader);
console.log(chapterTitles);
```

## Reading Chapter Content

### By Index

```typescript
async function readChapterByIndex(reader: EpubReader, index: number): Promise<string> {
  try {
    const content = await reader.getChapterContentByIndex(index);
    return content;
  } catch (error) {
    console.error(`Failed to read chapter ${index}:`, error);
    throw error;
  }
}

// Usage
const firstChapter = await readChapterByIndex(reader, 0);
console.log('First chapter content:', firstChapter.substring(0, 100) + '...');
```

### By Href

```typescript
async function readChapterByHref(reader: EpubReader, href: string): Promise<string> {
  try {
    const content = await reader.getChapterContent(href);
    return content;
  } catch (error) {
    console.error(`Failed to read chapter ${href}:`, error);
    throw error;
  }
}

// Usage
const chapters = reader.getChapters();
const firstChapter = await readChapterByHref(reader, chapters[0].href);
```

### Safe Chapter Reading

```typescript
async function safeReadChapter(reader: EpubReader, index: number): Promise<string | null> {
  const chapters = reader.getChapters();
  
  // Validate index
  if (index < 0 || index >= chapters.length) {
    console.error(`Chapter index ${index} out of range (0-${chapters.length - 1})`);
    return null;
  }
  
  try {
    return await reader.getChapterContentByIndex(index);
  } catch (error) {
    console.error(`Error reading chapter ${index}:`, error);
    return null;
  }
}
```

## Content Processing

### HTML Content Handling

Chapter content is typically HTML. Here's how to process it:

```typescript
function processChapterContent(htmlContent: string): {
  text: string;
  html: string;
  wordCount: number;
  images: string[];
} {
  // Extract plain text
  const text = htmlContent.replace(/<[^>]*>/g, '').trim();
  
  // Count words
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  
  // Extract image sources
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

// Usage
const content = await reader.getChapterContentByIndex(0);
const processed = processChapterContent(content);
console.log(`Word count: ${processed.wordCount}`);
console.log(`Images found: ${processed.images.length}`);
```

### Sanitize Content

For security, you might want to sanitize HTML content:

```typescript
function sanitizeHtml(html: string): string {
  // Remove script tags and potentially dangerous content
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/<iframe\b[^>]*>/gi, ''); // Remove iframes
}

const sanitized = sanitizeHtml(content);
```

### Content Preview

Generate a preview of chapter content:

```typescript
function generatePreview(htmlContent: string, maxLength: number = 300): string {
  // Remove HTML tags and truncate
  const text = htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

// Usage
const preview = generatePreview(content, 150);
console.log('Preview:', preview);
```

## Navigation

### Chapter Navigation Class

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
      console.error(`Failed to read chapter ${index}:`, error);
      return null;
    }
  }
}
```

### Progress Tracking

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
    return `Chapter ${this.currentChapter + 1} of ${this.totalChapters} (${Math.round(this.getProgress())}%)`;
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

## Display Content

### Vue 3 Example

```vue
<template>
  <div class="chapter-reader">
    <div class="chapter-header">
      <h2>{{ currentChapterTitle }}</h2>
      <div class="navigation">
        <button @click="previousChapter" :disabled="currentChapterIndex === 0">
          Previous
        </button>
        <span class="progress">
          {{ currentChapterIndex + 1 }} / {{ totalChapters }}
        </span>
        <button @click="nextChapter" :disabled="currentChapterIndex >= totalChapters - 1">
          Next
        </button>
      </div>
    </div>
    
    <div class="chapter-content" v-html="chapterContent"></div>
    
    <div v-if="loading" class="loading">Loading chapter...</div>
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
    error.value = 'Failed to load chapter';
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
  return tocItem?.title || chapter.title || `Chapter ${index + 1}`;
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

## Performance Optimization

### Lazy Loading

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
    // Return cached content if available
    if (this.loadedChapters.has(index)) {
      return this.loadedChapters.get(index)!;
    }
    
    // Load and cache the chapter
    const content = await this.reader.getChapterContentByIndex(index);
    this.loadedChapters.set(index, content);
    
    return content;
  }
  
  preloadAdjacent(currentIndex: number): Promise<void>[] {
    const promises: Promise<void>[] = [];
    
    // Preload previous chapter
    if (currentIndex > 0 && !this.loadedChapters.has(currentIndex - 1)) {
      promises.push(
        this.getChapter(currentIndex - 1).then(() => {})
      );
    }
    
    // Preload next chapter
    if (currentIndex < this.chapters.length - 1 && !this.loadedChapters.has(currentIndex + 1)) {
      promises.push(
        this.getChapter(currentIndex + 1).then(() => {})
      );
    }
    
    return promises;
  }
}
```

## Complete Chapter Management Example

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
  
  // Navigation
  async goToChapter(index: number): Promise<string> {
    if (index < 0 || index >= this.chapters.length) {
      throw new Error(`Chapter index ${index} out of range`);
    }
    
    this.currentIndex = index;
    return this.getCurrentChapter();
  }
  
  async nextChapter(): Promise<string> {
    if (this.currentIndex >= this.chapters.length - 1) {
      throw new Error('Already at last chapter');
    }
    
    return this.goToChapter(this.currentIndex + 1);
  }
  
  async previousChapter(): Promise<string> {
    if (this.currentIndex <= 0) {
      throw new Error('Already at first chapter');
    }
    
    return this.goToChapter(this.currentIndex - 1);
  }
  
  // Content access
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
  
  // Chapter information
  getChapterTitle(index: number): string {
    const chapter = this.chapters[index];
    if (!chapter) return 'Unknown Chapter';
    
    const toc = this.reader.getTableOfContents();
    const tocItem = toc.find(item => 
      item.href.includes(chapter.href.split('/').pop() || '')
    );
    
    return tocItem?.title || chapter.title || `Chapter ${index + 1}`;
  }
  
  // Statistics
  getTotalChapters(): number {
    return this.chapters.length;
  }
  
  getCurrentIndex(): number {
    return this.currentIndex;
  }
  
  getProgress(): number {
    return ((this.currentIndex + 1) / this.chapters.length) * 100;
  }
  
  // Utility
  clearCache(): void {
    this.cache.clear();
  }
}
```

## Next Steps

Now that you understand chapter reading:

- [Table of Contents](/guide/table-of-contents) - Navigate complex book structures
- [Resources & Images](/guide/resources) - Handle embedded assets
- [API Reference](/api/epub-reader) - Explore all available methods