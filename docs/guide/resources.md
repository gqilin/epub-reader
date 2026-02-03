# Resources & Images

Learn how to work with embedded resources like images, stylesheets, and other assets in EPUB files.

## Resource Types

EPUB files can contain various types of embedded resources:

- **Images**: JPEG, PNG, GIF, SVG cover and content images
- **Stylesheets**: CSS files for styling
- **Fonts**: Custom font files
- **Scripts**: JavaScript files (less common)
- **Audio**: Audio files for multimedia content
- **Video**: Video files for enhanced EPUBs

## Cover Images

### Basic Cover Extraction

```typescript
import { EpubReader } from 'epub-reader-core';

const reader = new EpubReader();
await reader.load(epubFile);

const coverImage = await reader.getCoverImage();

if (coverImage) {
  console.log('Cover image loaded:', coverImage.substring(0, 50) + '...');
  
  // Display in HTML
  const img = document.getElementById('cover') as HTMLImageElement;
  if (img) {
    img.src = coverImage;
  }
} else {
  console.log('No cover image found');
}
```

### Cover Image Component

```typescript
class CoverImageManager {
  private reader: EpubReader;
  private cachedCover: string | null = null;
  
  constructor(reader: EpubReader) {
    this.reader = reader;
  }
  
  async getCoverImage(): Promise<string | null> {
    if (this.cachedCover !== null) {
      return this.cachedCover;
    }
    
    try {
      const cover = await this.reader.getCoverImage();
      this.cachedCover = cover;
      return cover;
    } catch (error) {
      console.error('Failed to load cover image:', error);
      this.cachedCover = null;
      return null;
    }
  }
  
  async getCoverImageMetadata(): Promise<{
    src: string | null;
    size?: { width: number; height: number };
    type?: string;
  }> {
    const src = await this.getCoverImage();
    
    if (!src) {
      return { src: null };
    }
    
    // Extract image type from data URL
    const typeMatch = src.match(/^data:(image\/\w+);base64,/);
    const type = typeMatch ? typeMatch[1] : 'unknown';
    
    // Get image dimensions
    const size = await this.getImageDimensions(src);
    
    return { src, size, type };
  }
  
  private async getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = dataUrl;
    });
  }
}
```

## Generic Resource Access

### Load Any Resource

```typescript
async function loadResource(reader: EpubReader, href: string): Promise<string | null> {
  try {
    const resourceData = await reader.getResource(href);
    
    if (!resourceData) {
      console.warn(`Resource not found: ${href}`);
      return null;
    }
    
    return resourceData;
  } catch (error) {
    console.error(`Failed to load resource ${href}:`, error);
    return null;
  }
}

// Usage
const imageData = await loadResource(reader, 'images/cover.jpg');
if (imageData) {
  const dataUrl = `data:image/jpeg;base64,${imageData}`;
  // Use dataUrl...
}
```

### Resource Type Detection

```typescript
function getResourceType(href: string): string {
  const extension = href.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'css': 'text/css',
    'js': 'application/javascript',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'webm': 'video/webm'
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
}

function createDataUrl(base64Data: string, href: string): string {
  const mimeType = getResourceType(href);
  return `data:${mimeType};base64,${base64Data}`;
}
```

## Image Processing

### Extract All Images from Chapter

```typescript
async function extractChapterImages(reader: EpubReader, chapterHref: string): Promise<Array<{
  src: string;
  alt?: string;
  title?: string;
  width?: string;
  height?: string;
}>> {
  try {
    const chapterContent = await reader.getChapterContent(chapterHref);
    
    // Create a temporary DOM to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(chapterContent, 'text/html');
    const images = doc.querySelectorAll('img');
    
    const extractedImages: Array<{
      src: string;
      alt?: string;
      title?: string;
      width?: string;
      height?: string;
    }> = [];
    
    for (const img of images) {
      const imageInfo = {
        src: img.src || img.getAttribute('src') || '',
        alt: img.getAttribute('alt') || undefined,
        title: img.getAttribute('title') || undefined,
        width: img.getAttribute('width') || undefined,
        height: img.getAttribute('height') || undefined
      };
      
      // If src is relative, load the resource
      if (imageInfo.src && !imageInfo.src.startsWith('http') && !imageInfo.src.startsWith('data:')) {
        const resourceData = await reader.getResource(imageInfo.src);
        if (resourceData) {
          imageInfo.src = createDataUrl(resourceData, imageInfo.src);
        }
      }
      
      extractedImages.push(imageInfo);
    }
    
    return extractedImages;
  } catch (error) {
    console.error('Failed to extract images:', error);
    return [];
  }
}
```

### Image Gallery

