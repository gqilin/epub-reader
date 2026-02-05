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
  CFI,
  CFIPathComponent,
  CFIJumpOptions,
  CFICursorPosition,
  Annotation,
  AnnotationType,
  UnderlineConfig,
  AnnotationManager,
  AnnotationOptions,
  ReadingStyles,
  StyleUpdateCallback,
  StyleManager,
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

// CFI解析器类
class CFIParser {
  static parse(cfi: string): CFI {
    // 移除开头和结尾的epub()包装
    const cleanCFI = cfi.replace(/^epub\(|\)$/g, '');
    
    // 解析章节路径和本地路径
    const [globalPath, localPath] = cleanCFI.split('!');
    const [epubType, ...globalPathParts] = globalPath.split(',');
    
    // 解析路径组件
    const components: CFIPathComponent[] = [];
    
    // 解析全局路径（章节路径）
    if (globalPathParts.length > 0) {
      for (let i = 0; i < globalPathParts.length; i++) {
        const part = globalPathParts[i];
        if (part === '') continue;
        
        // 移除方括号内容（如 /2:4 的 :4）
        const cleanPart = part.replace(/\[.*?\]/g, '');
        
        // 解析索引和类型
        const index = parseInt(cleanPart);
        if (isNaN(index)) continue;
        
        // 确定路径组件类型
        let type: 'element' | 'text' | 'character' = 'element';
        
        // 如果路径中有偶数个斜杠，通常是文本节点
        if (part.includes('/')) {
          const pathDepth = part.split('/').length - 1;
          if (pathDepth % 2 === 1) {
            type = 'text';
          }
        }
        
        components.push({
          type,
          index,
          assertion: this.extractAssertion(part),
          parameter: this.extractParameter(part)
        });
      }
    }
    
    // 解析本地路径（章节内位置）
    const cleanLocalPath = localPath || '';
    
    // 解析scheme和term（如果存在）
    let scheme: string | undefined;
    let term: string | undefined;
    if (cleanLocalPath.includes('?')) {
      const [path, query] = cleanLocalPath.split('?');
      const pairs = query.split('&');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key === 'scheme') scheme = value;
        if (key === 'term') term = value;
      }
    }
    
    return {
      path: cfi,
      components,
      localPath: cleanLocalPath,
      scheme,
      term
    };
  }
  
  private static extractAssertion(part: string): string | undefined {
    const match = part.match(/\[(.*?)\]/);
    return match ? match[1] : undefined;
  }
  
  private static extractParameter(part: string): Record<string, string> {
    const params: Record<string, string> = {};
    const match = part.match(/\[s\^([^=]*?)\^(.*?)\]/);
    if (match) {
      params[match[1]] = match[2];
    }
    return params;
  }
  
  static generate(positions: Array<{
    type: 'element' | 'text' | 'character';
    index: number;
    assertion?: string;
  }>, localPath?: string): string {
    const pathParts = positions.map(pos => {
      let part = `${pos.index}`;
      if (pos.assertion) {
        part = `${part}[${pos.assertion}]`;
      }
      return part;
    });
    
    const globalPath = `/${pathParts.join('/')}`;
    const fullCFI = `epub(${globalPath}${localPath ? '!' + localPath : ''})`;
    
    return fullCFI;
  }
}

// CFI高亮管理器
class CFIHighlighter {
  private static highlights: Map<string, HTMLElement> = new Map();
  
