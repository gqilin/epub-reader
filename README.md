# EPUB Reader Core

A framework-agnostic TypeScript library for parsing and reading EPUB files in web browsers. This library provides a simple API to extract EPUB metadata, table of contents, and chapter content with automatic DOM rendering.

## Features

- 📚 Parse EPUB files from various input formats (ArrayBuffer, Uint8Array, Blob, File)
- 🎯 Framework-agnostic - works with any JavaScript framework
- 📖 Extract book metadata (title, author, description, etc.)
- 📑 Parse table of contents with nested structure support
- 📄 Retrieve chapter content by index or href
- 🖼️ Extract cover images with automatic display
- 🎛️ Built-in chapter navigation (previous/next)
- 🎨 Automatic content rendering to DOM elements
- 🎪 Responsive styling and image interactions
- 🛠️ TypeScript support with full type definitions
- 📦 Lightweight and performant
- 🔧 Tree-shakable and browser-compatible

## Installation

```bash
npm install epub-reader-core
```

## Quick Start

```typescript
import { EpubReader } from 'epub-reader-core';

// Create a new reader instance with target DOM element
const reader = new EpubReader({
  targetElementId: 'chapter-content' // DOM element ID where chapters will be rendered
});

// Load an EPUB file and automatically render first chapter
await reader.load(epubFile); // epubFile can be File, ArrayBuffer, or Uint8Array

// Get book information
const metadata = reader.getMetadata();
console.log('Title:', metadata.title);
console.log('Author:', metadata.creator);

// Get chapters
const chapters = reader.getChapters();
console.log('Total chapters:', chapters.length);

// Navigate between chapters
await reader.nextChapter(); // Load next chapter
await reader.previousChapter(); // Load previous chapter

// Load specific chapter
await reader.loadChapterByIndex(2); // Load chapter 3 (0-indexed)
await reader.loadChapterByHref('chapter-3.xhtml'); // Load by href
```

```html
<!-- HTML setup -->
<div id="chapter-content">
  <!-- Chapter content will be automatically rendered here -->
</div>
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
- `targetElementId?: string` - DOM element ID for automatic chapter rendering

#### Methods

##### load(epubData)
Load an EPUB file for parsing. Automatically renders first chapter if `targetElementId` is set.

```typescript
await load(epubData: ArrayBuffer | Uint8Array | Blob): Promise<void>
```

##### Chapter Navigation Methods

##### nextChapter()
Load and render the next chapter to the target DOM element.

```typescript
await nextChapter(options?: ChapterRenderOptions): Promise<void>
```

##### previousChapter()
Load and render the previous chapter to the target DOM element.

```typescript
await previousChapter(options?: ChapterRenderOptions): Promise<void>
```

##### loadChapterByIndex(index)
Load and render a specific chapter by index to the target DOM element.

```typescript
await loadChapterByIndex(index: number, options?: ChapterRenderOptions): Promise<void>
```

##### loadChapterByHref(chapterHref)
Load and render a specific chapter by href to the target DOM element.

```typescript
await loadChapterByHref(chapterHref: string, options?: ChapterRenderOptions): Promise<void>
```

##### loadChapterById(chapterId)
Load and render a specific chapter by ID to the target DOM element.

```typescript
await loadChapterById(chapterId: string, options?: ChapterRenderOptions): Promise<void>
```

##### Chapter Render Options

```typescript
interface ChapterRenderOptions {
  showLoading?: boolean;     // Show loading spinner (default: true)
  className?: string;        // Custom CSS class for chapter content (default: 'epub-chapter-content')
  onError?: (error: Error) => void;  // Error callback
  onSuccess?: () => void;    // Success callback
}
```

##### State Query Methods

##### getCurrentChapterIndex()
Get the index of the currently loaded chapter.

```typescript
getCurrentChapterIndex(): number
```

##### getCurrentChapter()
Get information about the currently loaded chapter.

```typescript
getCurrentChapter(): EpubChapter | null
```

##### hasPreviousChapter()
Check if there is a previous chapter available.

```typescript
hasPreviousChapter(): boolean
```

##### hasNextChapter()
Check if there is a next chapter available.

```typescript
hasNextChapter(): boolean
```

##### Content Access Methods

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
Get chapter content by href (returns HTML string).

```typescript
await getChapterContent(chapterHref: string): Promise<string>
```

##### getChapterContentByIndex(index)
Get chapter content by index (returns HTML string).

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

##### Utility Methods

##### clearTarget(elementId)
Clear the content of the target DOM element.

```typescript
clearTarget(elementId: string): void
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

