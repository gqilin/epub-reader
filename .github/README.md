# EPUB Reader Core

A framework-agnostic TypeScript library for parsing and reading EPUB files in web browsers.

## 🚀 Quick Start

```bash
npm install epub-reader-core
```

```typescript
import { EpubReader } from 'epub-reader-core';

const reader = new EpubReader();
await reader.load(epubFile);

const metadata = reader.getMetadata();
console.log(`Reading: ${metadata.title} by ${metadata.creator}`);
```

## 📚 Features

- 🔧 Framework-agnostic - works with Vue, React, Angular, or vanilla JS
- 📖 Parse EPUB metadata, table of contents, and chapters
- 🖼️ Extract cover images and resources
- 🎯 TypeScript support with full type definitions
- 📦 Lightweight and performant
- 🌐 Browser-compatible

## 📖 Documentation

See [README.md](./README.md) for complete documentation and usage examples.

## 🎯 Examples

- [Vue 3 Example](./examples/vue3/) - Complete Vue 3 application with drag-and-drop support

## 🔧 Development

```bash
npm install
npm run build
npm test
```