  static highlight(targetElement: Element, cfi: string, duration: number = 2000): void {
    // 移除之前的高亮
    this.clearHighlights();
    
    // 创建高亮元素
    const highlight = document.createElement('div');
    highlight.style.cssText = `
      position: absolute;
      background: rgba(255, 235, 59, 0.3);
      border: 2px solid #fbbf24;
      border-radius: 2px;
      pointer-events: none;
      z-index: 1000;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
    `;
    
    // 获取元素位置
    const rect = targetElement.getBoundingClientRect();
    const containerRect = targetElement.parentElement?.getBoundingClientRect();
    
    if (containerRect) {
      highlight.style.top = `${rect.top - containerRect.top}px`;
      highlight.style.left = `${rect.left - containerRect.left}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
    }
    
    // 添加高亮到容器
    targetElement.parentElement?.appendChild(highlight);
    this.highlights.set(cfi, highlight);
    
    // 自动移除高亮
    setTimeout(() => {
      this.removeHighlight(cfi);
    }, duration);
  }
  
  static removeHighlight(cfi: string): void {
    const highlight = this.highlights.get(cfi);
    if (highlight && highlight.parentNode) {
      highlight.parentNode.removeChild(highlight);
      this.highlights.delete(cfi);
    }
  }
  
  static clearHighlights(): void {
    this.highlights.forEach(highlight => {
      if (highlight.parentNode) {
        highlight.parentNode.removeChild(highlight);
      }
    });
    this.highlights.clear();
  }
}

// SVG覆盖层管理器
class SVGOverlayManager {
  private svgElement: SVGElement | null = null;
  private containerElement: HTMLElement | null = null;
  private annotations: Map<string, SVGElement[]> = new Map();
  
  /**
   * 创建SVG覆盖层
   */
  createOverlay(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`容器元素不存在: ${containerId}`);
      return;
    }
    
    this.containerElement = container;
    
    // 检查是否已存在SVG覆盖层
    const existingSvg = container.querySelector('.epub-annotation-overlay');
    if (existingSvg) {
      console.log('SVG覆盖层已存在，清理后重建');
      existingSvg.remove();
    }
    
    // 创建SVG元素
    this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgElement.classList.add('epub-annotation-overlay');
    this.svgElement.setAttribute('style', `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      overflow: visible;
    `);
    
    // 设置容器为相对定位
    const containerStyle = window.getComputedStyle(container);
    if (containerStyle.position === 'static') {
      container.style.position = 'relative';
    }
    
    container.appendChild(this.svgElement);
    console.log(`SVG覆盖层创建成功: ${containerId}`);
  }
  
  /**
   * 渲染标记到SVG
   */
  renderAnnotation(annotation: Annotation): void {
    if (!this.svgElement || !this.containerElement) {
      console.warn('SVG覆盖层未初始化，无法渲染标记');
      return;
    }
    
    // 移除已存在的标记
    this.removeAnnotation(annotation.id);
    
    try {
      const range = this.getRangeFromCFI(annotation.cfi);
      if (!range) {
        console.warn(`无法从CFI获取Range: ${annotation.id}`, annotation.cfi);
        // 尝试备用渲染方法
        this.renderAnnotationFallback(annotation);
        return;
      }
      
      const rects = range.getClientRects();
      const containerRect = this.containerElement.getBoundingClientRect();
      const elements: SVGElement[] = [];
      
      if (rects.length === 0) {
        console.warn(`标记 ${annotation.id} 没有有效的ClientRect，尝试备用方法`);
        this.renderAnnotationFallback(annotation);
        return;
      }
      
      Array.from(rects).forEach(rect => {
        if (rect.width > 0 && rect.height > 0) {
          const element = this.createAnnotationElement(annotation, rect, containerRect);
          if (element) {
            elements.push(element);
            this.svgElement!.appendChild(element);
          }
        }
      });
      
      this.annotations.set(annotation.id, elements);
      console.log(`标记渲染成功: ${annotation.id} (${annotation.type})`);
      
    } catch (error) {
      console.error(`渲染标记失败: ${annotation.id}`, error);
    }
  }
  
  /**
   * 创建标记元素
   */
  private createAnnotationElement(annotation: Annotation, rect: DOMRect, containerRect: DOMRect): SVGElement | null {
    const x = rect.left - containerRect.left;
    const y = rect.top - containerRect.top;
    const width = rect.width;
    const height = rect.height;
    
    switch (annotation.type) {
      case 'highlight':
        return this.createHighlight(annotation, x, y, width, height);
      case 'underline':
        return this.createUnderline(annotation, x, y, width, height);
      case 'note':
        return this.createNoteMarker(annotation, x, y, width, height);
      case 'bookmark':
        return this.createBookmarkMarker(annotation, x, y, width, height);
      default:
        return null;
    }
  }
  
  /**
   * 创建高亮标记
   */
  private createHighlight(annotation: Annotation, x: number, y: number, width: number, height: number): SVGRectElement {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));
    rect.setAttribute('fill', annotation.color || '#ffeb3b');
    rect.setAttribute('fill-opacity', '0.3');
    rect.setAttribute('data-annotation-id', annotation.id);
    rect.setAttribute('data-annotation-type', annotation.type);
    rect.style.cursor = 'pointer';
    
    return rect;
  }
  
  /**
   * 创建下划线标记
   */
  private createUnderline(annotation: Annotation, x: number, y: number, width: number, height: number): SVGElement {
    const config = annotation.underlineConfig || { style: 'solid' };
    const color = annotation.color || config.color || '#2196f3';
    
    switch (config.style) {
      case 'solid':
        return this.createSolidUnderline(annotation, x, y, width, height, color, config.thickness);
      case 'dashed':
        return this.createDashedUnderline(annotation, x, y, width, height, color, config);
      case 'dotted':
        return this.createDottedUnderline(annotation, x, y, width, height, color, config);
      case 'wavy':
        return this.createWavyUnderline(annotation, x, y, width, height, color, config);
      case 'double':
        return this.createDoubleUnderline(annotation, x, y, width, height, color, config);
      case 'thick':
        return this.createThickUnderline(annotation, x, y, width, height, color, config);
      case 'custom':
        return this.createCustomUnderline(annotation, x, y, width, height, color, config);
      default:
        return this.createSolidUnderline(annotation, x, y, width, height, color, config.thickness);
    }
  }
  
  /**
   * 创建实线下划线
   */
  private createSolidUnderline(annotation: Annotation, x: number, y: number, width: number, height: number, color: string, thickness?: number): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x));
    line.setAttribute('y1', String(y + height));
    line.setAttribute('x2', String(x + width));
    line.setAttribute('y2', String(y + height));
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', String(thickness || 2));
    line.setAttribute('data-annotation-id', annotation.id);
    line.setAttribute('data-annotation-type', annotation.type);
    line.setAttribute('data-underline-style', 'solid');
    line.style.cursor = 'pointer';
    
    return line;
  }
  
  /**
   * 创建虚线下划线
   */
  private createDashedUnderline(annotation: Annotation, x: number, y: number, width: number, height: number, color: string, config: UnderlineConfig): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x));
    line.setAttribute('y1', String(y + height));
    line.setAttribute('x2', String(x + width));
    line.setAttribute('y2', String(y + height));
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', String(config.thickness || 2));
    line.setAttribute('stroke-dasharray', config.dashPattern || '8,4');
    line.setAttribute('data-annotation-id', annotation.id);
    line.setAttribute('data-annotation-type', annotation.type);
    line.setAttribute('data-underline-style', 'dashed');
    line.style.cursor = 'pointer';
    
    return line;
  }
  
  /**
   * 创建点线下划线
   */
  private createDottedUnderline(annotation: Annotation, x: number, y: number, width: number, height: number, color: string, config: UnderlineConfig): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x));
    line.setAttribute('y1', String(y + height));
    line.setAttribute('x2', String(x + width));
    line.setAttribute('y2', String(y + height));
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', String(config.thickness || 2));
    line.setAttribute('stroke-dasharray', '2,3');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('data-annotation-id', annotation.id);
    line.setAttribute('data-annotation-type', annotation.type);
    line.setAttribute('data-underline-style', 'dotted');
    line.style.cursor = 'pointer';
    
    return line;
  }
  
  /**
   * 创建波浪下划线
   */
  private createWavyUnderline(annotation: Annotation, x: number, y: number, width: number, height: number, color: string, config: UnderlineConfig): SVGPathElement {
    const amplitude = config.waveAmplitude || 3;
    const frequency = config.waveFrequency || 0.1;
    const thickness = config.thickness || 2;
    
    // 生成波浪路径
    let pathData = `M ${x} ${y + height}`;
    const steps = Math.ceil(width / 2); // 每2像素一个点
    
    for (let i = 0; i <= steps; i++) {
      const currentX = x + (width * i / steps);
      const waveY = (y + height) + Math.sin(i * frequency * Math.PI * 2) * amplitude;
      pathData += ` L ${currentX} ${waveY}`;
    }
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', String(thickness));
    path.setAttribute('fill', 'none');
    path.setAttribute('data-annotation-id', annotation.id);
    path.setAttribute('data-annotation-type', annotation.type);
    path.setAttribute('data-underline-style', 'wavy');
    path.style.cursor = 'pointer';
    
    return path;
  }
  
  /**
   * 创建双线下划线
   */
  private createDoubleUnderline(annotation: Annotation, x: number, y: number, width: number, height: number, color: string, config: UnderlineConfig): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const thickness = config.thickness || 2;
    const spacing = config.spacing || 3;
    
    // 第一条线
    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', String(x));
    line1.setAttribute('y1', String(y + height));
    line1.setAttribute('x2', String(x + width));
    line1.setAttribute('y2', String(y + height));
    line1.setAttribute('stroke', color);
    line1.setAttribute('stroke-width', String(thickness));
    
    // 第二条线
    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', String(x));
    line2.setAttribute('y1', String(y + height + spacing));
    line2.setAttribute('x2', String(x + width));
    line2.setAttribute('y2', String(y + height + spacing));
    line2.setAttribute('stroke', color);
    line2.setAttribute('stroke-width', String(thickness));
    
    group.appendChild(line1);
    group.appendChild(line2);
    group.setAttribute('data-annotation-id', annotation.id);
    group.setAttribute('data-annotation-type', annotation.type);
    group.setAttribute('data-underline-style', 'double');
    group.style.cursor = 'pointer';
    
    return group;
  }
  
  /**
   * 创建粗线下划线
   */
  private createThickUnderline(annotation: Annotation, x: number, y: number, width: number, height: number, color: string, config: UnderlineConfig): SVGRectElement {
    const thickness = config.thickness || 4;
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y + height));
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(thickness));
    rect.setAttribute('fill', color);
    rect.setAttribute('data-annotation-id', annotation.id);
    rect.setAttribute('data-annotation-type', annotation.type);
    rect.setAttribute('data-underline-style', 'thick');
    rect.style.cursor = 'pointer';
    
    return rect;
  }
  
  /**
   * 创建自定义下划线
   */
  private createCustomUnderline(annotation: Annotation, x: number, y: number, width: number, height: number, color: string, config: UnderlineConfig): SVGElement {
    // 默认创建波浪线作为自定义样式
    return this.createWavyUnderline(annotation, x, y, width, height, color, {
      ...config,
      waveAmplitude: config.waveAmplitude || 4,
      waveFrequency: config.waveFrequency || 0.15
    });
  }
  
  /**
   * 创建笔记标记
   */
  private createNoteMarker(annotation: Annotation, x: number, y: number, width: number, height: number): SVGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-annotation-id', annotation.id);
    group.setAttribute('data-annotation-type', annotation.type);
    
    // 背景
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', String(x));
    bg.setAttribute('y', String(y));
    bg.setAttribute('width', String(width));
    bg.setAttribute('height', String(height));
    bg.setAttribute('fill', '#4caf50');
    bg.setAttribute('fill-opacity', '0.2');
    
    // 图标
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(x + width / 2));
    text.setAttribute('y', String(y + height / 2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '12');
    text.setAttribute('fill', '#4caf50');
    text.textContent = '📝';
    
    group.appendChild(bg);
    group.appendChild(text);
    group.style.cursor = 'pointer';
    
    return group;
  }
  
  /**
   * 创建书签标记
   */
  private createBookmarkMarker(annotation: Annotation, x: number, y: number, width: number, height: number): SVGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-annotation-id', annotation.id);
    group.setAttribute('data-annotation-type', annotation.type);
    
    // 书签图标
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathData = `M ${x + width/2 - 6} ${y + 2} 
                     L ${x + width/2 + 6} ${y + 2} 
                     L ${x + width/2 + 6} ${y + height - 4} 
                     L ${x + width/2} ${y + height - 8} 
                     L ${x + width/2 - 6} ${y + height - 4} Z`;
    path.setAttribute('d', pathData);
    path.setAttribute('fill', '#ff9800');
    path.setAttribute('stroke', '#f57c00');
    path.setAttribute('stroke-width', '1');
    
    group.appendChild(path);
    group.style.cursor = 'pointer';
    
    return group;
  }
  
  /**
   * 移除指定标记
   */
  removeAnnotation(annotationId: string): void {
    const elements = this.annotations.get(annotationId);
    if (elements) {
      elements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      this.annotations.delete(annotationId);
    }
  }
  
  /**
   * 清除所有标记
   */
  clearAnnotations(): void {
    this.annotations.forEach(elements => {
      elements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    });
    this.annotations.clear();
  }
  
  /**
   * 从CFI获取Range
   */
  private getRangeFromCFI(cfi: CFI): Range | null {
    try {
      const container = this.containerElement;
      if (!container) return null;
      
      // 查找CFI对应的元素
      const elements = container.querySelectorAll('[data-cfi]');
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const elementCFI = element.getAttribute('data-cfi');
        if (elementCFI === cfi.path) {
          const range = document.createRange();
          range.selectNodeContents(element);
          return range;
        }
      }
      
      // 如果没有找到data-cfi属性，尝试通过文本内容匹配
      return this.findRangeByTextContent(cfi);
    } catch (error) {
      console.error('从CFI获取Range失败:', error);
      return null;
    }
  }
  
  /**
   * 通过文本内容查找Range
   */
  private findRangeByTextContent(cfi: CFI): Range | null {
    const container = this.containerElement;
    if (!container || !cfi.localPath) return null;
    
    // 从localPath提取文本内容用于匹配
    const textContent = cfi.localPath.replace(/[?!&=]/g, '');
    if (!textContent) return null;
    
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent || '';
      if (text.includes(textContent)) {
        const range = document.createRange();
        const startIndex = text.indexOf(textContent);
        range.setStart(node as Text, startIndex);
        range.setEnd(node as Text, startIndex + textContent.length);
        return range;
      }
    }
    
    return null;
  }
  
  /**
   * 获取指定位置的标记元素
   */
  getAnnotationAtPoint(x: number, y: number): string | null {
    if (!this.svgElement) return null;
    
    // 使用document的elementsFromPoint方法
    const elements = document.elementsFromPoint(x, y);
    
    for (const element of elements) {
      const annotationId = element.getAttribute('data-annotation-id');
      if (annotationId) {
        return annotationId;
      }
    }
    
    return null;
  }
  
  /**
   * 备用渲染方法（当CFI解析失败时使用）
   */
  private renderAnnotationFallback(annotation: Annotation): void {
    if (!this.svgElement || !this.containerElement) return;
    
    try {
      // 在容器顶部创建一个简单的指示标记
      const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      indicator.setAttribute('cx', '20');
      indicator.setAttribute('cy', '20');
      indicator.setAttribute('r', '8');
      indicator.setAttribute('fill', annotation.color || this.getDefaultColor(annotation.type));
      indicator.setAttribute('data-annotation-id', annotation.id);
      indicator.setAttribute('data-annotation-type', annotation.type);
      indicator.setAttribute('title', `${this.getAnnotationTypeName(annotation.type)}: ${annotation.text.substring(0, 50)}...`);
      
      this.svgElement.appendChild(indicator);
      
      // 保存到annotations映射
      this.annotations.set(annotation.id, [indicator]);
      
      console.log(`使用备用方法渲染标记: ${annotation.id}`);
      
    } catch (error) {
      console.error(`备用渲染方法也失败: ${annotation.id}`, error);
    }
  }
  
  /**
   * 获取默认颜色
   */
  private getDefaultColor(type: AnnotationType): string {
    const colors = {
      highlight: '#ffeb3b',
      underline: '#2196f3',
      note: '#4caf50',
      bookmark: '#ff9800'
    };
    return colors[type] || '#ffeb3b';
  }
  
  /**
   * 获取标记类型名称
   */
  private getAnnotationTypeName(type: AnnotationType): string {
    const names = {
      highlight: '高亮',
      underline: '下划线',
      note: '笔记',
      bookmark: '书签'
    };
    return names[type] || '未知';
  }

  /**
   * 更新标记样式
   */
  updateAnnotationStyle(annotationId: string, styles: { color?: string; opacity?: number }): void {
    const elements = this.annotations.get(annotationId);
    if (!elements) return;
    
    elements.forEach(element => {
      if (styles.color) {
        if (element.tagName === 'rect') {
          element.setAttribute('fill', styles.color);
        } else if (element.tagName === 'line') {
          element.setAttribute('stroke', styles.color);
        }
      }
      
      if (styles.opacity !== undefined) {
        if (element.tagName === 'rect') {
          element.setAttribute('fill-opacity', String(styles.opacity));
        } else if (element.tagName === 'line') {
          element.setAttribute('stroke-opacity', String(styles.opacity));
        }
      }
    });
  }
}

// 文字选择管理器
class TextSelectionManager {
  private toolbarElement: HTMLElement | null = null;
  private containerElement: HTMLElement | null = null;
  private currentSelection: Selection | null = null;
  private autoHideTimer: number | null = null;
  private selectionCallback: ((selection: Selection) => void) | null = null;
  
  /**
   * 设置选择监听器
   */
  setupSelectionListener(
    containerId: string, 
    toolbarId: string,
    onSelection?: (selection: Selection) => void
  ): void {
    const container = document.getElementById(containerId);
    const toolbar = document.getElementById(toolbarId);
    
    if (!container) {
      console.warn(`容器元素不存在: ${containerId}`);
      return;
    }
    
    this.containerElement = container;
    this.toolbarElement = toolbar;
    this.selectionCallback = onSelection || null;
    
    // 监听鼠标选择事件
    container.addEventListener('mouseup', this.handleMouseUp.bind(this));
    container.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // 监听选择变化事件
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    
    // 隐藏工具栏当点击其他地方时
    document.addEventListener('mousedown', this.handleDocumentMouseDown.bind(this));
  }
  
  /**
   * 处理鼠标松开事件
   */
  private handleMouseUp(event: MouseEvent): void {
    // 延迟执行以确保选择已经完成
    setTimeout(() => {
      this.handleTextSelection();
    }, 10);
  }
  
  /**
   * 处理触摸结束事件
   */
  private handleTouchEnd(event: TouchEvent): void {
    setTimeout(() => {
      this.handleTextSelection();
    }, 10);
  }
  
  /**
   * 处理选择变化事件
   */
  private handleSelectionChange(): void {
    // 只在容器内选择时处理
    if (this.isSelectionInContainer()) {
      this.handleTextSelection();
    }
  }
  
  /**
   * 处理文档点击事件
   */
  private handleDocumentMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // 如果点击的不是工具栏或容器，隐藏工具栏
    if (!this.isElementInToolbar(target) && !this.isElementInContainer(target)) {
      this.hideToolbar();
    }
  }
  
  /**
   * 处理文字选择
   */
  private handleTextSelection(): void {
    const selection = window.getSelection();
    
    if (!selection || selection.isCollapsed) {
      this.hideToolbar();
      return;
    }
    
    const selectedText = selection.toString().trim();
    
    // 如果选中的文字太短，隐藏工具栏
    if (selectedText.length < 1) {
      this.hideToolbar();
      return;
    }
    
    // 确保选择在容器内
    if (!this.isSelectionInContainer()) {
      this.hideToolbar();
      return;
    }
    
    this.currentSelection = selection;
    this.showToolbar(selection);
    
    // 触发选择回调
    if (this.selectionCallback) {
      this.selectionCallback(selection);
    }
  }
  
  /**
   * 检查选择是否在容器内
   */
  private isSelectionInContainer(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    const container = this.containerElement;
    
    if (!container) return false;
    
    // 检查选择范围是否与容器相交
    return container.contains(range.commonAncestorContainer) || 
           container.contains(range.startContainer) || 
           container.contains(range.endContainer);
  }
  
  /**
   * 检查元素是否在工具栏内
   */
  private isElementInToolbar(element: HTMLElement): boolean {
    if (!this.toolbarElement) return false;
    return this.toolbarElement.contains(element) || element === this.toolbarElement;
  }
  
  /**
   * 检查元素是否在容器内
   */
  private isElementInContainer(element: HTMLElement): boolean {
    if (!this.containerElement) return false;
    return this.containerElement.contains(element) || element === this.containerElement;
  }
  
  /**
   * 显示工具栏
   */
  private showToolbar(selection: Selection): void {
    if (!this.toolbarElement || !this.containerElement) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = this.containerElement.getBoundingClientRect();
    
    // 计算工具栏位置
    let toolbarLeft = rect.left + window.scrollX;
    let toolbarTop = rect.bottom + window.scrollY + 5;
    
    // 防止工具栏超出视窗
    const toolbarRect = this.toolbarElement.getBoundingClientRect();
    if (toolbarLeft + toolbarRect.width > window.innerWidth) {
      toolbarLeft = window.innerWidth - toolbarRect.width - 10;
    }
    
    if (toolbarTop + toolbarRect.height > window.innerHeight + window.scrollY) {
      // 如果下方空间不够，显示在选中文本上方
      toolbarTop = rect.top + window.scrollY - toolbarRect.height - 5;
    }
    
    // 设置工具栏位置和显示
    this.toolbarElement.style.position = 'fixed';
    this.toolbarElement.style.left = `${toolbarLeft}px`;
    this.toolbarElement.style.top = `${toolbarTop}px`;
    this.toolbarElement.style.display = 'flex';
    this.toolbarElement.style.zIndex = '10000';
    this.toolbarElement.style.opacity = '0';
    
    // 添加淡入动画
    setTimeout(() => {
      if (this.toolbarElement) {
        this.toolbarElement.style.transition = 'opacity 0.2s ease';
        this.toolbarElement.style.opacity = '1';
      }
    }, 10);
    
    // 设置自动隐藏
    this.setAutoHide();
  }
  
  /**
   * 隐藏工具栏
   */
  hideToolbar(): void {
    if (!this.toolbarElement) return;
    
    // 清除自动隐藏定时器
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
    
    // 添加淡出动画
    this.toolbarElement.style.transition = 'opacity 0.2s ease';
    this.toolbarElement.style.opacity = '0';
    
    setTimeout(() => {
      if (this.toolbarElement) {
        this.toolbarElement.style.display = 'none';
      }
    }, 200);
  }
  
  /**
   * 设置自动隐藏
   */
  private setAutoHide(): void {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
    }
    
    this.autoHideTimer = window.setTimeout(() => {
      this.hideToolbar();
    }, 3000); // 3秒后自动隐藏
  }
  
  /**
   * 获取当前选择
   */
  getCurrentSelection(): Selection | null {
    return this.currentSelection;
  }
  
  /**
   * 获取选中的文字
   */
  getSelectedText(): string {
    const selection = this.getCurrentSelection();
    return selection ? selection.toString().trim() : '';
  }
  
  /**
   * 清除选择
   */
  clearSelection(): void {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    this.currentSelection = null;
    this.hideToolbar();
  }
  
  /**
   * 获取选择的范围
   */
  getSelectedRange(): Range | null {
    const selection = this.getCurrentSelection();
    return selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  }
  
  /**
   * 检查是否有选中的内容
   */
  hasSelection(): boolean {
    const selection = window.getSelection();
    return selection ? !selection.isCollapsed && selection.toString().trim().length > 0 : false;
  }
  
  /**
   * 销毁选择管理器
   */
  destroy(): void {
    if (this.containerElement) {
      this.containerElement.removeEventListener('mouseup', this.handleMouseUp);
      this.containerElement.removeEventListener('touchend', this.handleTouchEnd);
    }
    
    document.removeEventListener('selectionchange', this.handleSelectionChange);
    document.removeEventListener('mousedown', this.handleDocumentMouseDown);
    
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
    }
    
    this.containerElement = null;
    this.toolbarElement = null;
    this.currentSelection = null;
    this.selectionCallback = null;
  }
}

// 标记存储管理器
class AnnotationStorage {
  private readonly STORAGE_KEY = 'epub-annotations';
  private readonly STORAGE_VERSION = '1.0';
  
  /**
   * 保存标记数据
   */
  saveAnnotations(annotations: Annotation[]): void {
    try {
      const data = {
        version: this.STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        annotations: annotations.map(ann => ({
          ...ann,
          createdAt: ann.createdAt.toISOString(),
          updatedAt: ann.updatedAt.toISOString()
        }))
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('保存标记失败:', error);
    }
  }
  
  /**
   * 加载标记数据
   */
  loadAnnotations(): Annotation[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      
      // 检查版本兼容性
      if (!parsed.version || !this.isVersionCompatible(parsed.version)) {
        console.warn('标记数据版本不兼容，将被忽略');
        return [];
      }
      
      if (!Array.isArray(parsed.annotations)) {
        console.warn('标记数据格式错误');
        return [];
      }
      
      return parsed.annotations.map((ann: any) => ({
        ...ann,
        createdAt: new Date(ann.createdAt),
        updatedAt: new Date(ann.updatedAt)
      }));
    } catch (error) {
      console.error('加载标记失败:', error);
      return [];
    }
  }
  
  /**
   * 检查版本兼容性
   */
  private isVersionCompatible(version: string): boolean {
    const currentParts = this.STORAGE_VERSION.split('.').map(Number);
    const storedParts = version.split('.').map(Number);
    
    // 主版本必须相同
    return currentParts[0] === storedParts[0];
  }
  
  /**
   * 导出标记数据
   */
  exportAnnotations(): string {
    const annotations = this.loadAnnotations();
    const exportData = {
      version: this.STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
      annotations: annotations.map(ann => ({
        ...ann,
        createdAt: ann.createdAt.toISOString(),
        updatedAt: ann.updatedAt.toISOString()
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * 导入标记数据
   */
  async importAnnotations(data: string, merge: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const importedData = JSON.parse(data);
        
        // 验证数据格式
        if (!this.validateImportData(importedData)) {
          reject(new Error('标记数据格式无效'));
          return;
        }
        
        // 转换日期格式
        const importedAnnotations = importedData.annotations.map((ann: any) => ({
          ...ann,
          createdAt: new Date(ann.createdAt),
          updatedAt: new Date(ann.updatedAt)
        }));
        
        let finalAnnotations: Annotation[];
        
        if (merge) {
          // 合并现有标记和导入标记
          const existingAnnotations = this.loadAnnotations();
          const existingIds = new Set(existingAnnotations.map(ann => ann.id));
          
          // 过滤掉重复ID的标记
          const newAnnotations = importedAnnotations.filter((ann: Annotation) => !existingIds.has(ann.id));
          finalAnnotations = [...existingAnnotations, ...newAnnotations];
        } else {
          // 完全替换
          finalAnnotations = importedAnnotations;
        }
        
        // 保存合并后的数据
        this.saveAnnotations(finalAnnotations);
        resolve();
      } catch (error) {
        reject(new Error(`导入标记失败: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }
  
  /**
   * 验证导入数据格式
   */
  private validateImportData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.annotations)) return false;
    
    // 验证每个标记的必需字段
    return data.annotations.every((ann: Annotation) => {
      return ann.id && 
             ann.type && 
             ann.cfi && 
             ann.text && 
             ann.chapterId &&
             ann.createdAt &&
             ann.updatedAt;
    });
  }
  
  /**
   * 清空所有标记
   */
  clearAnnotations(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('清空标记失败:', error);
    }
  }
  
  /**
   * 获取标记统计信息
   */
  getStorageStats(): { count: number; size: number; lastModified: string | null } {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        return { count: 0, size: 0, lastModified: null };
      }
      
      const parsed = JSON.parse(data);
      return {
        count: Array.isArray(parsed.annotations) ? parsed.annotations.length : 0,
        size: data.length,
        lastModified: parsed.timestamp || null
      };
    } catch (error) {
      console.error('获取存储统计失败:', error);
      return { count: 0, size: 0, lastModified: null };
    }
  }
}

