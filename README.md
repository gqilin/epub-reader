# EPUB Reader Core

A framework-agnostic TypeScript library for parsing and reading EPUB files in web browsers. This library provides a simple API to extract EPUB metadata, table of contents, and chapter content.

## Features

- 📚 Parse EPUB files from various input formats (ArrayBuffer, Uint8Array, Blob, File)
- 🎯 Framework-agnostic - works with any JavaScript framework
- 📖 Extract book metadata (title, author, description, etc.)
- 📑 Parse table of contents with nested structure support
- 📄 Retrieve chapter content by index or href
- 🖼️ Extract cover images
- 🎛️ TypeScript support with full type definitions
- 📦 Lightweight and performant
- 🔧 Tree-shakable and browser-compatible

## Installation

```bash
npm install epub-reader-core
```

## Quick Start

```typescript
import { EpubReader } from 'epub-reader-core';

// Create a new reader instance
const reader = new EpubReader();

// Load an EPUB file
await reader.load(epubFile); // epubFile can be File, ArrayBuffer, or Uint8Array

// Get book information
const metadata = reader.getMetadata();
console.log('Title:', metadata.title);
console.log('Author:', metadata.creator);

// Get chapters
const chapters = reader.getChapters();
console.log('Total chapters:', chapters.length);

// Read chapter content
const firstChapterContent = await reader.getChapterContentByIndex(0);
console.log(firstChapterContent);
```

## API Reference

### EpubReader Class

#### Constructor

```typescript
new EpubReader(options?: EpubReaderOptions)
```

**Options:**
- `encoding?: string` - Text encoding (default: 'utf8')
- `loadCover?: boolean` - Whether to load cover images (default: true)

#### Methods

##### load(epubData)
Load an EPUB file for parsing.

```typescript
await load(epubData: ArrayBuffer | Uint8Array | Blob): Promise<void>
```

##### getInfo()
Get complete EPUB information.

```typescript
getInfo(): EpubInfo | null
```

##### getMetadata()
Get book metadata.

```typescript
getMetadata(): EpubMetadata | null
```

##### getChapters()
Get list of chapters.

```typescript
getChapters(): EpubChapter[]
```

##### getTableOfContents()
Get table of contents structure.

```typescript
getTableOfContents(): EpubTableOfContents[]
```

##### getChapterContent(href)
Get chapter content by href.

```typescript
await getChapterContent(chapterHref: string): Promise<string>
```

##### getChapterContentByIndex(index)
Get chapter content by index.

```typescript
await getChapterContentByIndex(index: number): Promise<string>
```

##### getCoverImage()
Get cover image as data URL.

```typescript
await getCoverImage(): Promise<string | null>
```

##### getResource(href)
Get any resource (images, styles, etc.) as base64.

```typescript
await getResource(href: string): Promise<string | null>
```

### Types

#### EpubMetadata
```typescript
interface EpubMetadata {
  title?: string;
  creator?: string;
  description?: string;
  language?: string;
  publisher?: string;
  identifier?: string;
  date?: string;
  rights?: string;
  cover?: string;
}
```

#### EpubChapter
```typescript
interface EpubChapter {
  id: string;
  href: string;
  title?: string;
  order: number;
}
```

#### EpubTableOfContents
```typescript
interface EpubTableOfContents {
  id: string;
  href: string;
  title: string;
  children?: EpubTableOfContents[];
  order: number;
}
```

## Usage Examples

### Basic Usage

```typescript
import { EpubReader } from 'epub-reader-core';

// From file input
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const file = fileInput.files[0];

const reader = new EpubReader();
await reader.load(file);

// Display book info
const metadata = reader.getMetadata();
console.log(`Reading: ${metadata.title} by ${metadata.creator}`);

// Read all chapters
const chapters = reader.getChapters();
for (let i = 0; i < chapters.length; i++) {
  const content = await reader.getChapterContentByIndex(i);
  console.log(`Chapter ${i + 1}:`, content.substring(0, 100) + '...');
}
```

### Vue 3 Integration

```vue
<template>
  <div>
    <div v-if="metadata">
      <h1>{{ metadata.title }}</h1>
      <p>By {{ metadata.creator }}</p>
    </div>
    
    <div v-html="chapterContent"></div>
    
    <button @click="previousChapter" :disabled="currentChapter === 0">
      Previous
    </button>
    <button @click="nextChapter" :disabled="currentChapter >= chapters.length - 1">
      Next
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { EpubReader } from 'epub-reader-core';

const reader = new EpubReader();
const metadata = ref(null);
const chapters = ref([]);
const currentChapter = ref(0);
const chapterContent = ref('');

onMounted(async () => {
  await reader.load(epubFile);
  metadata.value = reader.getMetadata();
  chapters.value = reader.getChapters();
  chapterContent.value = await reader.getChapterContentByIndex(0);
});

const nextChapter = async () => {
  currentChapter.value++;
  chapterContent.value = await reader.getChapterContentByIndex(currentChapter.value);
};

const previousChapter = async () => {
  currentChapter.value--;
  chapterContent.value = await reader.getChapterContentByIndex(currentChapter.value);
};
</script>
```

### React Integration

```jsx
import React, { useState, useEffect } from 'react';
import { EpubReader } from 'epub-reader-core';

function EpubViewer({ epubFile }) {
  const [reader] = useState(() => new EpubReader());
  const [metadata, setMetadata] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [content, setContent] = useState('');

  useEffect(() => {
    const loadEpub = async () => {
      await reader.load(epubFile);
      setMetadata(reader.getMetadata());
      setChapters(reader.getChapters());
      setContent(await reader.getChapterContentByIndex(0));
    };
    
    loadEpub();
  }, [epubFile, reader]);

  const loadChapter = async (index) => {
    setCurrentChapter(index);
    setContent(await reader.getChapterContentByIndex(index));
  };

  return (
    <div>
      {metadata && (
        <div>
          <h1>{metadata.title}</h1>
          <p>By {metadata.creator}</p>
        </div>
      )}
      
      <div dangerouslySetInnerHTML={{ __html: content }} />
      
      <div>
        <button 
          onClick={() => loadChapter(currentChapter - 1)}
          disabled={currentChapter === 0}
        >
          Previous
        </button>
        <button 
          onClick={() => loadChapter(currentChapter + 1)}
          disabled={currentChapter >= chapters.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

## Browser Compatibility

This library works in all modern browsers that support:
- ES2020+ features
- W3C File API
- JavaScript Promises
- ArrayBuffer/Uint8Array

## Dependencies

- `jszip` - For EPUB ZIP file extraction
- `xml2js` - For XML parsing

## Development

```bash
# Clone the repository
git clone https://github.com/your-username/epub-reader-core.git
cd epub-reader-core

# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Examples

Check out the `examples/` directory for complete implementations:

- `examples/vue3/` - Vue 3 application with drag-and-drop support
- More examples coming soon...

## Roadmap

- [ ] EPUB 3.0+ support with enhanced features
- [ ] Text-to-speech integration
- [ ] Reading progress tracking
- [ ] Bookmark and annotation support
- [ ] Custom font and theme support
- [ ] Search functionality
- [ ] Offline reading capabilities