import JSZip from 'jszip';
import { EpubBook, EpubReaderOptions, ReadingSettings, ReadingState, Chapter, FontSizeAction, ThemeType } from './types';

export class EpubReader {
  private zip: JSZip | null = null;
  private book: EpubBook;
  private state: ReadingState;

  constructor(private options: EpubReaderOptions = {}) {
    this.book = new EpubBook();
    this.state = {
      currentChapterIndex: 0,
      book: null,
      settings: {
        fontSize: 16,
        minFontSize: 12,
        maxFontSize: 24,
        isDarkTheme: false,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineHeight: 1.8
      },
      contentElement: null
    };
  }

  async load(data: ArrayBuffer | Uint8Array | Blob): Promise<EpubBook> {
    this.zip = await JSZip.loadAsync(data);
    await this.parseContainer();
    await this.parseOpf();
    await this.parseNcx();
    
            // 初始化阅读器状态
            this.state.book = this.book;
            this.state.currentChapterIndex = 0;
            
            // 如果有内容元素，渲染第一章
            if (this.state.contentElement && this.book.chapters.length > 0) {
                this.renderChapter(0);
            }
    
    return this.book;
  }

  private async parseContainer(): Promise<void> {
    if (!this.zip) throw new Error('EPUB not loaded');

    const containerFile = this.zip.file('META-INF/container.xml');
    if (!containerFile) throw new Error('Container.xml not found');

    const containerXml = await containerFile.async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(containerXml, 'text/xml');
    
    const rootfile = doc.querySelector('rootfile');
    if (!rootfile) throw new Error('Rootfile not found in container.xml');

    const opfPath = rootfile.getAttribute('full-path');
    if (!opfPath) throw new Error('OPF path not found');

    this.book.opfPath = opfPath;
  }

  private async parseOpf(): Promise<void> {
    if (!this.zip || !this.book.opfPath) throw new Error('OPF path not set');

    const opfFile = this.zip.file(this.book.opfPath);
    if (!opfFile) throw new Error('OPF file not found');

    const opfXml = await opfFile.async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(opfXml, 'text/xml');

    this.parseMetadata(doc);
    this.parseManifest(doc);
    this.parseSpine(doc);
  }

  private parseMetadata(doc: Document): void {
    const metadata = doc.querySelector('metadata');
    if (!metadata) return;

    const title = metadata.querySelector('title')?.textContent;
    const creator = metadata.querySelector('creator')?.textContent;
    const publisher = metadata.querySelector('publisher')?.textContent;
    const language = metadata.querySelector('language')?.textContent;
    const identifier = metadata.querySelector('identifier')?.textContent;
    const description = metadata.querySelector('description')?.textContent;

    this.book.metadata = {
      title: title || undefined,
      author: creator || undefined,
      publisher: publisher || undefined,
      language: language || undefined,
      identifier: identifier || undefined,
      description: description || undefined
    };
  }

  private parseManifest(doc: Document): void {
    const manifest = doc.querySelector('manifest');
    if (!manifest) return;

    const items = manifest.querySelectorAll('item');
    items.forEach(item => {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      if (id && href) {
        this.book.manifest.set(id, href);
      }
    });
  }

  private parseSpine(doc: Document): void {
    const spine = doc.querySelector('spine');
    if (!spine) return;

    const itemrefs = spine.querySelectorAll('itemref');
    itemrefs.forEach(itemref => {
      const idref = itemref.getAttribute('idref');
      if (idref) {
        this.book.spine.push(idref);
      }
    });
  }

  private async parseNcx(): Promise<void> {
    if (!this.zip || !this.book.opfPath) return;

    const opfDir = this.book.opfPath.substring(0, this.book.opfPath.lastIndexOf('/') + 1);
    
    for (const [id, href] of this.book.manifest) {
      if (href.endsWith('.ncx')) {
        const ncxPath = opfDir + href;
        const ncxFile = this.zip.file(ncxPath);
        if (!ncxFile) continue;

        const ncxXml = await ncxFile.async('string');
        const parser = new DOMParser();
        const doc = parser.parseFromString(ncxXml, 'text/xml');
        
        this.parseToc(doc);
        break;
      }
    }
  }