// 标记管理器
class AnnotationManagerImpl implements AnnotationManager {
  private storage: AnnotationStorage;
  private annotations: Annotation[] = [];
  private eventListeners: Map<string, Set<Function>> = new Map();
  
  constructor() {
    this.storage = new AnnotationStorage();
    this.loadAnnotations();
  }
  
  /**
   * 创建标记
   */
  async createAnnotation(type: AnnotationType, text: string, cfi: CFI, options?: any): Promise<Annotation> {
    const annotation: Annotation = {
      id: this.generateId(),
      type,
      text,
      cfi,
      color: options?.color || this.getDefaultColor(type),
      note: options?.note,
      createdAt: new Date(),
      updatedAt: new Date(),
      chapterId: options?.chapterId || this.extractChapterId(cfi),
      pageNumber: options?.pageNumber
    };
    
    // 处理下划线样式配置
    if (type === 'underline') {
      annotation.underlineConfig = this.getDefaultUnderlineConfig(options?.underlineStyle);
    }
    
    this.annotations.push(annotation);
    this.saveAnnotations();
    
    // 触发创建事件
    this.emit('created', annotation);
    
    return annotation;
  }
  
  /**
   * 获取默认下划线配置
   */
  private getDefaultUnderlineConfig(style: string = 'solid'): UnderlineConfig {
    const configs: Record<string, UnderlineConfig> = {
      solid: { style: 'solid', thickness: 2 },
      dashed: { style: 'dashed', thickness: 2, dashPattern: '8,4' },
      dotted: { style: 'dotted', thickness: 2 },
      wavy: { style: 'wavy', thickness: 2, waveAmplitude: 3, waveFrequency: 0.1 },
      double: { style: 'double', thickness: 2, spacing: 3 },
      thick: { style: 'thick', thickness: 4 },
      custom: { style: 'custom', thickness: 2, waveAmplitude: 4, waveFrequency: 0.15 }
    };
    
    return configs[style] || configs.solid;
  }
  