```typescript
class ChapterImageGallery {
  private reader: EpubReader;
  private cachedImages = new Map<string, string>();
  
  constructor(reader: EpubReader) {
    this.reader = reader;
  }
  
  async getChapterImages(chapterHref: string): Promise<Array<{
    src: string;
    alt?: string;
    title?: string;
    originalSrc: string;
  }>> {
    const chapterContent = await this.reader.getChapterContent(chapterHref);
    const parser = new DOMParser();
    const doc = parser.parseFromString(chapterContent, 'text/html');
    const images = doc.querySelectorAll('img');
    
    const galleryImages: Array<{
      src: string;
      alt?: string;
      title?: string;
      originalSrc: string;
    }> = [];
    
    for (const img of images) {
      const originalSrc = img.src || img.getAttribute('src') || '';
      
      if (originalSrc) {
        const dataUrl = await this.loadAndCacheImage(originalSrc);
        
        galleryImages.push({
          src: dataUrl,
          alt: img.getAttribute('alt') || undefined,
          title: img.getAttribute('title') || undefined,
          originalSrc
        });
      }
    }
    
    return galleryImages;
  }
  
  private async loadAndCacheImage(href: string): Promise<string> {
    if (this.cachedImages.has(href)) {
      return this.cachedImages.get(href)!;
    }
    
    const resourceData = await this.reader.getResource(href);
    if (!resourceData) {
      return href; // Return original if loading fails
    }
    
    const dataUrl = createDataUrl(resourceData, href);
    this.cachedImages.set(href, dataUrl);
    
    return dataUrl;
  }
  
  getAllCachedImages(): Map<string, string> {
    return new Map(this.cachedImages);
  }
  
  clearCache(): void {
    this.cachedImages.clear();
  }
}
```

## CSS and Styling

### Extract Chapter Styles

```typescript
async function extractChapterStyles(reader: EpubReader, chapterHref: string): Promise<Array<{
  href: string;
  content: string;
  type: string;
}>> {
  try {
    const chapterContent = await this.reader.getChapterContent(chapterHref);
    const parser = new DOMParser();
    const doc = parser.parseFromString(chapterContent, 'text/html');
    
    const styles: Array<{ href: string; content: string; type: string }> = [];
    
    // Extract <link> CSS files
    const links = doc.querySelectorAll('link[rel="stylesheet"]');
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href) {
        const resourceData = await reader.getResource(href);
        if (resourceData) {
          styles.push({
            href,
            content: atob(resourceData), // Decode base64
            type: 'external'
          });
        }
      }
    }
    
    // Extract inline <style> tags
    const styleTags = doc.querySelectorAll('style');
    styleTags.forEach((style, index) => {
      styles.push({
        href: `inline-${index}`,
        content: style.textContent || '',
        type: 'inline'
      });
    });
    
    return styles;
  } catch (error) {
    console.error('Failed to extract styles:', error);
    return [];
  }
}
```

### Style Management

```typescript
class ChapterStyleManager {
  private reader: EpubReader;
  private styleCache = new Map<string, string>();
  
  constructor(reader: EpubReader) {
    this.reader = reader;
  }
  
  async getChapterStyleContent(chapterHref: string): Promise<string> {
    const styles = await this.extractChapterStyles(reader, chapterHref);
    
    return styles
      .map(style => {
        if (style.type === 'external') {
          // Rewrite relative URLs in CSS
          return this.rewriteCssUrls(style.content, style.href);
        }
        return style.content;
      })
      .join('\n\n');
  }
  
  private rewriteCssUrls(cssContent: string, cssHref: string): string {
    // Simple URL rewriting for common CSS patterns
    const basePath = cssHref.substring(0, cssHref.lastIndexOf('/') + 1);
    
    return cssContent.replace(
      /url\(['"]?([^'")]+)['"]?\)/g,
      (match, url) => {
        if (url.startsWith('http') || url.startsWith('data:')) {
          return match; // Keep absolute URLs as-is
        }
        
        // Convert relative URL to absolute within EPUB
        const absoluteUrl = basePath + url;
        return `url("${absoluteUrl}")`;
      }
    );
  }
}
```

## Resource Manager

### Comprehensive Resource Management

