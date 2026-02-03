# Table of Contents

Learn how to work with EPUB table of contents (TOC) structures for navigation.

## Table of Contents Structure

EPUB table of contents can have hierarchical structures with nested items:

```typescript
interface EpubTableOfContents {
  id: string;                       // Unique identifier
  href: string;                     // Chapter file reference
  title: string;                    // Display title
  children?: EpubTableOfContents[];  // Nested items
  order: number;                    // Display order
}
```

## Basic TOC Access

### Get Complete TOC

```typescript
import { EpubReader } from 'epub-reader-core';

const reader = new EpubReader();
await reader.load(epubFile);

const toc = reader.getTableOfContents();
console.log(`Table of contents has ${toc.length} top-level items`);

toc.forEach((item, index) => {
  console.log(`${index + 1}. ${item.title} (${item.href})`);
  if (item.children) {
    console.log(`   └─ ${item.children.length} sub-items`);
  }
});
```

### Display Hierarchical TOC

```typescript
function printToc(items: EpubTableOfContents[], level: number = 0): void {
  items.forEach(item => {
    const indent = '  '.repeat(level);
    const prefix = level === 0 ? '•' : '├─';
    console.log(`${indent}${prefix} ${item.title}`);
    
    if (item.children && item.children.length > 0) {
      printToc(item.children, level + 1);
    }
  });
}

printToc(toc);
```

## TOC Navigation

### Find TOC Items

```typescript
function findTocItem(
  toc: EpubTableOfContents[], 
  href: string
): EpubTableOfContents | null {
  for (const item of toc) {
    if (item.href.includes(href)) {
      return item;
    }
    
    if (item.children) {
      const found = findTocItem(item.children, href);
      if (found) return found;
    }
  }
  return null;
}

// Usage
const chapters = reader.getChapters();
const firstChapterToc = findTocItem(toc, chapters[0].href);
console.log('TOC item for first chapter:', firstChapterToc?.title);
```

### Flatten TOC for Simple Navigation

```typescript
function flattenToc(toc: EpubTableOfContents[]): Array<{
  item: EpubTableOfContents;
  level: number;
  order: number;
}> {
  const result: Array<{ item: EpubTableOfContents; level: number; order: number }> = [];
  
  function traverse(items: EpubTableOfContents[], level: number = 0) {
    items.forEach((item, index) => {
      result.push({ item, level, order: result.length });
      
      if (item.children) {
        traverse(item.children, level + 1);
      }
    });
  }
  
  traverse(toc);
  return result;
}

const flatToc = flattenToc(toc);
console.log('Flattened TOC:', flatToc.map(f => `${f.order}. ${f.item.title}`));
```

### Search TOC

```typescript
function searchToc(toc: EpubTableOfContents[], searchTerm: string): EpubTableOfContents[] {
  const results: EpubTableOfContents[] = [];
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  function search(items: EpubTableOfContents[]) {
    items.forEach(item => {
      if (item.title.toLowerCase().includes(lowerSearchTerm)) {
        results.push(item);
      }
      
      if (item.children) {
        search(item.children);
      }
    });
  }
  
  search(toc);
  return results;
}

// Usage
const searchResults = searchToc(toc, 'chapter');
console.log('Search results:', searchResults.map(item => item.title));
```

## TOC-Based Navigation

### TOC Navigation Component