  /**
   * 移除标记
   */
  async removeAnnotation(id: string): Promise<void> {
    const index = this.annotations.findIndex(ann => ann.id === id);
    if (index !== -1) {
      const removed = this.annotations.splice(index, 1)[0];
      this.saveAnnotations();
      
      // 触发移除事件
      this.emit('removed', id);
    }
  }
  
  /**
   * 更新标记
   */
  async updateAnnotation(id: string, updates: Partial<Annotation>): Promise<Annotation> {
    const annotation = this.annotations.find(ann => ann.id === id);
    if (!annotation) {
      throw new Error(`标记不存在: ${id}`);
    }
    
    // 更新字段
    Object.assign(annotation, updates, {
      updatedAt: new Date()
    });
    
    this.saveAnnotations();
    
    // 触发更新事件
    this.emit('updated', annotation);
    
    return annotation;
  }
  
  /**
   * 获取标记列表
   */
  getAnnotations(chapterId?: string): Annotation[] {
    if (!chapterId) {
      return [...this.annotations];
    }
    
    return this.annotations.filter(ann => ann.chapterId === chapterId);
  }
  
  /**
   * 获取单个标记
   */
  getAnnotation(id: string): Annotation | undefined {
    return this.annotations.find(ann => ann.id === id);
  }
  
