import JSZip from 'jszip';
import { JSZipWrapper } from './jszip-wrapper';
import {
  EpubInfo,
  EpubMetadata,
  EpubManifest,
  EpubSpine,
  EpubTableOfContents,
  EpubChapter,
  EpubReaderOptions,
} from './types';

// XML解析器包装器 - 处理浏览器兼容性
class XMLParser {
  private static isXML2JSAvailable = false;
  private static initializePromise: Promise<void> | null = null;

  static async initialize(): Promise<void> {
    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = (async () => {
      // 检查是否在浏览器环境
      const isBrowser = typeof window !== 'undefined';

      if (isBrowser) {
        this.isXML2JSAvailable = false;
        return;
      }

      try {
        // 尝试动态导入xml2js（仅限Node.js环境）
        const xml2js = await import('xml2js');
        this.isXML2JSAvailable = true;
      } catch (error) {
        this.isXML2JSAvailable = false;
      }
    })();

    return this.initializePromise;
  }

  static async parseString(xml: string): Promise<any> {
    await this.initialize();

    if (this.isXML2JSAvailable) {
      try {
        const xml2js = await import('xml2js');
        return new Promise((resolve, reject) => {
          xml2js.parseString(xml, { explicitArray: true }, (err: any, result: any) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
      } catch (error) {
        // 如果xml2js失败，尝试使用浏览器原生解析器
        return this.parseWithDOMParser(xml);
      }
    } else {
      // 使用浏览器原生XML解析器
      return this.parseWithDOMParser(xml);
    }
  }

  private static parseWithDOMParser(xml: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (typeof DOMParser === 'undefined') {
        reject(new Error('当前环境不支持XML解析，请升级浏览器或使用Node.js环境'));
        return;
      }

      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, 'text/xml');
        
        // 检查解析错误
        const parserError = xmlDoc.getElementsByTagName('parsererror');
        if (parserError.length > 0) {
          throw new Error('XML解析错误: ' + parserError[0].textContent);
        }

        const result = this.xmlElementToObject(xmlDoc.documentElement);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  private static xmlElementToObject(element: Element): any {
    const obj: any = {};

    // 处理属性
    if (element.attributes.length > 0) {
      obj.$ = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        obj.$[attr.nodeName] = attr.nodeValue;
      }
    }

    // 处理子元素和文本内容
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes[i];
      
      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        // 文本节点
        if (Object.keys(obj).length === 0) {
          // 如果没有属性或子元素，直接返回文本
          return child.textContent.trim();
        } else {
          // 有其他内容，将文本作为_属性
          obj._ = child.textContent.trim();
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childObj = this.xmlElementToObject(child as Element);
        const childName = child.nodeName;
        
        if (!obj[childName]) {
          obj[childName] = [];
        }
        obj[childName].push(childObj);
      }
    }

    // 关键修复：不要自动简化数组，保持xml2js兼容性
    // xml2js的explicitArray: true会保持所有元素为数组形式
    for (const key in obj) {
      if (!Array.isArray(obj[key]) && key !== '$' && key !== '_') {
        obj[key] = [obj[key]];
      }
    }

    return obj;
  }
}

export class EpubReader {
  private zip: JSZip | null = null;
  private info: EpubInfo | null = null;
  private options: EpubReaderOptions;
  private currentChapterContent: string = '';
  private targetElementId: string = '';
  private currentChapterIndex: number = 0;

  constructor(options: EpubReaderOptions = {}) {
    this.options = {
      encoding: 'utf8',
      loadCover: true,
      ...options,
    };

    // 如果初始化时提供了目标元素ID，保存它
    if (options.targetElementId) {
      this.targetElementId = options.targetElementId;
    }
  }