### Basic Usage with Automatic Rendering

```typescript
import { EpubReader } from 'epub-reader-core';

// From file input
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const file = fileInput.files[0];

// Create reader with automatic DOM rendering
const reader = new EpubReader({
  targetElementId: 'chapter-content'
});

// Load EPUB and automatically render first chapter
await reader.load(file);

// Display book info
const metadata = reader.getMetadata();
console.log(`Reading: ${metadata.title} by ${metadata.creator}`);

// Navigate chapters
console.log('Current chapter:', reader.getCurrentChapterIndex());
console.log('Has next:', reader.hasNextChapter());
console.log('Has previous:', reader.hasPreviousChapter());

// Chapter navigation
await reader.nextChapter();  // Load next chapter
await reader.previousChapter(); // Load previous chapter
await reader.loadChapterByIndex(2); // Jump to chapter 3
```

### Manual Content Access

```typescript
import { EpubReader } from 'epub-reader-core';

const reader = new EpubReader(); // No target element for manual control
await reader.load(file);

// Get chapters list
const chapters = reader.getChapters();

// Read chapters manually
for (let i = 0; i < chapters.length; i++) {
  const content = await reader.getChapterContentByIndex(i);
  console.log(`Chapter ${i + 1}:`, content.substring(0, 100) + '...');
}

// Get table of contents
const toc = reader.getTableOfContents();
toc.forEach(item => {
  console.log(`${item.title} -> ${item.href}`);
});
```

### Vue 3 Integration (Recommended)

```vue
<template>
  <div>
    <!-- EPUB Loader Component -->
    <EpubLoader v-if="!reader" @loaded="onEpubLoaded" />
    
    <!-- Book Info -->
    <div v-if="reader">
      <EpubInfo :reader="reader" @chapter-selected="onChapterSelected" />
    </div>
    
    <!-- Chapter Viewer -->
    <div v-if="reader">
      <EpubViewer :reader="reader" />
    </div>
    
    <!-- Chapter Content Container -->
    <div id="chapter-content"></div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { EpubReader } from 'epub-reader-core';

const reader = ref(null);

const onEpubLoaded = (epubReader) => {
  reader.value = epubReader;
};

const onChapterSelected = async (chapter) => {
  // Use built-in navigation - automatically renders to #chapter-content
  await reader.value.loadChapterByHref(chapter.href, {
    showLoading: true,
    onError: (error) => console.error('Chapter load failed:', error),
    onSuccess: () => console.log('Chapter loaded successfully')
  });
};
</script>
```

### Vue 3 Manual Integration