  /**
   * 导出标记
   */
  exportAnnotations(): string {
    return this.storage.exportAnnotations();
  }
  
  /**
   * 导入标记
   */
  async importAnnotations(data: string, merge: boolean = false): Promise<void> {
    await this.storage.importAnnotations(data, merge);
    this.loadAnnotations();
    
    // 触发重新加载事件
    this.emit('reloaded', this.annotations);
  }
  
  /**
   * 监听事件
   */
  on(event: 'created' | 'removed' | 'updated' | 'reloaded', callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }
  
  /**
   * 移除事件监听
   */
  off(event: 'created' | 'removed' | 'updated' | 'reloaded', callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }
  
  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件监听器错误 (${event}):`, error);
        }
      });
    }
  }
  
  /**
   * 加载标记
   */
  private loadAnnotations(): void {
    this.annotations = this.storage.loadAnnotations();
  }
  
  /**
   * 保存标记
   */
  private saveAnnotations(): void {
    this.storage.saveAnnotations(this.annotations);
  }
  
  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 获取默认颜色
   */
  private getDefaultColor(type: AnnotationType): string {
    const colors = {
      highlight: '#ffeb3b',
      underline: '#2196f3',
      note: '#4caf50',
      bookmark: '#ff9800'
    };
    return colors[type] || '#ffeb3b';
  }
  
  /**
   * 从CFI提取章节ID
   */
  private extractChapterId(cfi: CFI): string {
    // 如果CFI有章节信息，直接使用
    if (cfi.chapterId) {
      return cfi.chapterId;
    }
    
    // 否则从路径生成一个唯一标识
    return cfi.path.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_');
  }
}

// 阅读样式管理器
class ReadingStyleManager implements StyleManager {
  private readonly STORAGE_KEY = 'epub-reading-styles';
  private readonly STORAGE_VERSION = '1.0';
  private styles: ReadingStyles;
  private eventListeners: Set<StyleUpdateCallback> = new Set();
  private containerElementId: string = '';
  
  constructor(containerElementId: string = 'epub-chapter-container') {
    this.containerElementId = containerElementId;
    this.styles = this.loadStyles();
    this.applyStyles();
  }
  
  /**
   * 设置单个样式属性
   */
  async setStyle(key: keyof ReadingStyles, value: string): Promise<ReadingStyles> {
    if (!value || value.trim() === '') {
      throw new Error(`样式值不能为空: ${key}`);
    }
    
    // 验证样式值
    this.validateStyleValue(key, value);
    
    // 更新样式
    (this.styles as any)[key] = value;
    
    // 保存样式
    this.saveStyles();
    
    // 应用样式
    this.applyStyles();
    
    // 触发更新事件
    this.emitUpdate();
    
    return { ...this.styles };
  }
  
  /**
   * 获取当前所有样式
   */
  getStyles(): ReadingStyles {
    return { ...this.styles };
  }
  
  /**
   * 批量设置样式
   */
  async setStyles(styles: Partial<ReadingStyles>): Promise<ReadingStyles> {
    // 验证所有样式值
    for (const [key, value] of Object.entries(styles)) {
      if (value && value.trim() !== '') {
        this.validateStyleValue(key as keyof ReadingStyles, value);
        (this.styles as any)[key] = value;
      }
    }
    
    // 保存样式
    this.saveStyles();
    
    // 应用样式
    this.applyStyles();
    
    // 触发更新事件
    this.emitUpdate();
    
    return { ...this.styles };
  }
  
  /**
   * 重置所有样式为默认值
   */
  async resetStyles(): Promise<ReadingStyles> {
    this.styles = this.getDefaultStyles();
    
    // 保存默认样式
    this.saveStyles();
    
    // 应用样式
    this.applyStyles();
    
    // 触发更新事件
    this.emitUpdate();
    
    return { ...this.styles };
  }
  
  /**
   * 监听样式更新事件
   */
  onStyleUpdate(callback: StyleUpdateCallback): void {
    this.eventListeners.add(callback);
  }
  
  /**
   * 移除样式更新事件监听
   */
  offStyleUpdate(callback: StyleUpdateCallback): void {
    this.eventListeners.delete(callback);
  }
  
  /**
   * 验证样式值的有效性
   */
  private validateStyleValue(key: keyof ReadingStyles, value: string): void {
    switch (key) {
      case 'fontSize':
        // 验证字号格式
        if (!/^\d+(px|em|rem|%|pt|vw|vh)$/.test(value) && !/^\d+(\.\d+)?(px|em|rem|%|pt|vw|vh)$/.test(value)) {
          throw new Error('字号格式无效，请使用如: 16px, 1.2em, 120%');
        }
        break;
        
      case 'lineHeight':
        // 验证行高格式
        if (!/^\d+(\.\d+)?$/.test(value) && !/^\d+%$/.test(value)) {
          throw new Error('行高格式无效，请使用如: 1.6, 160%');
        }
        break;
        
      case 'paragraphSpacing':
      case 'letterSpacing':
      case 'wordSpacing':
      case 'textIndent':
        // 验证间距格式
        if (!/^\d+(px|em|rem|pt|vw|vh)$/.test(value)) {
          throw new Error(`间距格式无效，请使用如: 1em, 16px, 1rem`);
        }
        break;
        
      case 'maxWidth':
        // 验证最大宽度格式
        if (!/^\d+(px|em|rem|pt|%|vw|vh)$/.test(value) && value !== 'none') {
          throw new Error('最大宽度格式无效，请使用如: 800px, 90%, none');
        }
        break;
        
      case 'margin':
      case 'padding':
        // 验证边距格式
        if (!/^\d+(px|em|rem|%|pt|vw|vh)(\s+\d+(px|em|rem|%|pt|vw|vh))*$/.test(value) && value !== 'auto') {
          throw new Error('边距格式无效，请使用如: 0 auto, 20px, 1em 2em');
        }
        break;
        
      case 'fontFamily':
        // 字体名称验证
        if (value.length === 0) {
          throw new Error('字体名称不能为空');
        }
        break;
        
      case 'color':
      case 'backgroundColor':
        // 颜色格式验证
        if (!/^#[0-9A-Fa-f]{6}$/.test(value) && 
            !/^#[0-9A-Fa-f]{3}$/.test(value) && 
            !/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(value) &&
            !/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/.test(value)) {
          throw new Error('颜色格式无效，请使用如: #333333, rgb(51, 51, 51)');
        }
        break;
        
      case 'textAlign':
        // 文本对齐验证
        if (!['left', 'center', 'right', 'justify'].includes(value)) {
          throw new Error('文本对齐方式无效，请使用: left, center, right, justify');
        }
        break;
        
      case 'fontWeight':
        // 字体粗细验证
        if (!['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'].includes(value)) {
          throw new Error('字体粗细无效，请使用: normal, bold, 100-900');
        }
        break;
    }
  }
  
  /**
   * 获取默认样式
   */
  private getDefaultStyles(): ReadingStyles {
    return {
      fontFamily: '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Source Han Sans CN", "WenQuanYi Micro Hei", sans-serif',
      fontSize: '16px',
      color: '#333333',
      lineHeight: '1.6',
      paragraphSpacing: '1em',
      backgroundColor: '#ffffff',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      textAlign: 'left' as const,
      fontWeight: 'normal' as const,
      letterSpacing: 'normal',
      wordSpacing: 'normal',
      textIndent: '2em'
    };
  }
  
  /**
   * 加载保存的样式
   */
  private loadStyles(): ReadingStyles {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        return this.getDefaultStyles();
      }
      
      const parsed = JSON.parse(data);
      
      // 检查版本兼容性
      if (!parsed.version || !this.isVersionCompatible(parsed.version)) {
        console.warn('样式数据版本不兼容，使用默认样式');
        return this.getDefaultStyles();
      }
      
      return { ...this.getDefaultStyles(), ...parsed.styles };
    } catch (error) {
      console.error('加载样式失败:', error);
      return this.getDefaultStyles();
    }
  }
  
  /**
   * 保存样式到本地存储
   */
  private saveStyles(): void {
    try {
      const data = {
        version: this.STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        styles: this.styles
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('保存样式失败:', error);
    }
  }
  
  /**
   * 应用样式到DOM
   */
  private applyStyles(): void {
    const container = document.getElementById(this.containerElementId);
    if (!container) {
      console.warn(`样式容器不存在: ${this.containerElementId}`);
      return;
    }
    
    // 移除旧的样式元素
    const oldStyleElement = document.getElementById('epub-reading-styles');
    if (oldStyleElement) {
      oldStyleElement.remove();
    }
    
    // 创建新的样式元素
    const styleElement = document.createElement('style');
    styleElement.id = 'epub-reading-styles';
    styleElement.type = 'text/css';
    
    // 生成CSS规则
    let cssRules = `
/* EPUB阅读样式 */
#${this.containerElementId} {
  font-family: ${this.styles.fontFamily || 'inherit'};
  font-size: ${this.styles.fontSize || '16px'};
  color: ${this.styles.color || '#333333'};
  line-height: ${this.styles.lineHeight || '1.6'};
  background-color: ${this.styles.backgroundColor || '#ffffff'};
  max-width: ${this.styles.maxWidth || 'none'};
  margin: ${this.styles.margin || '0'};
  padding: ${this.styles.padding || '20px'};
  text-align: ${this.styles.textAlign || 'left'};
  font-weight: ${this.styles.fontWeight || 'normal'};
  letter-spacing: ${this.styles.letterSpacing || 'normal'};
  word-spacing: ${this.styles.wordSpacing || 'normal'};
}
`;
    
    // 段落间距样式
    if (this.styles.paragraphSpacing) {
      cssRules += `