  async load(epubData: ArrayBuffer | Uint8Array | Blob): Promise<void> {
    try {
      if (epubData instanceof Blob) {
        epubData = await epubData.arrayBuffer();
      }

      // 确保我们有正确的Uint8Array格式用于JSZip
      let data: Uint8Array;
      if (epubData instanceof ArrayBuffer) {
        data = new Uint8Array(epubData);
      } else if (epubData instanceof Uint8Array) {
        data = epubData;
      } else {
        throw new Error(`EPUB数据类型无效: ${typeof epubData}`);
      }

      // 检查数据完整性
      if (data.length === 0) {
        throw new Error('EPUB数据为空');
      }

      // 使用JSZip包装器加载
      this.zip = await JSZipWrapper.loadAsync(data);
      await this.parseEpub();
      
      // 如果设置了目标元素ID，自动加载第一章
      if (this.targetElementId) {
        // 延迟执行，确保DOM已经渲染
        setTimeout(async () => {
          try {
            await this.loadChapterByIndex(0, {
              showLoading: false // 静默加载，避免显示加载状态
            });
          } catch (error) {
            console.warn('自动加载第一章失败:', error);
          }
        }, 100); // 100ms延迟，确保Vue组件已渲染DOM
      }
      
    } catch (error) {
      // 处理JSZip兼容性问题
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        // 生成更详细的诊断信息
        let diagnosticInfo = '';
        
        if (errorMsg.includes('removealllisteners') || errorMsg.includes('eventemitter')) {
          diagnosticInfo = '\n\n🔍 诊断信息: 这可能是以下原因导致的:\n';
          diagnosticInfo += '1. 浏览器版本过旧，缺少必要的JavaScript API\n';
          diagnosticInfo += '2. 某些浏览器扩展干扰了正常功能\n';
          diagnosticInfo += '3. 企业网络环境的安全策略限制\n';
          diagnosticInfo += '4. JSZip库与当前浏览器环境不兼容\n\n';
          diagnosticInfo += '💡 建议解决方案:\n';
          diagnosticInfo += '• 使用最新版Chrome、Firefox、Safari或Edge\n';
          diagnosticInfo += '• 清除浏览器缓存和Cookie\n';
          diagnosticInfo += '• 尝试无痕模式或禁用扩展程序\n';
          diagnosticInfo += '• 检查浏览器控制台的详细错误信息';
          
          throw new Error('JSZip兼容性错误' + diagnosticInfo);
        } else if (errorMsg.includes('corrupt') || errorMsg.includes('invalid')) {
          diagnosticInfo = '\n\n🔍 可能原因:\n';
          diagnosticInfo += '• EPUB文件已损坏或下载不完整\n';
          diagnosticInfo += '• 文件不是有效的EPUB格式\n';
          diagnosticInfo += '• 文件传输过程中出现错误\n\n';
          diagnosticInfo += '💡 建议解决方案:\n';
          diagnosticInfo += '• 重新下载EPUB文件\n';
          diagnosticInfo += '• 尝试用其他EPUB阅读器验证文件\n';
          diagnosticInfo += '• 检查文件大小是否正常';
          
          throw new Error('EPUB文件格式错误' + diagnosticInfo);
        } else if (errorMsg.includes('memory') || errorMsg.includes('out of memory')) {
          diagnosticInfo = '\n\n🔍 内存不足问题:\n';
          diagnosticInfo += '• EPUB文件过大，超出浏览器内存限制\n';
          diagnosticInfo += '• 浏览器打开的标签页过多\n';
          diagnosticInfo += '• 系统可用内存不足\n\n';
          diagnosticInfo += '💡 建议解决方案:\n';
          diagnosticInfo += '• 关闭其他不必要的浏览器标签页\n';
          diagnosticInfo += '• 尝试较小的EPUB文件\n';
          diagnosticInfo += '• 重启浏览器释放内存';
          
          throw new Error('内存不足错误' + diagnosticInfo);
        }
        
        // 提供更详细的错误上下文
        throw new Error(`加载EPUB文件失败: ${error.message}`);
      }
      
      throw error;
    }
  }

  

  private async parseEpub(): Promise<void> {
    if (!this.zip) throw new Error('EPUB not loaded');

    // 解析container.xml
    const containerXml = await this.getFileContent('META-INF/container.xml');
    const container = await this.parseXml(containerXml);
    
    // 安全地获取rootfile路径
    const containerElement = container.container || container;
    
    if (!containerElement) {
      throw new Error('container.xml格式错误：缺少container元素');
    }
    
    if (!containerElement.rootfiles) {
      throw new Error('container.xml格式错误：缺少rootfiles元素');
    }
    
    const rootfiles = Array.isArray(containerElement.rootfiles) 
      ? containerElement.rootfiles 
      : [containerElement.rootfiles];

    if (!rootfiles[0] || !rootfiles[0].rootfile) {
      throw new Error('container.xml格式错误：缺少rootfile元素');
    }
    
    const firstRootfile = rootfiles[0].rootfile || rootfiles[0];
    const rootfilesArray = Array.isArray(firstRootfile) 
      ? firstRootfile 
      : [firstRootfile];
    
    if (!rootfilesArray[0] || !rootfilesArray[0].$ || !rootfilesArray[0].$['full-path']) {
      throw new Error('container.xml格式错误：rootfile缺少full-path属性');
    }
    
    const rootfilePath = rootfilesArray[0].$['full-path'];
    
    // 解析OPF文件
    const opfContent = await this.getFileContent(rootfilePath);
    const opf = await this.parseXml(opfContent);

    this.info = await this.parseOpf(opf, rootfilePath);
  }

  private async parseOpf(opf: any, rootfilePath: string): Promise<EpubInfo> {
    // 兼容两种解析器的结构
    const packageElement = opf.package || opf;
    
    if (!packageElement) {
      throw new Error('OPF文件格式错误：缺少package元素');
    }
    
    // 安全地获取各个元素
    const metadataElement = this.getMetadataElement(packageElement);
    const manifestElement = this.getManifestElement(packageElement);
    const spineElement = this.getSpineElement(packageElement);

    const metadata = this.parseMetadata(metadataElement);
    const manifest = this.parseManifest(manifestElement);
    const spine = this.parseSpine(spineElement);
    
    const toc = await this.parseTableOfContents(manifest, spine);
    const chapters = this.parseChapters(manifest, spine, rootfilePath);

    return {
      metadata,
      manifest,
      spine,
      toc,
      chapters,
    };
  }