```typescript
class TocNavigator {
  private toc: EpubTableOfContents[];
  private currentIndex: number = 0;
  private flatToc: Array<{ item: EpubTableOfContents; level: number; order: number }>;
  
  constructor(toc: EpubTableOfContents[]) {
    this.toc = toc;
    this.flatToc = this.flattenToc(toc);
  }
  
  getTocItems(): EpubTableOfContents[] {
    return this.toc;
  }
  
  getFlatToc(): Array<{ item: EpubTableOfContents; level: number; order: number }> {
    return this.flatToc;
  }
  
  findTocByHref(href: string): { item: EpubTableOfContents; index: number } | null {
    const index = this.flatToc.findIndex(f => f.item.href.includes(href));
    if (index === -1) return null;
    
    return { item: this.flatToc[index].item, index };
  }
  
  getTocByOrder(order: number): EpubTableOfContents | null {
    const tocItem = this.flatToc.find(f => f.order === order);
    return tocItem?.item || null;
  }
  
  nextTocItem(): EpubTableOfContents | null {
    if (this.currentIndex < this.flatToc.length - 1) {
      this.currentIndex++;
      return this.flatToc[this.currentIndex].item;
    }
    return null;
  }
  
  previousTocItem(): EpubTableOfContents | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.flatToc[this.currentIndex].item;
    }
    return null;
  }
  
  goToTocItem(order: number): EpubTableOfContents | null {
    const item = this.getTocByOrder(order);
    if (item) {
      this.currentIndex = this.flatToc.findIndex(f => f.item === item);
    }
    return item;
  }
  
  private flattenToc(toc: EpubTableOfContents[]): Array<{ item: EpubTableOfContents; level: number; order: number }> {
    const result: Array<{ item: EpubTableOfContents; level: number; order: number }> = [];
    
    function traverse(items: EpubTableOfContents[], level: number = 0) {
      items.forEach(item => {
        result.push({ item, level, order: result.length });
        
        if (item.children) {
          traverse(item.children, level + 1);
        }
      });
    }
    
    traverse(toc);
    return result;
  }
}
```

### Reading Progress with TOC

```typescript
class TocReadingProgress {
  private tocNavigator: TocNavigator;
  private readItems = new Set<string>();
  
  constructor(toc: EpubTableOfContents[]) {
    this.tocNavigator = new TocNavigator(toc);
  }
  
  markAsRead(tocId: string): void {
    this.readItems.add(tocId);
  }
  
  isRead(tocId: string): boolean {
    return this.readItems.has(tocId);
  }
  
  getProgress(): { read: number; total: number; percentage: number } {
    const flatToc = this.tocNavigator.getFlatToc();
    const total = flatToc.length;
    const read = flatToc.filter(f => this.isRead(f.item.id)).length;
    
    return {
      read,
      total,
      percentage: total > 0 ? (read / total) * 100 : 0
    };
  }
  
  getNextUnreadItem(): EpubTableOfContents | null {
    const flatToc = this.tocNavigator.getFlatToc();
    return flatToc.find(f => !this.isRead(f.item.id))?.item || null;
  }
  
  getReadItems(): EpubTableOfContents[] {
    const flatToc = this.tocNavigator.getFlatToc();
    return flatToc.filter(f => this.isRead(f.item.id)).map(f => f.item);
  }
}
```

## UI Integration

### Vue 3 TOC Component

```vue
<template>
  <div class="table-of-contents">
    <h3>Table of Contents</h3>
    <div class="toc-list">
      <div
        v-for="(tocItem, index) in flatToc"
        :key="tocItem.item.id"
        class="toc-item"
        :class="[
          `toc-level-${tocItem.level}`,
          { 'toc-current': tocItem.item.href === currentChapterHref },
          { 'toc-read': isRead(tocItem.item.id) }
        ]"
        @click="navigateToChapter(tocItem.item.href)"
      >
        <span class="toc-number">{{ index + 1 }}.</span>
        <span class="toc-title">{{ tocItem.item.title }}</span>
        <span v-if="isRead(tocItem.item.id)" class="toc-read-indicator">✓</span>
      </div>
    </div>
    
    <div class="toc-progress">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${progress.percentage}%` }"
        ></div>
      </div>
      <span class="progress-text">
        {{ progress.read }} / {{ progress.total }} chapters read
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { EpubReader } from 'epub-reader-core';

const props = defineProps<{ reader: EpubReader }>();

const currentChapterHref = ref('');
const readItems = ref(new Set<string>());

const toc = computed(() => props.reader.getTableOfContents());
const flatToc = computed(() => flattenToc(toc.value));

const progress = computed(() => {
  const total = flatToc.value.length;
  const read = flatToc.value.filter(f => readItems.value.has(f.item.id)).length;
  
  return {
    read,
    total,
    percentage: total > 0 ? (read / total) * 100 : 0
  };
});