#${this.containerElementId} p {
  margin-bottom: ${this.styles.paragraphSpacing};
  text-indent: ${this.styles.textIndent || '2em'};
}
`;
    }
    
    // 其他元素的样式调整
    cssRules += `
#${this.containerElementId} h1,
#${this.containerElementId} h2,
#${this.containerElementId} h3,
#${this.containerElementId} h4,
#${this.containerElementId} h5,
#${this.containerElementId} h6 {
  margin-top: 1.5em;
  margin-bottom: 1em;
  text-indent: 0;
  font-weight: bold;
}

#${this.containerElementId} h1 { font-size: 1.8em; }
#${this.containerElementId} h2 { font-size: 1.6em; }
#${this.containerElementId} h3 { font-size: 1.4em; }
#${this.containerElementId} h4 { font-size: 1.2em; }
#${this.containerElementId} h5 { font-size: 1.1em; }
#${this.containerElementId} h6 { font-size: 1em; }

#${this.containerElementId} ul,
#${this.containerElementId} ol {
  margin-bottom: 1em;
  padding-left: 2em;
}

#${this.containerElementId} li {
  margin-bottom: 0.5em;
}

#${this.containerElementId} blockquote {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 3px solid #ddd;
  background-color: #f9f9f9;
  font-style: italic;
}