```vue
<template>
  <div>
    <div v-if="metadata">
      <h1>{{ metadata.title }}</h1>
      <p>By {{ metadata.creator }}</p>
    </div>
    
    <div>
      <button @click="previousChapter" :disabled="!reader.hasPreviousChapter()">
        Previous
      </button>
      <span>Chapter {{ currentChapter + 1 }} of {{ chapters.length }}</span>
      <button @click="nextChapter" :disabled="!reader.hasNextChapter()">
        Next
      </button>
    </div>
    
    <!-- Chapter content will be rendered here -->
    <div id="chapter-content"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { EpubReader } from 'epub-reader-core';

const reader = new EpubReader({
  targetElementId: 'chapter-content'
});

const metadata = ref(null);
const chapters = ref([]);
const currentChapter = ref(0);

onMounted(async () => {
  await reader.load(epubFile);
  metadata.value = reader.getMetadata();
  chapters.value = reader.getChapters();
  
  // Update current chapter tracker
  currentChapter.value = reader.getCurrentChapterIndex();
});

const nextChapter = async () => {
  await reader.nextChapter({
    onSuccess: () => {
      currentChapter.value = reader.getCurrentChapterIndex();
    }
  });
};

const previousChapter = async () => {
  await reader.previousChapter({
    onSuccess: () => {
      currentChapter.value = reader.getCurrentChapterIndex();
    }
  });
};
</script>
```

### React Integration (Recommended)

```jsx
import React, { useState, useEffect } from 'react';
import { EpubReader } from 'epub-reader-core';

function EpubViewer({ epubFile }) {
  const [reader] = useState(() => new EpubReader({
    targetElementId: 'chapter-content'
  }));
  const [metadata, setMetadata] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    const loadEpub = async () => {
      await reader.load(epubFile);
      setMetadata(reader.getMetadata());
      setChapters(reader.getChapters());
      setCurrentChapter(reader.getCurrentChapterIndex());
    };
    
    loadEpub();
  }, [epubFile, reader]);

  const nextChapter = async () => {
    await reader.nextChapter({
      onSuccess: () => {
        setCurrentChapter(reader.getCurrentChapterIndex());
      }
    });
  };

  const previousChapter = async () => {
    await reader.previousChapter({
      onSuccess: () => {
        setCurrentChapter(reader.getCurrentChapterIndex());
      }
    });
  };

  return (
    <div>
      {metadata && (
        <div>
          <h1>{metadata.title}</h1>
          <p>By {metadata.creator}</p>
        </div>
      )}
      
      <div>
        <button 
          onClick={previousChapter}
          disabled={!reader.hasPreviousChapter()}
        >
          Previous
        </button>
        <span>Chapter {currentChapter + 1} of {chapters.length}</span>
        <button 
          onClick={nextChapter}
          disabled={!reader.hasNextChapter()}
        >
          Next
        </button>
      </div>
      
      {/* Chapter content will be automatically rendered here */}
      <div id="chapter-content"></div>
    </div>
  );
}
```

### React Manual Integration

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

## Data Loading and Return Values

### Input Data Formats

The `load()` method accepts multiple EPUB file formats:

```typescript
// From File Input (HTML5 File API)
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const file = fileInput.files[0]; // File object
await reader.load(file);

// From ArrayBuffer (Fetch API, XMLHttpRequest, etc.)
const response = await fetch('book.epub');
const arrayBuffer = await response.arrayBuffer();
await reader.load(arrayBuffer);

// From Uint8Array (Custom file handling)
const uint8Array = new Uint8Array(arrayBuffer);
await reader.load(uint8Array);

// From Blob (Canvas, custom data, etc.)
const blob = new Blob([epubData], { type: 'application/epub+zip' });
await reader.load(blob);
```

### Returned Data Structure

#### EpubInfo (Complete Book Information)
```typescript
interface EpubInfo {
  metadata: EpubMetadata;     // Book metadata
  manifest: EpubManifest[];   // All resources in the EPUB
  spine: EpubSpine[];         // Reading order
  toc: EpubTableOfContents[]; // Table of contents
  chapters: EpubChapter[];     // Chapter list
}
```

#### EpubMetadata (Book Details)
```typescript
interface EpubMetadata {
  title?: string;      // Book title
  creator?: string;     // Author name
  description?: string; // Book description
  language?: string;    // Language code (e.g., 'en', 'zh')
  publisher?: string;  // Publisher name
  identifier?: string;  // ISBN or other identifier
  date?: string;        // Publication date
  rights?: string;      // Copyright information
  cover?: string;       // Cover image ID in manifest
}
```