  private parseToc(doc: Document): void {
    const navMap = doc.querySelector('navMap');
    if (!navMap) return;

    const navPoints = navMap.querySelectorAll('navPoint');
    const toc: any[] = [];

    navPoints.forEach(navPoint => {
      const label = navPoint.querySelector('navLabel text')?.textContent;
      const src = navPoint.querySelector('content')?.getAttribute('src');
      
      if (label && src) {
        toc.push({
          id: navPoint.getAttribute('id') || '',
          title: label,
          href: src
        });
      }
    });

    this.book.toc = toc;
  }

  async getChapterContent(href: string): Promise<string> {
    if (!this.zip || !this.book.opfPath) throw new Error('EPUB not loaded');

    const opfDir = this.book.opfPath.substring(0, this.book.opfPath.lastIndexOf('/') + 1);
    const chapterPath = opfDir + href;
    
    const chapterFile = this.zip.file(chapterPath);
    if (!chapterFile) throw new Error(`Chapter file not found: ${chapterPath}`);

    let content = await chapterFile.async('string');
    
    // Process images in the content
    content = await this.processImages(content, opfDir);
    
    return content;
  }

  private async processImages(content: string, basePath: string): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    const images = doc.querySelectorAll('img[src]');
    const processedContent: Promise<string>[] = [];
    
    images.forEach((img, index) => {
      const src = img.getAttribute('src');
      if (!src) return;
      
      const processedImage = this.processImage(src, basePath, index);
      processedContent.push(processedImage);
    });
    
    const results = await Promise.all(processedContent);
    
    // Replace image sources with data URLs
    let updatedContent = content;
    const images2 = doc.querySelectorAll('img[src]');
    
    images2.forEach((img, index) => {
      const src = img.getAttribute('src');
      if (src && results[index]) {
        updatedContent = updatedContent.replace(`src="${src}"`, `src="${results[index]}"`);
      }
    });
    