  private getMetadataElement(packageElement: any): any {
    // 尝试多种可能的元数据元素路径
    const possibilities = [
      packageElement['dc-metadata']?.[0],
      packageElement.metadata?.[0],
      packageElement['dc-metadata'],
      packageElement.metadata
    ];
    
    for (const metadata of possibilities) {
      if (metadata) {
        return metadata;
      }
    }
    
    return {};
  }

  private getManifestElement(packageElement: any): any {
    return packageElement.manifest?.[0] || packageElement.manifest || {};
  }

  private getSpineElement(packageElement: any): any {
    return packageElement.spine?.[0] || packageElement.spine || {};
  }

  private parseMetadata(metadataElement: any): EpubMetadata {
    const metadata: EpubMetadata = {};

    if (metadataElement) {
      // 安全地获取各种元数据字段
      const getField = (fieldName: string, dcName?: string) => {
        const possibilities = [
          metadataElement[`dc:${dcName || fieldName}`]?.[0],
          metadataElement[fieldName]?.[0],
          metadataElement[`dc:${dcName || fieldName}`],
          metadataElement[fieldName]
        ];
        
        for (const field of possibilities) {
          if (field) {
            return field._ || field;
          }
        }
        
        return null;
      };

      metadata.title = getField('title');
      metadata.creator = getField('creator');
      metadata.description = getField('description');
      metadata.language = getField('language');
      metadata.publisher = getField('publisher');
      metadata.identifier = getField('identifier');
      metadata.date = getField('date');
      metadata.rights = getField('rights');

      // 处理meta元素（比如cover）
      const metaArray = Array.isArray(metadataElement.meta) 
        ? metadataElement.meta 
        : (metadataElement.meta ? [metadataElement.meta] : []);
      
      const metaCover = metaArray.find((meta: any) => 
        meta.$?.name === 'cover'
      );
      if (metaCover) {
        metadata.cover = metaCover.$.content;
      }
    }

    return metadata;
  }

  private parseManifest(manifestElement: any): EpubManifest[] {
    if (!manifestElement?.item) {
      return [];
    }

    const items = Array.isArray(manifestElement.item) 
      ? manifestElement.item 
      : [manifestElement.item];
    
    const manifest = items.map((item: any, index: number) => ({
      id: item.$?.id || `item-${index}`,
      href: item.$?.href || '',
      mediaType: item.$?.['media-type'] || '',
    }));
    
    return manifest;
  }

  private parseSpine(spineElement: any): EpubSpine[] {
    if (!spineElement?.itemref) {
      return [];
    }

    const itemrefs = Array.isArray(spineElement.itemref) 
      ? spineElement.itemref 
      : [spineElement.itemref];
    
    const spine = itemrefs.map((itemref: any, index: number) => ({
      idref: itemref.$?.idref || `itemref-${index}`,
      linear: itemref.$?.linear || 'yes',
    }));
    
    return spine;
  }

  private async parseTableOfContents(
    manifest: EpubManifest[],
    spine: EpubSpine[]
  ): Promise<EpubTableOfContents[]> {
    // 方法1: 尝试NCX文件 (传统的EPUB 2.0格式)
    const ncxItem = manifest.find(item => item.mediaType === 'application/x-dtbncx+xml');
    
    if (ncxItem) {
      try {
        const ncxContent = await this.getFileContent(ncxItem.href);
        
        const ncx = await this.parseXml(ncxContent);
        
        // 兼容两种解析器的结构
        const ncxElement = ncx.ncx || ncx;
        
        const navMap = ncxElement?.navMap?.[0] || ncxElement?.navMap;
        
        if (navMap?.navPoint) {
          const navPoints = Array.isArray(navMap.navPoint) ? navMap.navPoint : [navMap.navPoint];
          const toc = this.parseNavPoints(navPoints, 0);
          return toc;
        }
      } catch (error) {
        // NCX解析失败，继续尝试其他方法
      }
    }
    
    // 方法2: 尝试导航文档 (EPUB 3.0格式)
    const navItems = manifest.filter(item => 
      item.mediaType === 'application/xhtml+xml' && 
      (item.href.includes('nav') || item.href.includes('toc'))
    );
    
    for (const navItem of navItems) {
      try {
        const navContent = await this.getFileContent(navItem.href);
        
        // 查找<nav>标签
        const navMatch = navContent.match(/<nav[^>]*>([\s\S]*?)<\/nav>/gi);
        if (navMatch) {
          for (let i = 0; i < navMatch.length; i++) {
            const navElement = navMatch[i];
            
            // 解析nav中的链接
            const toc = await this.parseNavFromHtml(navElement, navItem.href);
            if (toc.length > 0) {
              return toc;
            }
          }
        }
      } catch (error) {
        // 导航文档解析失败，继续尝试其他方法
      }
    }
    
    // 方法3: 从章节生成基础目录
    const basicToc = spine.map((spineItem, index) => {
      const manifestItem = manifest.find(item => item.id === spineItem.idref);
      const href = manifestItem ? manifestItem.href : '';
      const fileName = href.split('/').pop() || '';
      
      return {
        id: spineItem.idref,
        href: href,
        title: `Chapter ${index + 1}${fileName ? ` - ${fileName}` : ''}`,
        order: index,
        children: []
      };
    });
    
    return basicToc;
  }

