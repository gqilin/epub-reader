import { CFI, CFIPath, CFIGenerationOptions } from '../types/CFI.js';

/**
 * CFI（Canonical Fragment Identifier）生成器
 * 负责将DOM位置转换为CFI格式
 */
export class CFIGenerator {
  /**
   * 从DOM元素生成CFI
   * @param element DOM元素
   * @param chapterId 章节ID
   * @param options 生成选项
   * @returns CFI对象
   */
  static fromElement(element: Element, chapterId: string, options: CFIGenerationOptions = {}): CFI {
    const path = this.buildPathToRoot(element, options);
    const cfi: CFI = {
      chapterId,
      path
    };

    if (options.includeTextSnippet && element.textContent) {
      cfi.hash = this.generateContentHash(element.textContent.substring(0, 100));
    }

    return cfi;
  }

  /**
   * 从文本节点生成CFI
   * @param node 文本节点
   * @param offset 字符偏移
   * @param chapterId 章节ID
   * @param options 生成选项
   * @returns CFI对象
   */
  static fromTextNode(node: Text, offset: number, chapterId: string, options: CFIGenerationOptions = {}): CFI {
    const parentElement = node.parentElement;
    if (!parentElement) {
      throw new Error('Text node must have a parent element');
    }

    // 获取父元素的路径
    const elementPath = this.buildPathToRoot(parentElement, options);
    
    // 在父元素中找到文本节点的索引
    const textNodeIndex = this.getTextNodeIndex(parentElement, node);
    
    // 添加文本路径节点
    const textPath: CFIPath = {
      type: 'text',
      index: textNodeIndex,
      textContent: options.includeTextSnippet ? node.textContent?.substring(0, 50) : undefined
    };

    const path = [...elementPath, textPath];
    
    const cfi: CFI = {
      chapterId,
      path,
      textOffset: offset,
      characterOffset: offset
    };

    if (options.includeTextSnippet && node.textContent) {
      cfi.hash = this.generateContentHash(node.textContent.substring(offset, offset + 50));
    }

    return cfi;
  }

  /**
   * 从选择范围生成文本选择CFI
   * @param range 选择范围
   * @param chapterId 章节ID
   * @param options 生成选项
   * @returns 文本选择CFI对象
   */
  static fromSelection(range: Range, chapterId: string, options: CFIGenerationOptions = {}): any {
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    
    if (startContainer.nodeType !== Node.TEXT_NODE || endContainer.nodeType !== Node.TEXT_NODE) {
      throw new Error('Range must start and end in text nodes');
    }

    const startNode = startContainer as Text;
    const endNode = endContainer as Text;

    const startCFI = this.fromTextNode(startNode, range.startOffset, chapterId, options);
    const endCFI = this.fromTextNode(endNode, range.endOffset, chapterId, options);

    const selectedText = range.toString();

    return {
      startCFI,
      endCFI,
      selectedText,
      chapterId,
      contextBefore: this.getContextBefore(startNode, range.startOffset),
      contextAfter: this.getContextAfter(endNode, range.endOffset),
      wordCount: this.countWords(selectedText),
      charCount: selectedText.length
    };
  }

  /**
   * 从滚动位置生成CFI
   * @param scrollTop 滚动位置
   * @param chapterId 章节ID
   * @param container 容器元素
   * @param options 生成选项
   * @returns CFI对象
   */
  static fromScrollPosition(scrollTop: number, chapterId: string, container: Element, options: CFIGenerationOptions = {}): CFI {
    // 找到滚动位置对应的元素
    const element = this.findElementAtScrollPosition(scrollTop, container);
    if (!element) {
      throw new Error('No element found at scroll position');
    }

    const cfi = this.fromElement(element, chapterId, options);
    
    // 添加视口偏移信息
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const viewportOffset = elementRect.top - containerRect.top;
    
    // 可以将视口偏移存储在扩展属性中
    (cfi as any).viewportOffset = viewportOffset;

    return cfi;
  }

  /**
   * 生成Book标识符字符串
   * @param cfi CFI对象
   * @returns Book标识符字符串
   */
  static toString(cfi: CFI): string {
    const pathStr = this.pathToString(cfi.path);
    const offsetStr = cfi.textOffset !== undefined ? `:${cfi.textOffset}` : '';
    return `book:/${cfi.chapterId}${pathStr}${offsetStr}`;
  }