    return updatedContent;
  }

  private async processImage(src: string, basePath: string, index: number): Promise<string> {
    try {
      // Handle relative and absolute paths
      let imagePath = src;
      if (src.startsWith('./')) {
        imagePath = src.substring(2);
      } else if (!src.startsWith('/') && !src.startsWith('http')) {
        imagePath = basePath + src;
      } else if (src.startsWith('/')) {
        imagePath = src.substring(1);
      }
      
      // Find the image file in the zip
      let imageFile = this.zip!.file(imagePath);
      if (!imageFile) {
        // Try alternative path formats
        const alternativePaths = [
          imagePath,
          'OEBPS/' + imagePath,
          'OPS/' + imagePath,
          imagePath.replace(/^\//, ''),
          basePath + imagePath
        ];
        
        for (const path of alternativePaths) {
          imageFile = this.zip!.file(path);
          if (imageFile) {
            imagePath = path;
            break;
          }
        }
      }
      
      if (!imageFile) {
        console.warn(`Image not found: ${imagePath}`);
        return '';
      }
      
      // Get the image data as a blob
      const mimeType = this.getMimeType(imagePath);
      const imageData = await imageFile.async('base64');
      const dataUrl = `data:${mimeType};base64,${imageData}`;
      
      return dataUrl;
    } catch (error) {
      console.warn(`Error processing image ${src}:`, error);
      return '';
    }
  }

  private getMimeType(filePath: string): string {
    const extension = filePath.toLowerCase().split('.').pop();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'svg':
        return 'image/svg+xml';
      case 'webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }

  async loadAllChapters(): Promise<void> {
    if (!this.zip || !this.book.opfPath) return;

    const opfDir = this.book.opfPath.substring(0, this.book.opfPath.lastIndexOf('/') + 1);
    
    for (const idref of this.book.spine) {
      const href = this.book.manifest.get(idref);
      if (!href) continue;

      try {
        const content = await this.getChapterContent(href);
        const processedContent = await this.processCssResources(content, opfDir);
        const title = this.extractTitleFromContent(processedContent) || `Chapter ${this.book.chapters.length + 1}`;
        
        this.book.chapters.push({
          id: idref,
          title: title,
          href: href,
          content: processedContent
        });
      } catch (error) {
        console.warn(`Failed to load chapter ${href}:`, error);
      }
    }
    
    // 如果有内容元素，渲染第一章
    if (this.state.contentElement && this.book.chapters.length > 0) {
      this.renderChapter(0);
    }
  }

  private async processCssResources(content: string, basePath: string): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    // Process CSS files
    const linkElements = doc.querySelectorAll('link[rel="stylesheet"]');
    const cssProcessingPromises: Promise<string>[] = [];
    
    linkElements.forEach((link) => {
      const href = link.getAttribute('href');
      if (href) {
        cssProcessingPromises.push(this.processCssFile(href, basePath));
      }
    });
    
    const cssResults = await Promise.all(cssProcessingPromises);
    
    // Replace link elements with style elements containing processed CSS
    linkElements.forEach((link, index) => {
      const href = link.getAttribute('href');
      if (href && cssResults[index]) {
        const styleElement = doc.createElement('style');
        styleElement.textContent = cssResults[index];
        link.parentNode?.replaceChild(styleElement, link);
      }
    });
    
    // Process inline styles
    const styleElements = doc.querySelectorAll('style');
    for (let i = 0; i < styleElements.length; i++) {
      const styleElement = styleElements[i];
      const cssContent = styleElement.textContent || '';
      const processedCss = await this.processCssContent(cssContent, basePath);
      styleElement.textContent = processedCss;
    }
    
    return new XMLSerializer().serializeToString(doc);
  }

  private async processCssFile(href: string, basePath: string): Promise<string> {
    try {
      const opfDir = this.book.opfPath!.substring(0, this.book.opfPath!.lastIndexOf('/') + 1);
      let cssPath = href;
      
      if (href.startsWith('./')) {
        cssPath = href.substring(2);
      } else if (!href.startsWith('/') && !href.startsWith('http')) {
        cssPath = opfDir + href;
      } else if (href.startsWith('/')) {
        cssPath = href.substring(1);
      }
      
      let cssFile = this.zip!.file(cssPath);
      if (!cssFile) {
        // Try alternative paths
        const alternativePaths = [
          cssPath,
          'OEBPS/' + cssPath,
          'OPS/' + cssPath,
          cssPath.replace(/^\//, ''),
          opfDir + cssPath
        ];
        
        for (const path of alternativePaths) {
          cssFile = this.zip!.file(path);
          if (cssFile) {
            cssPath = path;
            break;
          }
        }
      }
      
      if (!cssFile) {
        console.warn(`CSS file not found: ${cssPath}`);
        return '';
      }
      
      const cssContent = await cssFile.async('string');
      return await this.processCssContent(cssContent, basePath);
    } catch (error) {
      console.warn(`Error processing CSS file ${href}:`, error);
      return '';
    }
  }

  private async processCssContent(css: string, basePath: string): Promise<string> {
    // Process url() references in CSS
    const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
    const promises: Promise<string>[] = [];
    const matches: string[] = [];
    
    let match;
    while ((match = urlRegex.exec(css)) !== null) {
      matches.push(match[0]);
      const imageUrl = match[1];
      if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
        promises.push(this.getResourceDataUrl(imageUrl));
      } else {
        promises.push(Promise.resolve(imageUrl));
      }
    }
    
    const dataUrls = await Promise.all(promises);
    
    // Replace url() references with data URLs
    let processedCss = css;
    matches.forEach((originalUrl, index) => {
      const newUrl = `url('${dataUrls[index]}')`;
      processedCss = processedCss.replace(originalUrl, newUrl);
    });
    
    return processedCss;
  }

  private extractTitleFromContent(content: string): string | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    const title = doc.querySelector('title')?.textContent;
    if (title) return title;

    const h1 = doc.querySelector('h1')?.textContent;
    if (h1) return h1;

    const h2 = doc.querySelector('h2')?.textContent;
    if (h2) return h2;

    return null;
  }

  async getResourceDataUrl(href: string): Promise<string> {
    if (!this.zip || !this.book.opfPath) throw new Error('EPUB not loaded');

    const opfDir = this.book.opfPath.substring(0, this.book.opfPath.lastIndexOf('/') + 1);
    let resourcePath = href;
    
    // Handle different path formats
    if (href.startsWith('./')) {
      resourcePath = href.substring(2);
    } else if (!href.startsWith('/') && !href.startsWith('http')) {
      resourcePath = opfDir + href;
    } else if (href.startsWith('/')) {
      resourcePath = href.substring(1);
    }
    
    // Try to find the resource file
    let resourceFile = this.zip.file(resourcePath);
    if (!resourceFile) {
      // Try alternative paths
      const alternativePaths = [
        resourcePath,
        'OEBPS/' + resourcePath,
        'OPS/' + resourcePath,
        resourcePath.replace(/^\//, ''),
        opfDir + resourcePath
      ];
      
      for (const path of alternativePaths) {
        resourceFile = this.zip.file(path);
        if (resourceFile) {
          resourcePath = path;
          break;
        }
      }
    }
    
    if (!resourceFile) {
      throw new Error(`Resource not found: ${resourcePath}`);
    }
    
    const mimeType = this.getMimeType(resourcePath);
    const data = await resourceFile.async('base64');
    return `data:${mimeType};base64,${data}`;
  }

  // 阅读器管理方法
  navigateToChapter(index: number): boolean {
    if (!this.state.book || index < 0 || index >= this.state.book.chapters.length) {
      return false;
    }
    
    this.state.currentChapterIndex = index;
    
    // 如果有内容元素，直接渲染章节
    if (this.state.contentElement) {
      return this.renderChapter(index);
    }
    
    return true;
  }

  previousChapter(): boolean {
    if (this.state.currentChapterIndex > 0) {
      this.state.currentChapterIndex--;
      
      // 如果有内容元素，直接渲染章节
      if (this.state.contentElement) {
        return this.renderChapter();
      }
      
      return true;
    }
    return false;
  }

  nextChapter(): boolean {
    if (this.state.book && this.state.currentChapterIndex < this.state.book.chapters.length - 1) {
      this.state.currentChapterIndex++;
      
      // 如果有内容元素，直接渲染章节
      if (this.state.contentElement) {
        return this.renderChapter();
      }
      
      return true;
    }
    return false;
  }

  getCurrentChapter(): Chapter | null {
    if (!this.state.book) return null;
    return this.state.book.chapters[this.state.currentChapterIndex] || null;
  }

  getCurrentChapterIndex(): number {
    return this.state.currentChapterIndex;
  }

  getTotalChapters(): number {
    return this.state.book ? this.state.book.chapters.length : 0;
  }

  adjustFontSize(action: FontSizeAction, customSize?: number | string): number {
    const { fontSize, minFontSize, maxFontSize } = this.state.settings;
    
    switch (action) {
      case 'increase':
        this.state.settings.fontSize = Math.min(fontSize + 2, maxFontSize);
        break;
      case 'decrease':
        this.state.settings.fontSize = Math.max(fontSize - 2, minFontSize);
        break;
      case 'reset':
        this.state.settings.fontSize = 16;
        break;
      case 'custom':
        if (customSize !== undefined) {
          let size = typeof customSize === 'string' ? 
            parseInt(customSize.replace('px', '')) : customSize;
          
          if (!isNaN(size) && size >= minFontSize && size <= maxFontSize) {
            this.state.settings.fontSize = size;
          } else {
            console.warn(`Invalid font size: ${customSize}. Using range ${minFontSize}-${maxFontSize}px`);
          }
        }
        break;
    }
    
    // 如果有内容元素，应用新的字体大小
    if (this.state.contentElement) {
      this.applyTextStyles();
    }
    
    return this.state.settings.fontSize;
  }

  getCurrentFontSize(): number {
    return this.state.settings.fontSize;
  }

  setTheme(theme: ThemeType): void {
    this.state.settings.isDarkTheme = theme === 'dark';
    
    // 如果有内容元素，应用新主题
    if (this.state.contentElement) {
      this.applyThemeStyles();
    }
  }

  toggleTheme(): boolean {
    this.state.settings.isDarkTheme = !this.state.settings.isDarkTheme;
    
    // 如果有内容元素，应用新主题
    if (this.state.contentElement) {
      this.applyThemeStyles();
    }
    
    return this.state.settings.isDarkTheme;
  }

  getCurrentTheme(): boolean {
    return this.state.settings.isDarkTheme;
  }

  setFontFamily(fontFamily: string): void {
    this.state.settings.fontFamily = fontFamily;
    
    // 如果有内容元素，应用新字体
    if (this.state.contentElement) {
      this.applyTextStyles();
    }
  }

  setLineHeight(lineHeight: number): void {
    this.state.settings.lineHeight = lineHeight;
    
    // 如果有内容元素，应用新行高
    if (this.state.contentElement) {
      this.applyTextStyles();
    }
  }

  getReadingSettings(): ReadingSettings {
    return { ...this.state.settings };
  }

  getPageInfo(): { current: number; total: number; text: string } {
    const current = this.state.currentChapterIndex + 1;
    const total = this.getTotalChapters();
    return {
      current,
      total,
      text: `第 ${current} 章 / 共 ${total} 章`
    };
  }

  // 阅读器状态
  getReadingState(): ReadingState {
    return {
      currentChapterIndex: this.state.currentChapterIndex,
      book: this.state.book,
      settings: { ...this.state.settings },
      contentElement: this.state.contentElement
    };
  }

  // DOM管理方法
  setContentElement(elementId: string): boolean {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id '${elementId}' not found`);
      return false;
    }
    
    this.state.contentElement = element;
    this.applyCurrentStyles();
    return true;
  }

  getContentElement(): HTMLElement | null {
    return this.state.contentElement;
  }

  private applyCurrentStyles(): void {
    if (!this.state.contentElement) return;
    
    this.applyThemeStyles();
    this.applyTextStyles();
  }

  private applyThemeStyles(): void {
    if (!this.state.contentElement) return;
    
    const element = this.state.contentElement;
    const isDark = this.state.settings.isDarkTheme;
    
    // 主背景和文字颜色
    element.style.backgroundColor = isDark ? '#1e1e1e' : 'white';
    element.style.color = isDark ? '#e0e0e0' : '#333';
    
    // 标题颜色
    const titles = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    titles.forEach(title => {
      (title as HTMLElement).style.color = isDark ? '#ffffff' : '#2c3e50';
    });
  }

  private applyTextStyles(): void {
    if (!this.state.contentElement) return;
    
    const element = this.state.contentElement;
    const settings = this.state.settings;
    
    // 查找或创建内容容器
    let contentContainer = element.querySelector('.chapter-body') as HTMLElement;
    if (!contentContainer) {
      contentContainer = document.createElement('div');
      contentContainer.className = 'chapter-body';
      if (element.firstChild) {
        element.insertBefore(contentContainer, element.firstChild.nextSibling);
      } else {
        element.appendChild(contentContainer);
      }
    }
    
    // 应用文本样式
    contentContainer.style.fontSize = settings.fontSize + 'px';
    contentContainer.style.fontFamily = settings.fontFamily;
    contentContainer.style.lineHeight = settings.lineHeight.toString();
    contentContainer.style.textAlign = 'justify';
    contentContainer.style.marginBottom = '16px';
  }

  renderChapter(chapterIndex?: number): boolean {
    if (!this.state.contentElement) {
      console.error('Content element not set. Call setContentElement() first.');
      return false;
    }
    
    if (!this.state.book || this.state.book.chapters.length === 0) {
      console.error('No book loaded or book has no chapters');
      return false;
    }
    
    // 使用传入的索引或当前索引
    const targetIndex = chapterIndex !== undefined ? chapterIndex : this.state.currentChapterIndex;
    
    if (targetIndex < 0 || targetIndex >= this.state.book.chapters.length) {
      console.error(`Invalid chapter index: ${targetIndex}`);
      return false;
    }
    
    const chapter = this.state.book.chapters[targetIndex];
    const element = this.state.contentElement;
    
    // 清空内容
    element.innerHTML = '';
    
    // 添加章节标题
    const titleElement = document.createElement('h1');
    titleElement.className = 'chapter-title';
    titleElement.textContent = chapter.title;
    titleElement.style.cssText = `
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e1e4e8;
    `;
    element.appendChild(titleElement);
    
    // 添加章节内容
    const contentContainer = document.createElement('div');
    contentContainer.className = 'chapter-body';
    contentContainer.innerHTML = chapter.content;
    
    // 处理图片样式
    const images = contentContainer.querySelectorAll('img');
    images.forEach(img => {
      (img as HTMLElement).style.cssText = `
        max-width: 100%;
        height: auto;
        display: block;
        margin: 20px auto;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      `;
    });
    
    // 处理段落样式
    const paragraphs = contentContainer.querySelectorAll('p');
    paragraphs.forEach(p => {
      (p as HTMLElement).style.cssText = `
        margin-bottom: 16px;
        text-align: justify;
      `;
    });
    
    element.appendChild(contentContainer);
    
    // 更新当前章节索引
    this.state.currentChapterIndex = targetIndex;
    
    // 应用当前样式
    this.applyCurrentStyles();
    
    return true;
  }

  getBook(): EpubBook {
    return this.book;
  }
}