  private async parseNavFromHtml(navHtml: string, navHref: string): Promise<EpubTableOfContents[]> {
    // 获取nav文件的基础路径
    const basePath = navHref.substring(0, navHref.lastIndexOf('/') + 1);
    
    // 解析HTML中的链接
    const linkRegex = /<a[^>]+href\s*=\s*['"]([^'"]+)['"][^>]*>([^<]+)<\/a>/gi;
    const toc: EpubTableOfContents[] = [];
    let match;
    let order = 0;
    
    while ((match = linkRegex.exec(navHtml)) !== null) {
      const [fullMatch, href, text] = match;
      const title = text.trim();
      
      if (title) {
        toc.push({
          id: `nav-${order}`,
          href: basePath + href,
          title: title,
          order: order++,
          children: []
        });
      }
    }
    
    return toc;
  }

  private parseNavPoints(navPoints: any, startOrder: number): EpubTableOfContents[] {
    // 确保navPoints是数组
    const points = Array.isArray(navPoints) ? navPoints : [navPoints];
    
    return points.map((navPoint, index) => {
      // 兼容不同的XML解析器结构
      const label = navPoint.navLabel?.[0]?.text?.[0] || 
                   navPoint.navLabel?.text?.[0] ||
                   navPoint.navLabel?.[0]?.text ||
                   navPoint.navLabel?.text ||
                   navPoint.text ||
                   '';
      
      const src = navPoint.content?.[0]?.$?.src || 
                 navPoint.content?.$?.src ||
                 navPoint.src ||
                 '';
      
      const id = navPoint.$.id || navPoint.id || `navPoint-${startOrder + index}`;
      
      const toc: EpubTableOfContents = {
        id: id,
        href: src || '',
        title: String(label || `Chapter ${startOrder + index + 1}`),
        order: startOrder + index,
      };

      // 处理子导航点
      if (navPoint.navPoint) {
        toc.children = this.parseNavPoints(navPoint.navPoint, 0);
      }

      return toc;
    });
  }

  private parseChapters(
    manifest: EpubManifest[],
    spine: EpubSpine[],
    rootfilePath: string
  ): EpubChapter[] {
    const rootPath = rootfilePath.substring(0, rootfilePath.lastIndexOf('/') + 1);

    return spine.map((spineItem, index) => {
      const manifestItem = manifest.find(item => item.id === spineItem.idref);
      
      return {
        id: spineItem.idref,
        href: manifestItem ? rootPath + manifestItem.href : '',
        order: index,
      };
    }).filter(chapter => chapter.href);
  }

  private async getFileContent(filePath: string): Promise<string> {
    if (!this.zip) throw new Error('EPUB not loaded');

    const file = this.zip.file(filePath);
    if (!file) throw new Error(`File not found: ${filePath}`);

    return await file.async('text');
  }

