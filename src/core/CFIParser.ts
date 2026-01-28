import { CFI, CFIPath, CFIParseOptions } from '../types/CFI';

/**
 * CFI（Canonical Fragment Identifier）解析器
 * 紫责将CFI字符串转换为可操作的位置信息
 */
export class CFIParser {
  /**
   * 解析Book标识符字符串
   * @param bookString Book标识符字符串
   * @param options 解析选项
   * @returns CFI对象
   */
  static parse(bookString: string, options: CFIParseOptions = {}): CFI {
    try {
      // 移除book:前缀
      const cleanBook = bookString.replace(/^book:\//, '');
      
      // 分割章节ID和路径
      const [chapterId, ...pathParts] = cleanBook.split('/');
      
      if (!chapterId) {
        throw new Error('Invalid CFI: missing chapter ID');
      }

      // 解析路径
      const path = this.parsePath(pathParts.join('/'));
      
// 提取文本偏移
      const textOffset = this.extractTextOffset(bookString);
      
      const cfi: CFI = {
        chapterId,
        path,
        textOffset,
        characterOffset: textOffset
      };

      // 验证Book标识符
      if (options.validate && options.container) {
        if (!this.validateBookID(cfi, options.container)) {
          throw new Error('Book ID validation failed');
        }
      }

      return cfi;
    } catch (error) {
      throw new Error(`Failed to parse CFI: ${(error as Error).message}`);
    }
  }

  /**
   * 查找DOM元素
   * @param cfi CFI对象
   * @param container 容器元素
   * @returns 找到的元素
   */
  static findElement(cfi: CFI, container: Element): Element | null {
    try {
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
    } catch (error) {
      return null;
    }
  }

  /**
   * 查找文本节点和偏移
   * @param cfi CFI对象
   * @param container 容器元素
   * @returns 文本节点和偏移
   */
  static findTextNode(cfi: CFI, container: Element): { node: Text, offset: number } | null {
    try {
      // 先找到包含文本的父元素
      const parentElement = this.findParentOfText(cfi, container);
      if (!parentElement) {
        return null;
      }

      // 找到文本节点
      const textNode = this.findTextNodeByIndex(parentElement, cfi);
      if (!textNode) {
        return null;
      }

      const offset = cfi.textOffset || 0;
      
      return {
        node: textNode,
        offset: Math.min(offset, textNode.textContent?.length || 0)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 查找选择范围
   * @param selection 文本选择CFI
   * @param container 容器元素
   * @returns DOM范围对象
   */
  static findSelection(selection: any, container: Element): Range | null {
    try {
      const range = document.createRange();
      
      // 查找开始位置
      const startResult = this.findTextNode(selection.startCFI, container);
      const endResult = this.findTextNode(selection.endCFI, container);
      
      if (!startResult || !endResult) {
        return null;
      }

      // 设置范围
      range.setStart(startResult.node, startResult.offset);
      range.setEnd(endResult.node, endResult.offset);
      
      return range;
    } catch (error) {
      return null;
    }
  }

  /**
   * 恢复滚动位置
   * @param cfi CFI对象
   * @param container 容器元素
   * @param options 选项
   */
  static restoreScrollPosition(cfi: CFI, container: Element, options: { align?: 'start' | 'center' | 'end' } = {}): void {
    try {
      const element = this.findElement(cfi, container);
      if (!element) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      let scrollTop = elementRect.top - containerRect.top;
      
      // 根据对齐方式调整
      if (options.align === 'center') {
        const containerHeight = container.clientHeight;
        scrollTop -= containerHeight / 2;
      } else if (options.align === 'end') {
        const containerHeight = container.clientHeight;
        scrollTop -= containerHeight;
      }

      // 考虑视口偏移
      const viewportOffset = (cfi as any).viewportOffset || 0;
      scrollTop += viewportOffset;

      container.scrollTop = scrollTop;
    } catch (error) {
      console.warn('Failed to restore scroll position:', error);
    }
  }

  /**
   * 验证Book ID是否有效
   * @param cfi CFI对象
   * @param container 容器元素
   * @returns 是否有效
   */
  static validateBookID(cfi: CFI, container: Element): boolean {
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

      // 尝试定位元素
      const element = this.findElement(cfi, container);
      if (!element) {
        return false;
      }

      // 如果有文本偏移，验证文本节点
      if (cfi.textOffset !== undefined) {
        const textResult = this.findTextNode(cfi, container);
        if (!textResult) {
          return false;
        }
      }

      // 验证内容哈希（如果存在）
      if (cfi.hash) {
        const currentHash = this.generateContentHash(element);
        if (currentHash !== cfi.hash) {
          console.warn('Book ID content hash mismatch - content may have changed');
          // 这里可以选择是否认为无效
          // return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取CFI对应的文本内容
   * @param cfi CFI对象
   * @param container 容器元素
   * @param contextLength 上下文长度
   * @returns 文本内容和上下文
   */
  static getTextContent(cfi: CFI, container: Element, contextLength: number = 100): string | null {
    try {
      if (cfi.textOffset !== undefined) {
        const textResult = this.findTextNode(cfi, container);
        if (!textResult) {
          return null;
        }

        const fullText = textResult.node.textContent || '';
        const start = Math.max(0, textResult.offset - contextLength);
        const end = Math.min(fullText.length, textResult.offset + contextLength);
        
        return fullText.substring(start, end);
      }

      const element = this.findElement(cfi, container);
      return element ? element.textContent || '' : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析路径部分
   * @param pathString 路径字符串
   * @returns CFI路径数组
   */
  private static parsePath(pathString: string): CFIPath[] {
    const path: CFIPath[] = [];
    const segments = pathString.split('/').filter(segment => segment);

    for (const segment of segments) {
      const pathNode = this.parsePathSegment(segment);
      if (pathNode) {
        path.push(pathNode);
      }
    }

    return path;
  }

  /**
   * 解析路径段
   * @param segment 路径段
   * @returns CFI路径节点
   */
  private static parsePathSegment(segment: string): CFIPath | null {
    // 处理文本节点 (!/)
    if (segment.startsWith('!')) {
      const indexPart = segment.substring(1);
      const index = parseInt(indexPart, 10);
      return {
        type: 'text',
        index: isNaN(index) ? 0 : index
      };
    }

    // 处理偏移 (:)
    if (segment.startsWith(':')) {
      const offsetPart = segment.substring(1);
      const index = parseInt(offsetPart, 10);
      return {
        type: 'offset',
        index: isNaN(index) ? 0 : index
      };
    }

    // 处理元素节点
    const index = parseInt(segment, 10);
    if (!isNaN(index)) {
      return {
        type: 'element',
        index
      };
    }

    return null;
  }

  /**
   * 提取文本偏移
   * @param bookString Book标识符字符串
   * @returns 文本偏移
   */
  private static extractTextOffset(bookString: string): number | undefined {
    const offsetMatch = bookString.match(/:(\d+)$/);
    return offsetMatch ? parseInt(offsetMatch[1], 10) : undefined;
  }

  /**
   * 查找包含文本的父元素
   * @param cfi CFI对象
   * @param container 容器元素
   * @returns 父元素
   */
  private static findParentOfText(cfi: CFI, container: Element): Element | null {
    let currentElement: Element = container;
    
    for (let i = 0; i < cfi.path.length - 1; i++) {
      const pathNode = cfi.path[i];
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
   * 根据索引查找文本节点
   * @param parent 父元素
   * @param cfi CFI对象
   * @returns 文本节点
   */
  private static findTextNodeByIndex(parent: Element, cfi: CFI): Text | null {
    const textPathNode = cfi.path[cfi.path.length - 1];
    if (textPathNode.type !== 'text') {
      return null;
    }

    const textNodes = Array.from(parent.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE);
    
    return textNodes[textPathNode.index] as Text || null;
  }

  /**
   * 生成内容哈希
   * @param element DOM元素
   * @returns 哈希值
   */
  private static generateContentHash(element: Element): string {
    const text = element.textContent || '';
    const maxLength = 100;
    const content = text.substring(0, maxLength);
    
    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(36);
  }
}