```typescript
class EpubResourceManager {
  private reader: EpubReader;
  private resourceCache = new Map<string, string>();
  private manifest: any[];
  
  constructor(reader: EpubReader) {
    this.reader = reader;
    const info = reader.getInfo();
    this.manifest = info?.manifest || [];
  }
  
  async getResource(href: string): Promise<string | null> {
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
      console.error(`Failed to load resource ${href}:`, error);
    }
    
    return null;
  }
  
  async getResourceAsDataUrl(href: string): Promise<string | null> {
    const resourceData = await this.getResource(href);
    if (!resourceData) return null;
    
    return createDataUrl(resourceData, href);
  }
  
  getManifestItem(href: string): any | undefined {
    return this.manifest.find(item => 
      item.href === href || href.includes(item.href)
    );
  }
  
  getResourceType(href: string): string {
    const manifestItem = this.getManifestItem(href);
    if (manifestItem?.mediaType) {
      return manifestItem.mediaType;
    }
    
    return getResourceType(href);
  }
  
  async preloadResources(hrefs: string[]): Promise<void> {
    const promises = hrefs.map(href => this.getResource(href));
    await Promise.allSettled(promises);
  }
  
  async preloadChapterResources(chapterHref: string): Promise<string[]> {
    const chapterContent = await this.reader.getChapterContent(chapterHref);
    const resourceHrefs = this.extractResourceHrefs(chapterContent);
    
    await this.preloadResources(resourceHrefs);
    return resourceHrefs;
  }
  
  private extractResourceHrefs(htmlContent: string): string[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    const hrefs: string[] = [];
    
    // Extract image sources
    doc.querySelectorAll('img[src]').forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        hrefs.push(src);
      }
    });
    
    // Extract CSS links
    doc.querySelectorAll('link[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('data:')) {
        hrefs.push(href);
      }
    });
    
    // Extract background images from inline styles
    doc.querySelectorAll('*[style]').forEach(element => {
      const style = element.getAttribute('style');
      if (style) {
        const matches = style.match(/url\(['"]?([^'")]+)['"]?\)/g);
        if (matches) {
          matches.forEach(match => {
            const url = match.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1];
            if (url && !url.startsWith('http') && !url.startsWith('data:')) {
              hrefs.push(url);
            }
          });
        }
      }
    });
    
    return [...new Set(hrefs)]; // Remove duplicates
  }
  
  getCacheStats(): { size: number; items: string[] } {
    return {
      size: this.resourceCache.size,
      items: Array.from(this.resourceCache.keys())
    };
  }
  
  clearCache(): void {
    this.resourceCache.clear();
  }
}
```

## Performance Optimization

### Lazy Resource Loading

```typescript
class LazyResourceLoader {
  private reader: EpubReader;
  private loadPromises = new Map<string, Promise<string | null>>();
  
  constructor(reader: EpubReader) {
    this.reader = reader;
  }
  
  async loadResource(href: string): Promise<string | null> {
    // Return existing promise if already loading
    if (this.loadPromises.has(href)) {
      return this.loadPromises.get(href)!;
    }
    
    // Create new loading promise
    const promise = this.doLoadResource(href);
    this.loadPromises.set(href, promise);
    
    return promise;
  }
  
  private async doLoadResource(href: string): Promise<string | null> {
    try {
      const resourceData = await this.reader.getResource(href);
      return resourceData;
    } catch (error) {
      console.error(`Failed to load resource ${href}:`, error);
      return null;
    } finally {
      // Remove from loading promises after completion
      this.loadPromises.delete(href);
    }
  }
  
  async preloadCriticalResources(chapterHref: string): Promise<void> {
    const chapterContent = await this.reader.getChapterContent(chapterHref);
    const resourceHrefs = this.extractCriticalResources(chapterContent);
    
    const promises = resourceHrefs.map(href => this.loadResource(href));
    await Promise.allSettled(promises);
  }
  
  private extractCriticalResources(htmlContent: string): string[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    const criticalHrefs: string[] = [];
    
    // Load first images (most visible)
    doc.querySelectorAll('img').forEach((img, index) => {
      if (index < 3) { // First 3 images
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
          criticalHrefs.push(src);
        }
      }
    });
    
    // Load CSS files
    doc.querySelectorAll('link[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('data:')) {
        criticalHrefs.push(href);
      }
    });
    
    return [...new Set(criticalHrefs)];
  }
}
```

## Complete Resource Example

```typescript
import { EpubReader } from 'epub-reader-core';

export class EpubResourceHandler {
  private reader: EpubReader;
  private resourceManager: EpubResourceManager;
  private coverManager: CoverImageManager;
  private imageGallery: ChapterImageGallery;
  private lazyLoader: LazyResourceLoader;
  
  constructor(reader: EpubReader) {
    this.reader = reader;
    this.resourceManager = new EpubResourceManager(reader);
    this.coverManager = new CoverImageManager(reader);
    this.imageGallery = new ChapterImageGallery(reader);
    this.lazyLoader = new LazyResourceLoader(reader);
  }
  
  // Cover operations
  async getCover(): Promise<string | null> {
    return this.coverManager.getCoverImage();
  }
  
  async getCoverMetadata() {
    return this.coverManager.getCoverImageMetadata();
  }
  
  // Resource operations
  async getResource(href: string): Promise<string | null> {
    return this.resourceManager.getResource(href);
  }
  
  async getResourceAsDataUrl(href: string): Promise<string | null> {
    return this.resourceManager.getResourceAsDataUrl(href);
  }
  
  // Chapter operations
  async getChapterImages(chapterHref: string) {
    return this.imageGallery.getChapterImages(chapterHref);
  }
  
  async preloadChapter(chapterHref: string): Promise<void> {
    await this.lazyLoader.preloadCriticalResources(chapterHref);
  }
  
  // Utility methods
  getResourceType(href: string): string {
    return this.resourceManager.getResourceType(href);
  }
  
  getCacheStats() {
    return this.resourceManager.getCacheStats();
  }
  
  clearCache(): void {
    this.resourceManager.clearCache();
  }
}
```

## Next Steps

Now that you understand resource handling:

- [API Reference](/api/epub-reader) - Explore all available methods
- [Examples](/examples/vue3) - See complete implementations
- [Getting Started](/guide/getting-started) - Return to basics if needed