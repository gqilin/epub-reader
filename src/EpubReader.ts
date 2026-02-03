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
      console.log('🔍 检查XML解析器环境...');
      
      // 检查是否在浏览器环境
      const isBrowser = typeof window !== 'undefined';
      console.log('环境类型:', isBrowser ? '浏览器' : 'Node.js');

      if (isBrowser) {
        console.log('检测到浏览器环境，跳过xml2js（不兼容）');
        this.isXML2JSAvailable = false;
        return;
      }

      try {
        // 尝试动态导入xml2js（仅限Node.js环境）
        const xml2js = await import('xml2js');
        console.log('✅ xml2js库加载成功');
        this.isXML2JSAvailable = true;
      } catch (error) {
        console.warn('⚠️ xml2js库不可用:', error);
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
        console.warn('xml2js解析失败，尝试备用方案:', error);
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
      console.log('📄 使用浏览器原生DOM解析器');
      
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
        console.error('DOM解析器失败:', error);
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

  constructor(options: EpubReaderOptions = {}) {
    this.options = {
      encoding: 'utf8',
      loadCover: true,
      ...options,
    };
  }

  async load(epubData: ArrayBuffer | Uint8Array | Blob): Promise<void> {
    console.group('📚 EpubReader.load() 开始加载EPUB');
    
    try {
      // 启用JSZip调试模式
      JSZipWrapper.enableDebug(true);
      
      if (epubData instanceof Blob) {
        console.log('检测到Blob数据:', {
          size: epubData.size,
          type: epubData.type
        });
        epubData = await epubData.arrayBuffer();
        console.log('Blob转换为ArrayBuffer完成，大小:', epubData.byteLength);
      }

      // 确保我们有正确的Uint8Array格式用于JSZip
      let data: Uint8Array;
      if (epubData instanceof ArrayBuffer) {
        data = new Uint8Array(epubData);
        console.log('ArrayBuffer转换为Uint8Array，长度:', data.length);
      } else if (epubData instanceof Uint8Array) {
        data = epubData;
        console.log('直接使用Uint8Array，长度:', data.length);
      } else {
        const error = new Error(`EPUB数据类型无效: ${typeof epubData}`);
        console.error('数据类型错误:', typeof epubData, epubData);
        throw error;
      }

      // 检查数据完整性
      if (data.length === 0) {
        throw new Error('EPUB数据为空');
      }

      console.log('开始使用JSZip包装器加载...');
      
      // 使用JSZip包装器加载
      this.zip = await JSZipWrapper.loadAsync(data);
      
      console.log('JSZip加载成功，开始解析EPUB结构...');
      
      await this.parseEpub();
      
      console.log('EPUB解析完成');
      console.groupEnd();
    } catch (error) {
      console.error('EPUB加载过程中发生错误:', error);
      console.groupEnd();
      
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

    console.group('🗂️ 解析EPUB结构');
    
    try {
      // 解析container.xml
      console.log('📦 解析container.xml...');
      const containerXml = await this.getFileContent('META-INF/container.xml');
      console.log('container.xml内容:', containerXml.substring(0, 200));
      
      const container = await this.parseXml(containerXml);
      console.log('解析后的container结构:', container);
      
      console.log('🔍 检查解析结果结构:', Object.keys(container));
      console.log('📋 container对象详情:', container);
      
      // 安全地获取rootfile路径
      // DOMParser直接返回根元素作为对象，xml2js会包装一层
      const containerElement = container.container || container;
      
      if (!containerElement) {
        throw new Error('container.xml格式错误：缺少container元素');
      }
      
      console.log('📦 container元素:', containerElement);
      
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
      
      console.log('📄 rootfiles数组:', rootfilesArray);
      
      if (!rootfilesArray[0] || !rootfilesArray[0].$ || !rootfilesArray[0].$['full-path']) {
        throw new Error('container.xml格式错误：rootfile缺少full-path属性');
      }
      
      const rootfilePath = rootfilesArray[0].$['full-path'];
      console.log('📄 根文件路径:', rootfilePath);
      
      // 解析OPF文件
      console.log('📋 解析OPF文件:', rootfilePath);
      const opfContent = await this.getFileContent(rootfilePath);
      console.log('OPF内容前200字符:', opfContent.substring(0, 200));
      
      const opf = await this.parseXml(opfContent);
      console.log('解析后的OPF结构:', opf);

      this.info = await this.parseOpf(opf, rootfilePath);
      console.log('✅ EPUB结构解析完成');
      
    } catch (error) {
      console.error('❌ EPUB结构解析失败:', error);
      throw error;
    } finally {
      console.groupEnd();
    }
  }

  private async parseOpf(opf: any, rootfilePath: string): Promise<EpubInfo> {
    console.group('📚 解析OPF文件');
    console.log('OPF结构:', opf);
    console.log('OPF根键:', Object.keys(opf));
    
    // 兼容两种解析器的结构
    const packageElement = opf.package || opf;
    console.log('Package元素:', packageElement);
    console.log('Package根键:', Object.keys(packageElement || {}));
    
    if (!packageElement) {
      throw new Error('OPF文件格式错误：缺少package元素');
    }
    
    // 安全地获取各个元素
    const metadataElement = this.getMetadataElement(packageElement);
    const manifestElement = this.getManifestElement(packageElement);
    const spineElement = this.getSpineElement(packageElement);

    console.log('📋 元数据元素:', metadataElement);
    console.log('📦 清单元素:', manifestElement);
    console.log('📖 书脊元素:', spineElement);

    const metadata = this.parseMetadata(metadataElement);
    const manifest = this.parseManifest(manifestElement);
    const spine = this.parseSpine(spineElement);
    
    const toc = await this.parseTableOfContents(manifest, spine);
    const chapters = this.parseChapters(manifest, spine, rootfilePath);

    console.log('✅ OPF解析完成');
    console.groupEnd();

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
        console.log('✅ 找到元数据元素:', Object.keys(metadata));
        return metadata;
      }
    }
    
    console.warn('⚠️ 未找到元数据元素');
    return {};
  }

  private getManifestElement(packageElement: any): any {
    const manifest = packageElement.manifest?.[0] || packageElement.manifest;
    console.log('🔍 Manifest搜索结果:', manifest);
    return manifest || {};
  }

  private getSpineElement(packageElement: any): any {
    const spine = packageElement.spine?.[0] || packageElement.spine;
    console.log('🦴 Spine搜索结果:', spine);
    return spine || {};
  }

  private parseMetadata(metadataElement: any): EpubMetadata {
    console.group('📋 解析元数据');
    console.log('元数据元素:', metadataElement);
    
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
            const value = field._ || field;
            console.log(`✅ 找到${fieldName}:`, value);
            return value;
          }
        }
        
        console.log(`⚠️ 未找到${fieldName}`);
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
        console.log('✅ 找到封面:', metadata.cover);
      }
    }

    console.log('解析结果:', metadata);
    console.groupEnd();
    return metadata;
  }

  private parseManifest(manifestElement: any): EpubManifest[] {
    console.group('📦 解析清单');
    console.log('Manifest元素:', manifestElement);
    
    if (!manifestElement?.item) {
      console.warn('⚠️ 未找到item元素');
      console.groupEnd();
      return [];
    }

    const items = Array.isArray(manifestElement.item) 
      ? manifestElement.item 
      : [manifestElement.item];
    
    console.log('Items数组:', items);
    
    const manifest = items.map((item: any, index: number) => {
      const manifestItem = {
        id: item.$?.id || `item-${index}`,
        href: item.$?.href || '',
        mediaType: item.$?.['media-type'] || '',
      };
      console.log(`📄 Item ${index}:`, manifestItem);
      return manifestItem;
    });
    
    console.log('✅ 清单解析完成:', manifest);
    console.groupEnd();
    return manifest;
  }

  private parseSpine(spineElement: any): EpubSpine[] {
    console.group('🦴 解析书脊');
    console.log('Spine元素:', spineElement);
    
    if (!spineElement?.itemref) {
      console.warn('⚠️ 未找到itemref元素');
      console.groupEnd();
      return [];
    }

    const itemrefs = Array.isArray(spineElement.itemref) 
      ? spineElement.itemref 
      : [spineElement.itemref];
    
    console.log('Itemrefs数组:', itemrefs);
    
    const spine = itemrefs.map((itemref: any, index: number) => {
      const spineItem = {
        idref: itemref.$?.idref || `itemref-${index}`,
        linear: itemref.$?.linear || 'yes',
      };
      console.log(`📖 Itemref ${index}:`, spineItem);
      return spineItem;
    });
    
    console.log('✅ 书脊解析完成:', spine);
    console.groupEnd();
    return spine;
  }

  private async parseTableOfContents(
    manifest: EpubManifest[],
    spine: EpubSpine[]
  ): Promise<EpubTableOfContents[]> {
    const ncxItem = manifest.find(item => item.mediaType === 'application/x-dtbncx+xml');
    if (!ncxItem) return [];

    try {
      const ncxContent = await this.getFileContent(ncxItem.href);
      const ncx = await this.parseXml(ncxContent);
      const navMap = ncx.ncx?.navMap?.[0];

      if (navMap?.navPoint) {
        return this.parseNavPoints(navMap.navPoint, 0);
      }
    } catch (error) {
      console.warn('Failed to parse NCX table of contents:', error);
    }

    return [];
  }

  private parseNavPoints(navPoints: any[], startOrder: number): EpubTableOfContents[] {
    return navPoints.map((navPoint, index) => {
      const label = navPoint.navLabel?.[0]?.text?.[0];
      const src = navPoint.content?.[0]?.$?.src;
      
      const toc: EpubTableOfContents = {
        id: navPoint.$.id,
        href: src || '',
        title: label || '',
        order: startOrder + index,
      };

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
    console.group('📄 XML解析开始');
    console.log('XML长度:', xml.length);
    console.log('XML前100字符:', xml.substring(0, 100));
    
    try {
      const result = await XMLParser.parseString(xml);
      console.log('✅ XML解析成功');
      console.groupEnd();
      return result;
    } catch (error) {
      console.error('❌ XML解析失败:', error);
      console.log('原始XML内容:', xml.substring(0, 500));
      console.groupEnd();
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
      return content;
    } catch (error) {
      throw new Error(`Failed to load chapter content: ${chapterHref}`);
    }
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

    const metadata = this.getMetadata();
    if (!metadata?.cover) return null;

    const manifest = this.info?.manifest || [];
    const coverItem = manifest.find(item => item.id === metadata.cover);
    
    if (!coverItem || !coverItem.mediaType.startsWith('image/')) {
      return null;
    }

    try {
      const coverFile = this.zip.file(coverItem.href);
      if (!coverFile) return null;

      const coverData = await coverFile.async('base64');
      return `data:${coverItem.mediaType};base64,${coverData}`;
    } catch (error) {
      console.warn('Failed to load cover image:', error);
      return null;
    }
  }

  async getResource(href: string): Promise<string | null> {
    if (!this.zip) return null;

    try {
      const file = this.zip.file(href);
      if (!file) return null;

      const content = await file.async('base64');
      return content;
    } catch (error) {
      console.warn(`Failed to load resource: ${href}`, error);
      return null;
    }
  }
}