#### EpubChapter (Chapter Information)
```typescript
interface EpubChapter {
  id: string;      // Unique chapter identifier
  href: string;     // File path within EPUB
  title?: string;   // Chapter title (if available)
  order: number;    // Reading order index
}
```

#### EpubTableOfContents (TOC Structure)
```typescript
interface EpubTableOfContents {
  id: string;                           // Unique TOC item ID
  href: string;                         // Target chapter href
  title: string;                        // Display title
  order: number;                        // Order in TOC
  children?: EpubTableOfContents[];     // Nested TOC items
}
```

#### EpubManifest (Resource Information)
```typescript
interface EpubManifest {
  id: string;        // Resource ID
  href: string;      // File path
  mediaType: string; // MIME type (e.g., 'application/xhtml+xml', 'image/jpeg')
}
```

### Content Return Formats

#### Chapter Content (HTML String)
```typescript
const chapterContent = await reader.getChapterContentByIndex(0);
console.log(chapterContent);
// Output: '<html><body><h1>Chapter 1</h1><p>Chapter content...</p></body></html>'

// Content is automatically processed:
// - Images converted to data URLs
// - Links made functional
// - CSS styles preserved
// - JavaScript sanitized for security
```

#### Cover Image (Data URL)
```typescript
const coverImage = await reader.getCoverImage();
if (coverImage) {
  console.log(coverImage.substring(0, 50));
  // Output: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...'
  
  // Can be directly used in img src:
  document.getElementById('cover').src = coverImage;
}
```

#### Resources (Base64 Data)
```typescript
const imageData = await reader.getResource('images/cover.jpg');
console.log(imageData);
// Output: '/9j/4AAQSkZJRgABAQAAAQ...' (base64 encoded)
```

### Navigation Return Values

#### State Query Methods
```typescript
// Current state
reader.getCurrentChapterIndex();    // number: current chapter index
reader.getCurrentChapter();         // EpubChapter | null: current chapter info
reader.hasPreviousChapter();       // boolean: can go to previous
reader.hasNextChapter();           // boolean: can go to next

// Complete information
reader.getChapters();              // EpubChapter[]: all chapters
reader.getTableOfContents();       // EpubTableOfContents[]: TOC structure
```

#### Navigation Methods Return Values
```typescript
// All navigation methods return Promise<void> on success
// They throw Error on failure

try {
  await reader.nextChapter();
  console.log('Successfully moved to next chapter');
} catch (error) {
  console.error('Navigation failed:', error.message);
  // Error examples: "已经是最后一章了" (Already at last chapter)
}
```

## Browser Compatibility

This library works in all modern browsers that support:
- ES2020+ features
- W3C File API
- JavaScript Promises
- ArrayBuffer/Uint8Array

### Minimum Browser Versions
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

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

Check out `examples/` directory for complete implementations:

- `examples/vue3/` - Vue 3 application with drag-and-drop support and automatic rendering
- `examples/manual/` - Manual content access examples for advanced usage
- More examples coming soon...

### Example Project Structure

```
examples/vue3/
├── src/
│   ├── components/
│   │   ├── EpubLoader.vue     # File upload and EPUB loading
│   │   ├── EpubInfo.vue       # Book metadata and table of contents
│   │   └── EpubViewer.vue     # Chapter navigation and display
│   ├── App.vue                 # Main application component
│   └── main.ts                 # Application entry point
├── package.json
└── vite.config.js
```

### Running Examples

```bash
cd examples/vue3
npm install
npm run dev
# Open http://localhost:5173
```

## Roadmap

- [ ] EPUB 3.0+ support with enhanced features
- [ ] Text-to-speech integration
- [ ] Reading progress tracking
- [ ] Bookmark and annotation support
- [ ] Custom font and theme support
- [ ] Search functionality
- [ ] Offline reading capabilities