const flattenToc = (toc: any[]) => {
  const result: Array<{ item: any; level: number }> = [];
  
  function traverse(items: any[], level: number = 0) {
    items.forEach(item => {
      result.push({ item, level });
      if (item.children) {
        traverse(item.children, level + 1);
      }
    });
  }
  
  traverse(toc);
  return result;
};

const navigateToChapter = async (href: string) => {
  currentChapterHref.value = href;
  markAsRead(href);
  // Emit event to parent to load chapter
  emit('chapter-selected', href);
};

const markAsRead = (href: string) => {
  const tocItem = flatToc.value.find(f => f.item.href.includes(href));
  if (tocItem) {
    readItems.value.add(tocItem.item.id);
  }
};

const isRead = (id: string) => {
  return readItems.value.has(id);
};

onMounted(() => {
  // Load saved progress
  const saved = localStorage.getItem(`toc-progress-${getBookId()}`);
  if (saved) {
    readItems.value = new Set(JSON.parse(saved));
  }
});

const getBookId = () => {
  const metadata = props.reader.getMetadata();
  return metadata?.identifier || metadata?.title || 'unknown';
};

// Save progress when it changes
watch(readItems, (newReadItems) => {
  localStorage.setItem(
    `toc-progress-${getBookId()}`,
    JSON.stringify(Array.from(newReadItems))
  );
}, { deep: true });
</script>

<style scoped>
.table-of-contents {
  padding: 1rem;
  border-right: 1px solid #eee;
  height: 100%;
  overflow-y: auto;
}

.toc-list {
  margin: 1rem 0;
}

.toc-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.toc-item:hover {
  background-color: #f5f5f5;
}

.toc-level-0 {
  font-weight: bold;
}

.toc-level-1 {
  margin-left: 1.5rem;
  font-weight: 500;
}

.toc-level-2 {
  margin-left: 3rem;
  font-size: 0.9rem;
}

.toc-current {
  background-color: #e3f2fd;
  color: #1976d2;
}

.toc-read {
  color: #666;
}

.toc-number {
  margin-right: 0.5rem;
  color: #999;
  font-size: 0.8rem;
}

.toc-title {
  flex: 1;
}

.toc-read-indicator {
  color: #4caf50;
  font-weight: bold;
}

.toc-progress {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: #eee;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #666;
}
</style>
```

## Advanced TOC Operations

### TOC Synchronization with Chapters

```typescript
class TocChapterSync {
  private toc: EpubTableOfContents[];
  private chapters: EpubChapter[];
  private tocByChapter = new Map<string, EpubTableOfContents>();
  
  constructor(toc: EpubTableOfContents[], chapters: EpubChapter[]) {
    this.toc = toc;
    this.chapters = chapters;
    this.buildMapping();
  }
  
  private buildMapping(): void {
    function mapToc(tocItems: EpubTableOfContents[]) {
      tocItems.forEach(tocItem => {
        // Try to find matching chapter
        const chapter = this.chapters.find(ch => 
          ch.href.includes(tocItem.href) || tocItem.href.includes(ch.href.split('/').pop() || '')
        );
        
        if (chapter) {
          this.tocByChapter.set(chapter.href, tocItem);
        }
        
        if (tocItem.children) {
          mapToc.call(this, tocItem.children);
        }
      });
    }
    
    mapToc.call(this, this.toc);
  }
  
  getTocForChapter(chapterHref: string): EpubTableOfContents | undefined {
    return this.tocByChapter.get(chapterHref);
  }
  
  getChapterForToc(tocId: string): EpubChapter | undefined {
    const tocItem = this.findTocById(this.toc, tocId);
    if (!tocItem) return undefined;
    
    return this.chapters.find(ch => 
      ch.href.includes(tocItem.href) || tocItem.href.includes(ch.href.split('/').pop() || '')
    );
  }
  