#${this.containerElementId} img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}
`;
    
    styleElement.textContent = cssRules;
    
    // 添加到文档头部
    document.head.appendChild(styleElement);
    
    console.log('✅ 阅读样式已应用:', this.styles);
  }
  
  /**
   * 检查版本兼容性
   */
  private isVersionCompatible(version: string): boolean {
    const currentParts = this.STORAGE_VERSION.split('.').map(Number);
    const storedParts = version.split('.').map(Number);
    
    // 主版本必须相同
    return currentParts[0] === storedParts[0];
  }
  
  /**
   * 触发样式更新事件
   */
  private emitUpdate(): void {
    this.eventListeners.forEach(callback => {
      try {
        callback({ ...this.styles });
      } catch (error) {
        console.error('样式更新回调执行失败:', error);
      }
    });
  }
  
  /**
   * 清理样式
   */
  destroy(): void {
    // 移除样式元素
    const styleElement = document.getElementById('epub-reading-styles');
    if (styleElement) {
      styleElement.remove();
    }
    
    // 清理事件监听器
    this.eventListeners.clear();
  }
}

export class EpubReader {
  private zip: JSZip | null = null;
  private info: EpubInfo | null = null;
  private options: EpubReaderOptions;
  private currentChapterContent: string = '';
  private targetElementId: string = '';
  private currentChapterIndex: number = 0;
  
  // 标记功能相关属性
  private annotationManager: AnnotationManagerImpl;
  private svgOverlay: SVGOverlayManager;
  private selectionManager: TextSelectionManager;
  private annotationOptions: AnnotationOptions | null = null;
  
  // 样式管理器
  private styleManager: ReadingStyleManager | null = null;

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
    
    // 初始化标记功能组件
    this.annotationManager = new AnnotationManagerImpl();
    this.svgOverlay = new SVGOverlayManager();
    this.selectionManager = new TextSelectionManager();
    this.annotationOptions = null;
    
    // 初始化样式管理器
    this.styleManager = new ReadingStyleManager(options.targetElementId || 'epub-chapter-container');
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
      renderAnnotations?: boolean; // 新增：是否渲染标记
    } = {}
  ): Promise<void> {
    const {
      showLoading = true,
      className = 'epub-chapter-content',
      onError,
      onSuccess,
      renderAnnotations = true // 默认渲染标记
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

      // 渲染当前章节的标记
      if (renderAnnotations && this.annotationOptions) {
        this.renderAnnotationsWithDelay(targetId, 3); // 尝试3次，确保DOM完全加载
      }

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
      renderAnnotations?: boolean;
    }
  ): Promise<void> {
    const chapters = this.getChapters();
    const chapterIndex = chapters.findIndex(chapter => chapter.id === chapterId);
    
    if (chapterIndex === -1) {
      throw new Error(`未找到章节: ${chapterId}`);
    }

    this.currentChapterIndex = chapterIndex;
    return this.renderChapter(chapterIndex, elementId, {
      ...options,
      renderAnnotations: options?.renderAnnotations !== false // 默认为true
    });
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
      renderAnnotations?: boolean;
    }
  ): Promise<void> {
    const chapters = this.getChapters();
    const chapterIndex = chapters.findIndex(chapter => chapter.href === chapterHref);
    
    if (chapterIndex === -1) {
      throw new Error(`未找到章节: ${chapterHref}`);
    }

    this.currentChapterIndex = chapterIndex;
    return this.renderChapter(chapterIndex, elementId, {
      ...options,
      renderAnnotations: options?.renderAnnotations !== false // 默认为true
    });
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
    renderAnnotations?: boolean;
  }): Promise<void> {
    const chapters = this.getChapters();
    const newIndex = this.currentChapterIndex - 1;
    
    if (newIndex < 0) {
      throw new Error('已经是第一章了');
    }

    return this.renderChapter(newIndex, undefined, {
      ...options,
      renderAnnotations: options?.renderAnnotations !== false // 默认为true
    });
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
    renderAnnotations?: boolean;
  }): Promise<void> {
    const chapters = this.getChapters();
    const newIndex = this.currentChapterIndex + 1;
    
    if (newIndex >= chapters.length) {
      throw new Error('已经是最后一章了');
    }

    return this.renderChapter(newIndex, undefined, {
      ...options,
      renderAnnotations: options?.renderAnnotations !== false // 默认为true
    });
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

  // ===== CFI 相关方法 =====

  /**
   * 通过CFI跳转到指定位置
   * @param cfi CFI字符串
   * @param options 跳转选项
   */
  async jumpToCFI(
    cfi: string, 
    options: CFIJumpOptions = {}
  ): Promise<void> {
    const {
      showLoading = true,
      className = 'epub-chapter-content',
      onError,
      onSuccess,
      scrollBehavior = 'smooth',
      highlightTarget = true,
      highlightDuration = 3000
    } = options;

    try {
      // 解析CFI
      const parsedCFI = CFIParser.parse(cfi);
      console.log('解析CFI:', parsedCFI);

      // 确定目标章节
      const targetChapter = this.resolveChapterFromCFI(parsedCFI);
      
      // 如果需要切换章节
      if (targetChapter.index !== this.currentChapterIndex) {
        await this.renderChapter(targetChapter.index, undefined, {
          showLoading,
          className,
          onError,
          onSuccess: () => {
            // 章节加载完成后，跳转到CFI位置
            this.jumpToCFIInCurrentChapter(cfi, {
              scrollBehavior,
              highlightTarget,
              highlightDuration
            });
            onSuccess?.();
          }
        });
      } else {
        // 同章节内跳转
        await this.jumpToCFIInCurrentChapter(cfi, {
          scrollBehavior,
          highlightTarget,
          highlightDuration
        });
        onSuccess?.();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error : new Error(String(error));
      onError?.(errorMsg);
      throw errorMsg;
    }
  }

  /**
   * 在当前章节内跳转到CFI位置
   */
  private async jumpToCFIInCurrentChapter(
    cfi: string, 
    options: {
      scrollBehavior?: ScrollBehavior;
      highlightTarget?: boolean;
      highlightDuration?: number;
    }
  ): Promise<void> {
    const targetElement = document.getElementById(this.targetElementId);
    if (!targetElement) {
      throw new Error('目标DOM元素不存在');
    }

    try {
      // 解析CFI并找到目标元素
      const parsedCFI = CFIParser.parse(cfi);
      const targetDOMElement = this.findElementByCFI(parsedCFI, targetElement);
      
      if (targetDOMElement) {
        // 高亮目标
        if (options.highlightTarget) {
          CFIHighlighter.highlight(targetDOMElement, cfi, options.highlightDuration);
        }
        
        // 滚动到目标位置
        const behavior = options.scrollBehavior || 'smooth';
        targetDOMElement.scrollIntoView(behavior === 'smooth');
        
        console.log('成功跳转到CFI位置:', cfi);
      } else {
        throw new Error('无法找到CFI对应的DOM元素');
      }
    } catch (error) {
      throw new Error(`CFI跳转失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 根据CFI解析目标章节
   */
  private resolveChapterFromCFI(parsedCFI: CFI): { index: number; href: string } {
    const chapters = this.getChapters();
    
    // 如果CFI包含章节信息
    if (parsedCFI.chapterHref) {
      const chapterIndex = chapters.findIndex(ch => ch.href === parsedCFI.chapterHref);
      if (chapterIndex !== -1) {
        return { index: chapterIndex, href: parsedCFI.chapterHref };
      }
    }
    
    if (parsedCFI.chapterId) {
      const chapterIndex = chapters.findIndex(ch => ch.id === parsedCFI.chapterId);
      if (chapterIndex !== -1) {
        return { index: chapterIndex, href: chapters[chapterIndex].href };
      }
    }
    
    // 根据路径组件解析章节索引
    // 通常第一个路径组件是章节索引
    if (parsedCFI.components.length > 0) {
      const firstComponent = parsedCFI.components[0];
      if (firstComponent.index < chapters.length) {
        return { 
          index: firstComponent.index, 
          href: chapters[firstComponent.index].href 
        };
      }
    }
    
    // 默认返回当前章节
    return { 
      index: this.currentChapterIndex, 
      href: chapters[this.currentChapterIndex]?.href || '' 
    };
  }

  /**
   * 根据CFI找到对应的DOM元素
   */
  private findElementByCFI(parsedCFI: CFI, container: Element): Element | null {
    try {
      let currentElement = container;
      
      // 遍历路径组件
      for (let i = 1; i < parsedCFI.components.length; i++) {
        const component = parsedCFI.components[i];
        
        if (component.type === 'element') {
          // 找到子元素
          const children = Array.from(currentElement.children);
          if (component.index < children.length) {
            currentElement = children[component.index];
          } else {
            return null;
          }
        } else if (component.type === 'text') {
          // 找到文本节点
          const walker = document.createTreeWalker(
            currentElement,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let textIndex = 0;
          let textNode: Text | null = null;
          
          while (textNode = walker.nextNode() as Text) {
            if (textIndex === component.index) {
              return textNode.parentElement || currentElement;
            }
            textIndex++;
          }
        }
      }
      
      // 处理本地路径（如果有）
      if (parsedCFI.localPath) {
        return this.findElementByLocalPath(parsedCFI.localPath, currentElement);
      }
      
      return currentElement;
    } catch (error) {
      console.error('根据CFI查找DOM元素失败:', error);
      return null;
    }
  }

  /**
   * 根据本地路径查找元素
   */
  private findElementByLocalPath(localPath: string, container: Element): Element | null {
    try {
      // 移除查询参数
      const cleanPath = localPath.split('?')[0];
      
      // 尝试作为ID选择器
      if (cleanPath.startsWith('#')) {
        const element = container.querySelector(cleanPath);
        return element as Element;
      }
      
      // 尝试作为XPath
      if (cleanPath.startsWith('/') || cleanPath.startsWith('(')) {
        const result = document.evaluate(
          cleanPath,
          container,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        return result.singleNodeValue as Element;
      }
      
      // 尝试作为CSS选择器
      const element = container.querySelector(cleanPath);
      return element as Element;
    } catch (error) {
      console.error('解析本地路径失败:', error);
      return null;
    }
  }

  /**
   * 生成当前光标位置的CFI
   * @param selection 可选的选区对象
   */
  generateCFI(selection?: Selection): CFI | null {
    try {
      const container = document.getElementById(this.targetElementId);
      if (!container) {
        throw new Error('目标容器不存在');
      }

      // 如果提供了选区，使用选区
      const target = selection ? 
        (selection.rangeCount > 0 ? selection.getRangeAt(0).startContainer : null) : 
        null;

      // 获取当前焦点元素
      const targetElement = target ? 
        (target.nodeType === Node.TEXT_NODE ? target.parentElement : target as Element) :
        document.activeElement as Element;

      if (!targetElement || !container.contains(targetElement)) {
        throw new Error('无法确定CFI目标位置');
      }

      // 构建路径组件
      const pathComponents: CFIPathComponent[] = [];
      let currentElement: Element | null = targetElement;
      
      // 添加章节路径组件（当前章节索引）
      pathComponents.push({
        type: 'element',
        index: this.currentChapterIndex
      });

      // 计算元素路径
      while (currentElement && currentElement !== container) {
        const parentEl: Element | null = currentElement.parentElement;
        if (!parentEl) break;

        const siblings = Array.from(parentEl.children);
        const index = siblings.indexOf(currentElement);

        pathComponents.push({
          type: 'element',
          index: index
        });

        currentElement = parentEl;
      }

      // 反转路径（从根到目标）
      pathComponents.reverse();

      // 生成本地路径
      let localPath = '';
      if (target && target.nodeType === Node.TEXT_NODE) {
        const textElement = target.parentElement;
        if (textElement) {
          const id = textElement.id;
          if (id) {
            localPath = `#${id}`;
          }
        }
      }

      return {
        path: CFIParser.generate(pathComponents, localPath),
        components: pathComponents,
        localPath,
        chapterHref: this.getCurrentChapter()?.href,
        chapterId: this.getCurrentChapter()?.id
      };
    } catch (error) {
      console.error('生成CFI失败:', error);
      return null;
    }
  }

  /**
   * 获取指定元素的CFI
   * @param element 目标元素
   * @param includeChapter 是否包含章节信息
   */
  getElementCFI(element: Element, includeChapter: boolean = true): CFI | null {
    try {
      const container = document.getElementById(this.targetElementId);
      if (!container) {
        throw new Error('目标容器不存在');
      }

      if (!container.contains(element)) {
        throw new Error('目标元素不在容器内');
      }

      // 构建路径组件
      const pathComponents: CFIPathComponent[] = [];
      let currentElement: Element | null = element;
      
      // 添加章节路径
      if (includeChapter) {
        pathComponents.push({
          type: 'element',
          index: this.currentChapterIndex
        });
      }

      // 计算元素路径
      while (currentElement && currentElement !== container) {
        const parentEl: Element | null = currentElement.parentElement;
        if (!parentEl) break;

        const siblings = Array.from(parentEl.children);
        const index = siblings.indexOf(currentElement);

        pathComponents.push({
          type: 'element',
          index: index
        });

        currentElement = parentEl;
      }

      // 反转路径
      pathComponents.reverse();

      // 生成本地路径
      let localPath = '';
      if (element.id) {
        localPath = `#${element.id}`;
      }

      return {
        path: CFIParser.generate(pathComponents, localPath),
        components: pathComponents,
        localPath,
        chapterHref: includeChapter ? this.getCurrentChapter()?.href : undefined,
        chapterId: includeChapter ? this.getCurrentChapter()?.id : undefined
      };
    } catch (error) {
      console.error('获取元素CFI失败:', error);
      return null;
    }
  }

  /**
   * 获取当前光标位置的详细信息
   */
  getCurrentCFICursor(): CFICursorPosition | null {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return null;
      }

      const range = selection.getRangeAt(0);
      const cfi = this.generateCFI(selection);

      if (!cfi) {
        return null;
      }

      // 获取文本上下文
      const textNode = range.startContainer as Text;
      const offset = range.startOffset;
      const fullText = textNode.textContent || '';
      
      const textBefore = fullText.substring(0, offset);
      const textAfter = fullText.substring(offset);

      return {
        cfi,
        textBefore: textBefore.slice(-50), // 前50个字符
        textAfter: textAfter.slice(0, 50),  // 后50个字符
        textNode,
        offset
      };
    } catch (error) {
      console.error('获取当前CFI光标失败:', error);
      return null;
    }
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

  // ==================== 标记功能 ====================

  /**
   * 设置标记功能
   */
  setupAnnotations(options: AnnotationOptions): void {
    this.annotationOptions = options;
    
    // 创建SVG覆盖层
    this.svgOverlay.createOverlay(options.containerId);
    
    // 设置选择监听
    this.selectionManager.setupSelectionListener(
      options.containerId, 
      options.toolbarId,
      (selection: Selection) => {
        // 可以在这里添加选择变化的回调逻辑
      }
    );
    
    // 监听标记事件
    if (options.onAnnotationCreated) {
      this.annotationManager.on('created', options.onAnnotationCreated);
    }
    if (options.onAnnotationRemoved) {
      this.annotationManager.on('removed', options.onAnnotationRemoved);
    }
    if (options.onAnnotationUpdated) {
      this.annotationManager.on('updated', options.onAnnotationUpdated);
    }
    
    // 渲染现有标记
    this.renderCurrentChapterAnnotations();
  }

  /**
   * 从当前选择创建标记
   */
  async createAnnotationFromSelection(
    type: AnnotationType, 
    options?: any
  ): Promise<Annotation | null> {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      throw new Error('没有选中的文字');
    }
    
    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) {
      throw new Error('选中的文字为空');
    }
    
    try {
      // 生成CFI
      const range = selection.getRangeAt(0);
      const cfi = this.generateCFIFromRange(range);
      if (!cfi) {
        throw new Error('无法生成CFI');
      }
      
      // 获取当前章节信息
      const currentChapter = this.getCurrentChapter();
      
      // 创建标记
      const annotation = await this.annotationManager.createAnnotation(type, selectedText, cfi, {
        ...options,
        chapterId: currentChapter?.id || 'unknown'
      });
      
      // 渲染到SVG
      this.svgOverlay.renderAnnotation(annotation);
      
      // 清除选择
      selection.removeAllRanges();
      
      return annotation;
    } catch (error) {
      throw new Error(`创建标记失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从Range生成CFI
   */
  private generateCFIFromRange(range: Range): CFI | null {
    try {
      // 这里简化CFI生成，实际实现需要更复杂的逻辑
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;
      
      // 获取路径信息
      const startPath = this.getElementPath(startContainer.parentElement);
      const endPath = this.getElementPath(endContainer.parentElement);
      
      // 生成简化的CFI
      const cfi: CFI = {
        path: `epub(/6/${startPath}/4[${range.startOffset}]/2:0,/6/${endPath}/4[${range.endOffset}]/2:0)`,
        components: [
          { type: 'element', index: 6 },
          { type: 'text', index: startPath, assertion: String(range.startOffset) },
          { type: 'text', index: endPath, assertion: String(range.endOffset) }
        ],
        localPath: range.toString(),
        chapterId: this.getCurrentChapter()?.id
      };
      
      return cfi;
    } catch (error) {
      console.error('生成CFI失败:', error);
      return null;
    }
  }

  /**
   * 获取元素路径
   */
  private getElementPath(element: Element | null): number {
    if (!element || !element.parentElement) return 0;
    
    const siblings = Array.from(element.parentElement.children);
    return siblings.indexOf(element);
  }

  /**
   * 渲染当前章节的所有标记
   */
  private renderCurrentChapterAnnotations(): void {
    const currentChapter = this.getCurrentChapter();
    if (!currentChapter) return;
    
    const annotations = this.annotationManager.getAnnotations(currentChapter.id);
    this.svgOverlay.clearAnnotations();
    
    annotations.forEach(annotation => {
      this.svgOverlay.renderAnnotation(annotation);
    });
    
    console.log(`渲染章节 ${currentChapter.id} 的 ${annotations.length} 个标记`);
  }
  
  /**
   * 延迟渲染标记（确保DOM完全加载）
   */
  private renderAnnotationsWithDelay(targetId: string, maxRetries: number = 3, currentRetry: number = 1): void {
    const targetElement = document.getElementById(targetId);
    
    if (!targetElement) {
      console.warn(`目标元素不存在: ${targetId}`);
      return;
    }
    
    // 检查章节内容是否完全加载
    const contentElement = targetElement.querySelector('.epub-chapter-content');
    if (!contentElement || contentElement.children.length === 0) {
      if (currentRetry < maxRetries) {
        console.log(`章节内容未完全加载，${200 * currentRetry}ms后重试 (${currentRetry}/${maxRetries})`);
        setTimeout(() => {
          this.renderAnnotationsWithDelay(targetId, maxRetries, currentRetry + 1);
        }, 200 * currentRetry);
      } else {
        console.warn('章节内容加载失败，跳过标记渲染');
      }
      return;
    }
    
    // 检查SVG覆盖层是否存在
    let svgElement = targetElement.querySelector('.epub-annotation-overlay');
    if (!svgElement) {
      console.log('SVG覆盖层不存在，重新创建');
      this.svgOverlay.createOverlay(targetId);
    }
    
    // 延迟渲染标记，确保所有资源加载完成
    setTimeout(() => {
      this.renderCurrentChapterAnnotations();
      console.log(`标记渲染完成 (重试次数: ${currentRetry})`);
    }, 100 * currentRetry);
  }



  /**
   * 移除标记
   */
  async removeAnnotation(annotationId: string): Promise<void> {
    try {
      await this.annotationManager.removeAnnotation(annotationId);
      this.svgOverlay.removeAnnotation(annotationId);
    } catch (error) {
      throw new Error(`移除标记失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 更新标记
   */
  async updateAnnotation(annotationId: string, updates: Partial<Annotation>): Promise<Annotation> {
    try {
      const annotation = await this.annotationManager.updateAnnotation(annotationId, updates);
      this.svgOverlay.renderAnnotation(annotation);
      return annotation;
    } catch (error) {
      throw new Error(`更新标记失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取标记
   */
  getAnnotation(annotationId: string): Annotation | undefined {
    return this.annotationManager.getAnnotation(annotationId);
  }

  /**
   * 获取所有标记
   */
  getAnnotations(chapterId?: string): Annotation[] {
    return this.annotationManager.getAnnotations(chapterId);
  }

  /**
   * 导出标记
   */
  exportAnnotations(): string {
    return this.annotationManager.exportAnnotations();
  }

  /**
   * 导入标记
   */
  async importAnnotations(data: string, merge: boolean = false): Promise<void> {
    try {
      await this.annotationManager.importAnnotations(data, merge);
      this.renderCurrentChapterAnnotations();
    } catch (error) {
      throw new Error(`导入标记失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取标记管理器
   */
  getAnnotationManager(): AnnotationManagerImpl {
    return this.annotationManager;
  }

  /**
   * 获取当前选中的文字
   */
  getSelectedText(): string {
    return this.selectionManager.getSelectedText();
  }

  /**
   * 检查是否有选中的内容
   */
  hasSelection(): boolean {
    return this.selectionManager.hasSelection();
  }

  /**
   * 清除选择
   */
  clearSelection(): void {
    this.selectionManager.clearSelection();
  }

  /**
   * 获取选中的范围
   */
  getSelectedRange(): Range | null {
    return this.selectionManager.getSelectedRange();
  }

  // ==================== 样式控制方法 ====================

  /**
   * 设置单个阅读样式
   * @param key 样式属性名
   * @param value 样式值
   * @returns Promise<ReadingStyles> 返回更新后的所有样式
   */
  async setReadingStyle(key: keyof ReadingStyles, value: string): Promise<ReadingStyles> {
    if (!this.styleManager) {
      throw new Error('样式管理器未初始化');
    }
    
    try {
      return await this.styleManager.setStyle(key, value);
    } catch (error) {
      throw new Error(`设置样式失败 (${key}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 批量设置阅读样式
   * @param styles 样式对象
   * @returns Promise<ReadingStyles> 返回更新后的所有样式
   */
  async setReadingStyles(styles: Partial<ReadingStyles>): Promise<ReadingStyles> {
    if (!this.styleManager) {
      throw new Error('样式管理器未初始化');
    }
    
    try {
      return await this.styleManager.setStyles(styles);
    } catch (error) {
      throw new Error(`批量设置样式失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取当前阅读样式
   * @returns ReadingStyles 当前所有样式设置
   */
  getReadingStyles(): ReadingStyles {
    if (!this.styleManager) {
      throw new Error('样式管理器未初始化');
    }
    
    return this.styleManager.getStyles();
  }

  /**
   * 重置阅读样式为默认值
   * @returns Promise<ReadingStyles> 返回重置后的默认样式
   */
  async resetReadingStyles(): Promise<ReadingStyles> {
    if (!this.styleManager) {
      throw new Error('样式管理器未初始化');
    }
    
    try {
      return await this.styleManager.resetStyles();
    } catch (error) {
      throw new Error(`重置样式失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 监听样式更新事件
   * @param callback 样式更新回调函数
   */
  onStyleUpdate(callback: StyleUpdateCallback): void {
    if (!this.styleManager) {
      console.warn('样式管理器未初始化，无法监听样式更新');
      return;
    }
    
    this.styleManager.onStyleUpdate(callback);
  }

  /**
   * 移除样式更新事件监听
   * @param callback 要移除的回调函数
   */
  offStyleUpdate(callback: StyleUpdateCallback): void {
    if (!this.styleManager) {
      return;
    }
    
    this.styleManager.offStyleUpdate(callback);
  }

  /**
   * 获取样式管理器实例（高级用法）
   * @returns ReadingStyleManager 样式管理器实例
   */
  getStyleManager(): ReadingStyleManager | null {
    return this.styleManager;
  }
}