  private async parseXml(xml: string): Promise<any> {
    try {
      const result = await XMLParser.parseString(xml);
      return result;
    } catch (error) {
      throw new Error(`XML解析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getInfo(): EpubInfo | null {
    return this.info;
  }

  getMetadata(): EpubMetadata | null {
    return this.info?.metadata || null;
  }

  getChapters(): EpubChapter[] {
    return this.info?.chapters || [];
  }

  getTableOfContents(): EpubTableOfContents[] {
    return this.info?.toc || [];
  }

  async getChapterContent(chapterHref: string): Promise<string> {
    if (!this.zip) throw new Error('EPUB not loaded');

    try {
      const content = await this.getFileContent(chapterHref);
      
      // 处理资源引用（图片、CSS等）
      const processedContent = await this.processContentResources(content, chapterHref);
      
      return processedContent;
    } catch (error) {
      console.error('❌ 章节加载失败:', error);
      throw new Error(`Failed to load chapter content: ${chapterHref}`);
    }
  }

  private async processContentResources(htmlContent: string, chapterHref: string): Promise<string> {
    // 获取章节的基础路径
    const chapterPath = chapterHref.substring(0, chapterHref.lastIndexOf('/') + 1);
    
    // 处理图片标签
    let processedContent = htmlContent;
    
    // 使用正则表达式找到所有的img标签
    const imgRegex = /<img([^>]+)src\s*=\s*['"]([^'"]+)['"]([^>]*)>/gi;
    let match;
    const imgPromises: Promise<void>[] = [];
    const imgReplacements: Array<{ original: string; replacement: string }> = [];
    
    while ((match = imgRegex.exec(htmlContent)) !== null) {
      const [fullMatch, beforeSrc, src, afterSrc] = match;
      
      // 跳过已经是data URL或完整URL的图片
      if (src.startsWith('data:') || src.startsWith('http')) {
        continue;
      }
      
      // 处理相对路径
      const fullImagePath = this.resolveResourcePath(src, chapterPath);
      
      // 创建异步处理promise
      const promise = this.processImageResource(fullImagePath, src, beforeSrc, afterSrc)
        .then(replacement => {
          if (replacement) {
            imgReplacements.push({ original: fullMatch, replacement });
          }
        })
        .catch(error => {
          // 图片处理失败，继续处理其他图片
        });
      
      imgPromises.push(promise);
    }
    
    // 等待所有图片处理完成
    if (imgPromises.length > 0) {
      await Promise.all(imgPromises);
    }
    
    // 替换所有处理完成的图片标签
    for (const { original, replacement } of imgReplacements) {
      processedContent = processedContent.replace(original, replacement);
    }
    
    // 处理CSS链接
    const cssRegex = /<link([^>]+)href\s*=\s*['"]([^'"]+)['"]([^>]*)>/gi;
    const cssReplacements: Array<{ original: string; replacement: string }> = [];
    
    while ((match = cssRegex.exec(processedContent)) !== null) {
      const [fullMatch, beforeHref, href, afterHref] = match;
      
      if (href.startsWith('http')) {
        continue;
      }
      
      const fullCssPath = this.resolveResourcePath(href, chapterPath);
      
      // 这里可以添加CSS处理逻辑，暂时跳过
    }
    
    return processedContent;
  }

  private resolveResourcePath(resourcePath: string, basePath: string): string {
    // 移除开头的 ./
    let cleanPath = resourcePath.startsWith('./') ? resourcePath.substring(2) : resourcePath;
    
    // 如果已经是绝对路径，直接返回
    if (cleanPath.startsWith('/')) {
      return cleanPath.substring(1); // 移除开头的 /
    }
    
    // 结合基础路径
    return basePath + cleanPath;
  }

  private async processImageResource(
    fullImagePath: string, 
    originalSrc: string, 
    beforeSrc: string, 
    afterSrc: string
  ): Promise<string | null> {
    try {
      // 尝试从ZIP文件中获取图片
      const imageData = await this.getResource(fullImagePath);
      
      if (!imageData) {
        // 返回带错误标记的img标签
        return `<img${beforeSrc}src="data:image/svg+xml;base64,${btoa(`
          <svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f0f0f0"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#666" font-size="12">
              图片未找到: ${originalSrc}
            </text>
          </svg>
        `.replace(/\s+/g, ' '))}"${afterSrc} style="border: 1px dashed #ccc;"/>`;
      }
      
      // 确定图片MIME类型
      const mimeType = this.getImageMimeType(fullImagePath);
      
      // 创建data URL
      const dataUrl = `data:${mimeType};base64,${imageData}`;
      
      return `<img${beforeSrc}src="${dataUrl}"${afterSrc}>`;
      
    } catch (error) {
      console.error('❌ 图片处理错误:', error);
      return `<img${beforeSrc}src="data:image/svg+xml;base64,${btoa(`
        <svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#ffebee"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#c62828" font-size="12">
            图片加载失败: ${originalSrc}
          </text>
        </svg>
      `.replace(/\s+/g, ' '))}"${afterSrc} style="border: 1px dashed #f44336;"/>`;
    }
  }