  /**
   * 验证CFI有效性
   * @param cfi CFI对象
   * @param container 容器元素（可选）
   * @returns 是否有效
   */
  static validate(cfi: CFI, container?: Element): boolean {
    try {
      // 基本结构验证
      if (!cfi.chapterId || !cfi.path || !Array.isArray(cfi.path)) {
        return false;
      }

      // 路径节点验证
      for (const pathNode of cfi.path) {
        if (!pathNode.type || pathNode.index < 0) {
          return false;
        }
      }

      // 如果提供了容器，尝试定位
      if (container) {
        const element = this.findElementByCFI(cfi, container);
        return !!element;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 构建从元素到根节点的路径
   * @param element 目标元素
   * @param options 生成选项
   * @returns CFI路径数组
   */
  private static buildPathToRoot(element: Element, options: CFIGenerationOptions = {}): CFIPath[] {
    const path: CFIPath[] = [];
    let currentElement: Element | null = element;
    let index = 0;

    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
      // 计算在父元素中的索引
      const siblings = Array.from(currentElement.parentElement?.children || []);
      const elementIndex = siblings.indexOf(currentElement);

      const pathNode: CFIPath = {
        type: 'element',
        index: elementIndex,
        tagName: currentElement.tagName.toLowerCase()
      };

      if (options.includeElementId && currentElement.id) {
        pathNode.elementId = currentElement.id;
      }

      if (options.includeClass && currentElement.className) {
        pathNode.elementClass = currentElement.className;
      }

      // 收集重要属性
      const attributes: Record<string, string> = {};
      if (currentElement.id) attributes.id = currentElement.id;
      if (currentElement.className) attributes.class = currentElement.className;
      if (Object.keys(attributes).length > 0) {
        pathNode.attributes = attributes;
      }

      path.unshift(pathNode);
      currentElement = currentElement.parentElement;
      index++;
    }

    return path;
  }

  /**
   * 获取文本节点在父元素中的索引
   * @param parent 父元素
   * @param textNode 文本节点
   * @returns 索引位置
   */
  private static getTextNodeIndex(parent: Element, textNode: Text): number {
    const textNodes = Array.from(parent.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE);
    
    return textNodes.indexOf(textNode);
  }

  /**
   * 生成内容哈希
   * @param content 文本内容
   * @returns 哈希值
   */
  private static generateContentHash(content: string): string {
    // 简单的哈希函数，实际项目中可以使用更复杂的算法
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(36);
  }

  /**
   * 获取文本前的上下文
   * @param node 文本节点
   * @param offset 偏移位置
   * @param length 上下文长度
   * @returns 上下文文本
   */
  private static getContextBefore(node: Text, offset: number, length: number = 50): string {
    const text = node.textContent || '';
    const start = Math.max(0, offset - length);
    return text.substring(start, offset);
  }

  /**
   * 获取文本后的上下文
   * @param node 文本节点
   * @param offset 偏移位置
   * @param length 上下文长度
   * @returns 上下文文本
   */
  private static getContextAfter(node: Text, offset: number, length: number = 50): string {
    const text = node.textContent || '';
    const start = offset;
    const end = Math.min(text.length, offset + length);
    return text.substring(start, end);
  }

  /**
   * 统计单词数量
   * @param text 文本
   * @returns 单词数量
   */
  private static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * 查找滚动位置对应的元素
   * @param scrollTop 滚动位置
   * @param container 容器元素
   * @returns 对应的元素
   */
  private static findElementAtScrollPosition(scrollTop: number, container: Element): Element | null {
    const elements = container.querySelectorAll('p, div, section, article, h1, h2, h3, h4, h5, h6');
    
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const elementTop = rect.top - containerRect.top;
      
      if (elementTop >= scrollTop - 50 && elementTop <= scrollTop + 50) {
        return element as Element;
      }
    }
    
    return null;
  }

  /**
   * 根据CFI查找元素
   * @param cfi CFI对象
   * @param container 容器元素
   * @returns 找到的元素
   */
  private static findElementByCFI(cfi: CFI, container: Element): Element | null {
    let currentElement: Element = container;
    
    for (const pathNode of cfi.path) {
      if (pathNode.type === 'element') {
        const children = Array.from(currentElement.children);
        if (pathNode.index >= children.length) {
          return null;
        }
        currentElement = children[pathNode.index] as Element;
      }
    }
    
    return currentElement;
  }

  /**
   * 将路径数组转换为字符串表示
   * @param path 路径数组
   * @returns 路径字符串
   */
  private static pathToString(path: CFIPath[]): string {
    return path.map(node => {
      if (node.type === 'element') {
        return `/${node.index}`;
      } else if (node.type === 'text') {
        return `!/${node.index}`;
      } else if (node.type === 'offset') {
        return `:${node.index}`;
      }
      return '';
    }).join('');
  }
}