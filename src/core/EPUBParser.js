import ZipReader from '../utils/ZipReader.js';
import XMLParser from '../utils/XMLParser.js';
import PathResolver from '../utils/PathResolver.js';
import MimeTypeChecker from '../utils/MimeTypeChecker.js';
import ContainerParser from './ContainerParser.js';
import OPFParser from './OPFParser.js';
import NCXParser from './NCXParser.js';
import NavigationParser from './NavigationParser.js';
import EPUBBook from '../models/EPUBBook.js';
import Chapter from '../models/Chapter.js';
import Metadata from '../models/Metadata.js';

class EPUBReader {
  constructor() {
    this.book = new EPUBBook();
    this.zipReader = new ZipReader();
    this.pathResolver = null;
    this.isLoaded = false;
  }

  async load(source) {
    try {
      // 重置状态
      this.reset();
      
      // 加载ZIP文件
      await this.zipReader.load(source);
      
      // 解析container.xml获取OPF文件路径
      await this.parseContainer();
      
      // 解析OPF文件
      await this.parseOPF();
      
      // 解析目录结构
      await this.parseTableOfContents();
      
      // 创建章节对象
      this.createChapters();
      
      this.isLoaded = true;
      return this.book;
    } catch (error) {
      throw new Error(`Failed to load EPUB: ${error.message}`);
    }
  }

  async parseContainer() {
    const containerXml = await this.zipReader.getFileText('META-INF/container.xml');
    const container = await ContainerParser.parse(containerXml);
    
    // 先创建临时的 PathResolver 来获取目录
    const tempResolver = PathResolver.create('');
    this.book.rootPath = tempResolver.getDirectory(container.fullPath);
    this.pathResolver = PathResolver.create(this.book.rootPath);
    
    return container;
  }

  async parseOPF() {
    const opfFiles = this.zipReader.listFiles().filter(file => 
      file.endsWith('.opf') || file.includes('content.opf')
    );
    
    if (opfFiles.length === 0) {
      throw new Error('OPF file not found in EPUB');
    }
    
    const opfPath = opfFiles[0];
    const opfXml = await this.zipReader.getFileText(opfPath);
    const opfData = await OPFParser.parse(opfXml);
    
    this.book.version = opfData.version;
    this.book.metadata = Metadata.fromOPFMetadata(opfData.metadata);
    this.book.manifest = opfData.manifest;
    this.book.spine = opfData.spine.items;
    
    // 保存guide信息
    if (opfData.guide) {
      this.book.guide = opfData.guide;
    }
    
    return opfData;
  }

  async parseTableOfContents() {
    let toc = null;
    
    // 尝试EPUB3导航文档
    const navFile = this.findManifestItemByType('application/x-dtbncx+xml') || 
                   this.findManifestItemByProperties('nav');
    
    if (navFile) {
      try {
        const navPath = this.pathResolver.resolve(navFile.href);
        const navXml = await this.zipReader.getFileText(navPath);
        
        if (NavigationParser.isNavigationDocument(navXml)) {
          const navigation = await NavigationParser.parse(navXml);
          toc = navigation.toc;
        }
      } catch (error) {
        console.warn('Failed to parse navigation document, falling back to NCX');
      }
    }
    
    // 如果没有找到EPUB3导航，尝试NCX
    if (!toc) {
      const ncxFile = this.findNCXFile();
      if (ncxFile) {
        const ncxPath = this.pathResolver.resolve(ncxFile.href);
        const ncxXml = await this.zipReader.getFileText(ncxPath);
        const ncxData = await NCXParser.parse(ncxXml);
        toc = ncxData.navMap;
      }
    }
    
    this.book.setTableOfContents(toc);
    
    return toc;
  }

  createChapters() {
    this.book.spine.forEach((spineItem, index) => {
      const chapter = Chapter.fromOPFSpineItem(spineItem, this.book.manifest, index);
      this.book.addChapter(chapter);
    });
  }

  findManifestItemByType(mediaType) {
    return Object.values(this.book.manifest).find(item => item.mediaType === mediaType);
  }

  findManifestItemByProperties(properties) {
    return Object.values(this.book.manifest).find(item => 
      item.properties && item.properties.includes(properties)
    );
  }

  findNCXFile() {
    // 首先尝试spine中的toc属性
    if (this.book.spine.toc) {
      const ncxItem = this.book.manifest[this.book.spine.toc];
      if (ncxItem) return ncxItem;
    }
    
    // 然后在manifest中查找NCX文件
    return this.findManifestItemByType('application/x-dtbncx+xml');
  }

  async getChapter(chapterIdOrHref) {
    if (!this.isLoaded) {
      throw new Error('EPUB not loaded. Call load() first.');
    }
    
    let chapter;
    
    // 按ID查找
    if (typeof chapterIdOrHref === 'string') {
      chapter = this.book.getChapterById(chapterIdOrHref);
      if (!chapter) {
        chapter = this.book.getChapterByHref(chapterIdOrHref);
      }
    }
    
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterIdOrHref}`);
    }
    
    // 如果章节未加载，加载内容
    if (!chapter.isLoaded) {
      const chapterPath = this.pathResolver.resolve(chapter.href);
      const content = await this.zipReader.getFileText(chapterPath);
      const mediaType = this.getChapterMediaType(chapter);
      chapter.setContent(content, mediaType);
    }
    
    return chapter;
  }

  getChapterMediaType(chapter) {
    const manifestItem = this.book.manifest[chapter.id];
    if (manifestItem && manifestItem.mediaType) {
      return manifestItem.mediaType;
    }
    
    return MimeTypeChecker.getMimeTypeFromFileName(chapter.href);
  }

  getMetadata() {
    if (!this.isLoaded) {
      throw new Error('EPUB not loaded. Call load() first.');
    }
    
    return this.book.metadata;
  }

  getTableOfContents() {
    if (!this.isLoaded) {
      throw new Error('EPUB not loaded. Call load() first.');
    }
    
    return this.book.toc;
  }

  getChapters() {
    if (!this.isLoaded) {
      throw new Error('EPUB not loaded. Call load() first.');
    }
    
    return this.book.chapters;
  }

  async search(query, options = {}) {
    if (!this.isLoaded) {
      throw new Error('EPUB not loaded. Call load() first.');
    }
    
    // 确保所有章节都已加载
    for (const chapter of this.book.chapters) {
      if (!chapter.isLoaded) {
        await this.getChapter(chapter.id);
      }
    }
    
    return this.book.search(query, options);
  }

  reset() {
    this.book.destroy();
    this.book = new EPUBBook();
    this.pathResolver = null;
    this.isLoaded = false;
  }

  destroy() {
    this.reset();
    this.zipReader.destroy();
  }
}

export default EPUBReader;