  private getImageMimeType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      'webp': 'image/webp'
    };
    
    return mimeTypes[extension || ''] || 'image/jpeg';
  }

  async getChapterContentByIndex(index: number): Promise<string> {
    const chapters = this.getChapters();
    if (index < 0 || index >= chapters.length) {
      throw new Error(`Chapter index out of range: ${index}`);
    }

    return await this.getChapterContent(chapters[index].href);
  }

  async getCoverImage(): Promise<string | null> {
    if (!this.zip || !this.options.loadCover) return null;

    try {
      const metadata = this.getMetadata();
      const manifest = this.info?.manifest || [];
      
      // 方法1: 通过meta标签的cover属性查找
      if (metadata?.cover) {
        const coverItem = manifest.find(item => item.id === metadata.cover);
        
        if (coverItem && coverItem.mediaType.startsWith('image/')) {
          const coverUrl = await this.loadImageResource(coverItem.href);
          if (coverUrl) {
            return coverUrl;
          }
        }
      }
      
      // 方法2: 查找id包含"cover"的资源
      const coverItems = manifest.filter(item => 
        item.id.toLowerCase().includes('cover') && 
        item.mediaType.startsWith('image/')
      );
      
      for (const coverItem of coverItems) {
        const coverUrl = await this.loadImageResource(coverItem.href);
        if (coverUrl) {
          return coverUrl;
        }
      }
      
      // 方法3: 查找href包含cover的图片文件
      const coverByHref = manifest.filter(item => 
        item.href.toLowerCase().includes('cover') && 
        item.mediaType.startsWith('image/')
      );
      
      for (const coverItem of coverByHref) {
        const coverUrl = await this.loadImageResource(coverItem.href);
        if (coverUrl) {
          return coverUrl;
        }
      }
      
      // 方法4: 查找常见的封面文件名
      const commonCoverNames = [
        'cover.jpg', 'cover.jpeg', 'cover.png', 'cover.gif',
        'Cover.jpg', 'Cover.jpeg', 'Cover.png', 'Cover.gif',
        'cover-image.jpg', 'cover-image.jpeg', 'cover-image.png',
        'title.jpg', 'title.jpeg', 'title.png',
        'front.jpg', 'front.jpeg', 'front.png'
      ];
      
      for (const coverName of commonCoverNames) {
        const coverItem = manifest.find(item => item.href === coverName);
        if (coverItem && coverItem.mediaType.startsWith('image/')) {
          const coverUrl = await this.loadImageResource(coverItem.href);
          if (coverUrl) {
            return coverUrl;
          }
        }
      }
      
      // 方法5: 查找第一个图片文件（作为最后的备选）
      const firstImage = manifest.find(item => item.mediaType.startsWith('image/'));
      
      if (firstImage) {
        const coverUrl = await this.loadImageResource(firstImage.href);
        if (coverUrl) {
          return coverUrl;
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ 封面加载失败:', error);
      return null;
    }
  }

  private async loadImageResource(href: string): Promise<string | null> {
    try {
      // 获取图片数据
      const imageData = await this.getResource(href);
      if (!imageData) {
        return null;
      }
      
      // 确定MIME类型
      const mimeType = this.getImageMimeType(href);
      
      // 创建Data URL
      const dataUrl = `data:${mimeType};base64,${imageData}`;
      
      return dataUrl;
      
    } catch (error) {
      console.error('❌ 图片资源加载失败:', href, error);
      return null;
    }
  }

  async getResource(href: string): Promise<string | null> {
    if (!this.zip) return null;

    try {
      const file = this.zip.file(href);
      if (!file) {
        // 尝试一些常见的路径变体
        const alternatives = [
          href.startsWith('/') ? href.substring(1) : '/' + href,
          href.startsWith('./') ? href.substring(2) : './' + href,
        ];
        
        for (const alt of alternatives) {
          const altFile = this.zip.file(alt);
          if (altFile) {
            const content = await altFile.async('base64');
            return content;
          }
        }
        
        return null;
      }

      const content = await file.async('base64');
      return content;
    } catch (error) {
      console.error(`❌ 资源加载失败: ${href}`, error);
      return null;
    }
  }

  /**
   * 渲染章节内容到指定的DOM元素
   * @param chapterIndex 章节索引
   * @param elementId 目标DOM元素的ID（可选，使用初始化时的ID）
   * @param options 渲染选项
   */
  async renderChapter(
    chapterIndex: number, 
    elementId?: string, 
    options: {
      showLoading?: boolean;
      className?: string;
      onError?: (error: Error) => void;
      onSuccess?: () => void;
    } = {}
  ): Promise<void> {
    const {
      showLoading = true,
      className = 'epub-chapter-content',
      onError,
      onSuccess
    } = options;

    // 确定目标元素ID
    const targetId = elementId || this.targetElementId;
    if (!targetId) {
      const error = new Error('未指定目标元素ID，请在初始化时设置或传入参数');
      onError?.(error);
      throw error;
    }

    // 等待DOM元素存在（最多等待2秒）
    const targetElement = await this.waitForElement(targetId, 2000);
    if (!targetElement) {
      const error = new Error(`目标元素不存在: #${targetId}，请确保DOM元素已创建`);
      onError?.(error);
      throw error;
    }

    // 保存当前使用的元素ID
    this.targetElementId = targetId;

    try {
      // 显示加载状态
      if (showLoading) {
        this.showLoadingState(targetElement);
      }

      // 更新当前章节索引
      this.currentChapterIndex = chapterIndex;

      // 获取章节内容
      this.currentChapterContent = await this.getChapterContentByIndex(chapterIndex);

      // 渲染内容
      this.renderContentToElement(targetElement, this.currentChapterContent, className);

      // 应用样式
      this.applyChapterStyles(targetId);

      // 处理交互
      this.setupChapterInteractions(targetId, chapterIndex);

      onSuccess?.();
    } catch (error) {
      const errorMsg = error instanceof Error ? error : new Error(String(error));
      this.showErrorState(targetElement, errorMsg);
      onError?.(errorMsg);
      throw errorMsg;
    }
  }

  /**
   * 通过章节ID渲染内容
   */
  async renderChapterById(
    chapterId: string,
    elementId?: string,
    options?: {
      showLoading?: boolean;
      className?: string;
      onError?: (error: Error) => void;
      onSuccess?: () => void;
    }
  ): Promise<void> {
    const chapters = this.getChapters();
    const chapterIndex = chapters.findIndex(chapter => chapter.id === chapterId);
    
    if (chapterIndex === -1) {
      throw new Error(`未找到章节: ${chapterId}`);
    }

    this.currentChapterIndex = chapterIndex;
    return this.renderChapter(chapterIndex, elementId, options);
  }

  /**
   * 通过章节href渲染内容
   */
  async renderChapterByHref(
    chapterHref: string,
    elementId?: string,
    options?: {
      showLoading?: boolean;
      className?: string;
      onError?: (error: Error) => void;
      onSuccess?: () => void;
    }
  ): Promise<void> {
    const chapters = this.getChapters();
    const chapterIndex = chapters.findIndex(chapter => chapter.href === chapterHref);
    
    if (chapterIndex === -1) {
      throw new Error(`未找到章节: ${chapterHref}`);
    }

    this.currentChapterIndex = chapterIndex;
    return this.renderChapter(chapterIndex, elementId, options);
  }

  /**
   * 加载上一章
   * @param options 渲染选项
   */
  async previousChapter(options?: {
    showLoading?: boolean;
    className?: string;
    onError?: (error: Error) => void;
    onSuccess?: () => void;
  }): Promise<void> {
    const chapters = this.getChapters();
    const newIndex = this.currentChapterIndex - 1;
    
    if (newIndex < 0) {
      throw new Error('已经是第一章了');
    }

    return this.renderChapter(newIndex, undefined, options);
  }

  /**
   * 加载下一章
   * @param options 渲染选项
   */
  async nextChapter(options?: {
    showLoading?: boolean;
    className?: string;
    onError?: (error: Error) => void;
    onSuccess?: () => void;
  }): Promise<void> {
    const chapters = this.getChapters();
    const newIndex = this.currentChapterIndex + 1;
    
    if (newIndex >= chapters.length) {
      throw new Error('已经是最后一章了');
    }

    return this.renderChapter(newIndex, undefined, options);
  }

  /**
   * 通过href加载章节内容（使用初始化时设置的目标元素）
   * @param chapterHref 章节href
   * @param options 渲染选项
   */
  async loadChapterByHref(
    chapterHref: string,
    options?: {
      showLoading?: boolean;
      className?: string;
      onError?: (error: Error) => void;
      onSuccess?: () => void;
    }
  ): Promise<void> {
    return this.renderChapterByHref(chapterHref, undefined, options);
  }

  /**
   * 通过章节ID加载章节内容（使用初始化时设置的目标元素）
   * @param chapterId 章节ID
   * @param options 渲染选项
   */
  async loadChapterById(
    chapterId: string,
    options?: {
      showLoading?: boolean;
      className?: string;
      onError?: (error: Error) => void;
      onSuccess?: () => void;
    }
  ): Promise<void> {
    return this.renderChapterById(chapterId, undefined, options);
  }

  /**
   * 通过索引加载章节内容（使用初始化时设置的目标元素）
   * @param chapterIndex 章节索引
   * @param options 渲染选项
   */
  async loadChapterByIndex(
    chapterIndex: number,
    options?: {
      showLoading?: boolean;
      className?: string;
      onError?: (error: Error) => void;
      onSuccess?: () => void;
    }
  ): Promise<void> {
    return this.renderChapter(chapterIndex, undefined, options);
  }

  /**
   * 清空目标元素
   */
  clearTarget(elementId: string): void {
    const targetElement = document.getElementById(elementId);
    if (targetElement) {
      targetElement.innerHTML = '';
    }
  }

  /**
   * 显示加载状态
   */
  private showLoadingState(element: HTMLElement): void {
    element.innerHTML = `
      <div class="epub-loading">
        <div class="epub-loading-spinner"></div>
        <div class="epub-loading-text">正在加载章节内容...</div>
      </div>
    `;
  }

  /**
   * 显示错误状态
   */
  private showErrorState(element: HTMLElement, error: Error): void {
    element.innerHTML = `
      <div class="epub-error">
        <div class="epub-error-icon">❌</div>
        <div class="epub-error-message">加载失败</div>
        <div class="epub-error-detail">${error.message}</div>
        <button class="epub-retry-btn" onclick="this.parentElement.innerHTML = ''">重试</button>
      </div>
    `;
  }

  /**
   * 渲染内容到元素
   */
  private renderContentToElement(element: HTMLElement, content: string, className: string): void {
    element.innerHTML = `<div class="${className}">${content}</div>`;
  }

  /**
   * 应用章节样式
   */
  private applyChapterStyles(elementId: string): void {
    const element = document.getElementById(elementId);
    if (!element) return;

    // 创建或更新样式
    let styleElement = document.getElementById('epub-chapter-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'epub-chapter-styles';
      styleElement.textContent = this.getChapterStyles();
      document.head.appendChild(styleElement);
    }
  }

  /**
   * 获取章节样式
   */
  private getChapterStyles(): string {
    return `
      #${this.targetElementId} .epub-chapter-content {
        line-height: 1.8;
        font-size: 16px;
        color: #333;
        max-width: 100%;
        word-wrap: break-word;
        padding: 20px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }

      #${this.targetElementId} .epub-chapter-content img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 1rem auto;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      #${this.targetElementId} .epub-chapter-content p {
        margin-bottom: 1rem;
        text-align: justify;
        text-indent: 2em;
      }

      #${this.targetElementId} .epub-chapter-content h1,
      #${this.targetElementId} .epub-chapter-content h2,
      #${this.targetElementId} .epub-chapter-content h3,
      #${this.targetElementId} .epub-chapter-content h4,
      #${this.targetElementId} .epub-chapter-content h5,
      #${this.targetElementId} .epub-chapter-content h6 {
        margin-top: 2rem;
        margin-bottom: 1rem;
        color: #222;
        font-weight: 600;
        line-height: 1.4;
      }

      #${this.targetElementId} .epub-chapter-content h1 { font-size: 2em; }
      #${this.targetElementId} .epub-chapter-content h2 { font-size: 1.8em; }
      #${this.targetElementId} .epub-chapter-content h3 { font-size: 1.6em; }
      #${this.targetElementId} .epub-chapter-content h4 { font-size: 1.4em; }
      #${this.targetElementId} .epub-chapter-content h5 { font-size: 1.2em; }
      #${this.targetElementId} .epub-chapter-content h6 { font-size: 1em; }

      #${this.targetElementId} .epub-chapter-content ul,
      #${this.targetElementId} .epub-chapter-content ol {
        margin: 1rem 0;
        padding-left: 2rem;
      }

      #${this.targetElementId} .epub-chapter-content li {
        margin-bottom: 0.5rem;
      }

      #${this.targetElementId} .epub-chapter-content blockquote {
        margin: 1.5rem 0;
        padding: 1rem 1.5rem;
        border-left: 4px solid #007bff;
        background: #f8f9fa;
        font-style: italic;
        color: #555;
      }

      #${this.targetElementId} .epub-chapter-content table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
      }

      #${this.targetElementId} .epub-chapter-content th,
      #${this.targetElementId} .epub-chapter-content td {
        border: 1px solid #ddd;
        padding: 0.75rem;
        text-align: left;
      }

      #${this.targetElementId} .epub-chapter-content th {
        background: #f8f9fa;
        font-weight: 600;
      }

      #${this.targetElementId} .epub-chapter-content a {
        color: #007bff;
        text-decoration: none;
        transition: color 0.2s;
      }

      #${this.targetElementId} .epub-chapter-content a:hover {
        color: #0056b3;
        text-decoration: underline;
      }

      #${this.targetElementId} .epub-chapter-content code {
        background: #f1f3f4;
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        font-size: 0.9em;
      }

      #${this.targetElementId} .epub-chapter-content pre {
        background: #f1f3f4;
        padding: 1rem;
        border-radius: 4px;
        overflow-x: auto;
        margin: 1rem 0;
      }

      .epub-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        color: #666;
      }

      .epub-loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #007bff;
        border-radius: 50%;
        animation: epub-spin 1s linear infinite;
        margin-bottom: 1rem;
      }

      .epub-loading-text {
        font-size: 16px;
      }

      @keyframes epub-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .epub-error {
        text-align: center;
        padding: 3rem;
        color: #dc3545;
      }

      .epub-error-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      .epub-error-message {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }

      .epub-error-detail {
        margin-bottom: 1.5rem;
        color: #666;
        font-size: 0.9rem;
      }

      .epub-retry-btn {
        background: #007bff;
        color: white;
        border: none;
        padding: 0.5rem 1.5rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
      }

      .epub-retry-btn:hover {
        background: #0056b3;
      }

      @media (max-width: 768px) {
        #${this.targetElementId} .epub-chapter-content {
          padding: 15px;
          font-size: 14px;
        }
        
        #${this.targetElementId} .epub-chapter-content p {
          text-indent: 1.5em;
        }
      }
    `;
  }

  /**
   * 设置章节交互
   */
  private setupChapterInteractions(elementId: string, chapterIndex: number): void {
    const element = document.getElementById(elementId);
    if (!element) return;

    // 为内部链接添加点击处理
    const links = element.querySelectorAll('a[href]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = href.substring(1);
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }
    });

    // 为图片添加点击放大功能
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      img.style.cursor = 'pointer';
      img.addEventListener('click', () => {
        this.showImageModal(img as HTMLImageElement);
      });
    });
  }

  /**
   * 显示图片模态框
   */
  private showImageModal(img: HTMLImageElement): void {
    // 创建模态框
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      cursor: pointer;
    `;

    // 创建图片
    const modalImg = document.createElement('img');
    modalImg.src = img.src;
    modalImg.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
      border-radius: 4px;
    `;

    // 点击关闭
    modal.appendChild(modalImg);
    modal.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    document.body.appendChild(modal);
  }

  /**
   * 获取当前渲染的章节内容
   */
  getCurrentChapterContent(): string {
    return this.currentChapterContent;
  }

  /**
   * 获取目标元素ID
   */
  getTargetElementId(): string {
    return this.targetElementId;
  }

  /**
   * 获取当前章节索引
   */
  getCurrentChapterIndex(): number {
    return this.currentChapterIndex;
  }

  /**
   * 设置当前章节索引
   */
  setCurrentChapterIndex(index: number): void {
    const chapters = this.getChapters();
    if (index >= 0 && index < chapters.length) {
      this.currentChapterIndex = index;
    }
  }

  /**
   * 检查是否有上一章
   */
  hasPreviousChapter(): boolean {
    return this.currentChapterIndex > 0;
  }

  /**
   * 检查是否有下一章
   */
  hasNextChapter(): boolean {
    const chapters = this.getChapters();
    return this.currentChapterIndex < chapters.length - 1;
  }

  /**
   * 获取当前章节信息
   */
  getCurrentChapter(): EpubChapter | null {
    const chapters = this.getChapters();
    if (this.currentChapterIndex >= 0 && this.currentChapterIndex < chapters.length) {
      return chapters[this.currentChapterIndex];
    }
    return null;
  }

  /**
   * 等待DOM元素存在
   * @param elementId 元素ID
   * @param timeout 超时时间（毫秒）
   */
  private async waitForElement(elementId: string, timeout: number = 2000): Promise<HTMLElement | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = document.getElementById(elementId);
      if (element) {
        return element;
      }
      
      // 每50ms检查一次
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return null;
  }
}