  private findTocById(tocItems: EpubTableOfContents[], id: string): EpubTableOfContents | null {
    for (const item of tocItems) {
      if (item.id === id) return item;
      if (item.children) {
        const found = this.findTocById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }
}
```

### TOC Bookmarks

```typescript
class TocBookmarks {
  private bookmarks = new Map<string, { position: number; note?: string }>();
  
  addBookmark(tocId: string, position: number = 0, note?: string): void {
    this.bookmarks.set(tocId, { position, note });
  }
  
  removeBookmark(tocId: string): void {
    this.bookmarks.delete(tocId);
  }
  
  getBookmark(tocId: string): { position: number; note?: string } | undefined {
    return this.bookmarks.get(tocId);
  }
  
  hasBookmark(tocId: string): boolean {
    return this.bookmarks.has(tocId);
  }
  
  getAllBookmarks(): Array<{ tocId: string; bookmark: { position: number; note?: string } }> {
    return Array.from(this.bookmarks.entries()).map(([tocId, bookmark]) => ({
      tocId,
      bookmark
    }));
  }
  
  exportBookmarks(): string {
    return JSON.stringify(Object.fromEntries(this.bookmarks));
  }
  
  importBookmarks(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.bookmarks = new Map(Object.entries(parsed));
    } catch (error) {
      console.error('Failed to import bookmarks:', error);
    }
  }
}
```

## Complete TOC Management

```typescript
import { EpubReader, EpubTableOfContents, EpubChapter } from 'epub-reader-core';

export class EpubTocManager {
  private reader: EpubReader;
  private toc: EpubTableOfContents[];
  private chapters: EpubChapter[];
  private tocNavigator: TocNavigator;
  private tocSync: TocChapterSync;
  private bookmarks: TocBookmarks;
  
  constructor(reader: EpubReader) {
    this.reader = reader;
    this.toc = reader.getTableOfContents();
    this.chapters = reader.getChapters();
    this.tocNavigator = new TocNavigator(this.toc);
    this.tocSync = new TocChapterSync(this.toc, this.chapters);
    this.bookmarks = new TocBookmarks();
  }
  
  // Navigation
  navigateToTocItem(tocId: string): Promise<string> {
    const tocItem = this.findTocById(tocId);
    if (!tocItem) throw new Error(`TOC item ${tocId} not found`);
    
    const chapter = this.tocSync.getChapterForToc(tocId);
    if (!chapter) throw new Error(`Chapter for TOC ${tocId} not found`);
    
    return this.reader.getChapterContent(chapter.href);
  }
  
  // TOC operations
  getTocItems(): EpubTableOfContents[] {
    return this.toc;
  }
  
  getFlatToc(): Array<{ item: EpubTableOfContents; level: number; order: number }> {
    return this.tocNavigator.getFlatToc();
  }
  
  searchToc(searchTerm: string): EpubTableOfContents[] {
    return this.searchToc(this.toc, searchTerm);
  }
  
  // Chapter-TOC sync
  getTocForChapter(chapterHref: string): EpubTableOfContents | undefined {
    return this.tocSync.getTocForChapter(chapterHref);
  }
  
  // Bookmarks
  addBookmark(tocId: string, note?: string): void {
    this.bookmarks.addBookmark(tocId, 0, note);
  }
  
  removeBookmark(tocId: string): void {
    this.bookmarks.removeBookmark(tocId);
  }
  
  getBookmark(tocId: string): { position: number; note?: string } | undefined {
    return this.bookmarks.getBookmark(tocId);
  }
  
  getAllBookmarks(): Array<{ tocId: string; bookmark: { position: number; note?: string } }> {
    return this.bookmarks.getAllBookmarks();
  }
  
  // Utility methods
  private findTocById(tocItems: EpubTableOfContents[], id: string): EpubTableOfContents | null {
    for (const item of tocItems) {
      if (item.id === id) return item;
      if (item.children) {
        const found = this.findTocById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }
  
  private searchToc(tocItems: EpubTableOfContents[], searchTerm: string): EpubTableOfContents[] {
    const results: EpubTableOfContents[] = [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    function search(items: EpubTableOfContents[]) {
      items.forEach(item => {
        if (item.title.toLowerCase().includes(lowerSearchTerm)) {
          results.push(item);
        }
        
        if (item.children) {
          search(item.children);
        }
      });
    }
    
    search(tocItems);
    return results;
  }
}
```

## Next Steps

Now that you understand table of contents handling:

- [Resources & Images](/guide/resources) - Work with embedded assets
- [API Reference](/api/epub-reader) - Explore all available methods
- [Examples](/examples/vue3) - See complete implementations