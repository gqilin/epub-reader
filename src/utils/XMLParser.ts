/**
 * XML解析工具类
 */
export default class XMLParser {
  /**
   * 解析XML字符串为DOM文档
   * @param xmlString XML字符串
   * @returns DOM文档
   */
  static async parseXML(xmlString: string): Promise<Document> {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      // 检查解析错误
      const parseError = xmlDoc.getElementsByTagName('parsererror');
      if (parseError.length > 0) {
        throw new Error('XML parsing error');
      }
      
      return xmlDoc;
    } catch (error) {
      throw new Error(`Failed to parse XML: ${(error as Error).message}`);
    }
  }

  /**
   * 将DOM元素转换为对象
   * @param element DOM元素
   * @returns 转换后的对象
   */
  static elementToObject(element: Element): Record<string, any> {
    const obj: Record<string, any> = {};
    
    // 处理属性
    if (element.attributes) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        obj[attr.name] = attr.value;
      }
    }
    
    // 处理子元素
    if (element.children) {
      for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i];
        const childName = child.tagName;
        
        if (child.children.length > 0) {
          const childObj = this.elementToObject(child);
          
          if (obj[childName]) {
            if (!Array.isArray(obj[childName])) {
              obj[childName] = [obj[childName]];
            }
            obj[childName].push(childObj);
          } else {
            obj[childName] = childObj;
          }
        } else {
          const textContent = child.textContent || child.innerText || '';
          
          if (textContent.trim()) {
            if (obj[childName]) {
              if (!Array.isArray(obj[childName])) {
                obj[childName] = [obj[childName]];
              }
              obj[childName].push(textContent.trim());
            } else {
              obj[childName] = textContent.trim();
            }
          } else {
            obj[childName] = '';
          }
        }
      }
    }
    
    // 处理文本内容
    const textContent = element.textContent || element.innerText || '';
    if (textContent.trim() && Object.keys(obj).length === 0) {
      return textContent.trim();
    }
    
    return obj;
  }

  /**
   * 根据标签名查找元素
   * @param root 根元素
   * @param tagName 标签名
   * @returns 找到的元素，未找到返回null
   */
  static findElementByTagName(root: Element, tagName: string): Element | null {
    if (root.tagName === tagName) {
      return root;
    }
    
    if (root.children) {
      for (let i = 0; i < root.children.length; i++) {
        const found = this.findElementByTagName(root.children[i], tagName);
        if (found) return found;
      }
    }
    
    return null;
  }

  /**
   * 根据标签名查找所有元素
   * @param root 根元素
   * @param tagName 标签名
   * @returns 找到的元素数组
   */
  static findElementsByTagName(root: Element, tagName: string): Element[] {
    const results: Element[] = [];
    
    function traverse(node: Element): void {
      if (node.tagName === tagName) {
        results.push(node);
      }
      
      // 检查childNodes而不是children，以避免某些解析器的问题
      if (node.childNodes) {
        for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i];
          if (child.nodeType === 1) { // Element node
            traverse(child as Element);
          }
        }
      } else if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          traverse(node.children[i]);
        }
      }
    }
    
    traverse(root);
    return results;
  }

  /**
   * 查找直接子元素（只查找一级子元素）
   * @param parent 父元素
   * @param tagName 标签名
   * @returns 匹配的直接子元素数组
   */
  static findDirectChildrenByTagName(parent: Element, tagName: string): Element[] {
    const results: Element[] = [];
    
    if (parent.childNodes) {
      for (let i = 0; i < parent.childNodes.length; i++) {
        const child = parent.childNodes[i];
        if (child.nodeType === 1 && (child as Element).tagName === tagName) { // Element node with matching tag
          results.push(child as Element);
        }
      }
    } else if (parent.children) {
      for (let i = 0; i < parent.children.length; i++) {
        const child = parent.children[i];
        if (child.tagName === tagName) {
          results.push(child);
        }
      }
    }
    
    return results;
  }

  /**
   * 获取元素属性值
   * @param element DOM元素
   * @param attributeName 属性名
   * @returns 属性值，不存在返回null
   */
  static getAttributeValue(element: Element, attributeName: string): string | null {
    return element.getAttribute ? element.getAttribute(attributeName) : null;
  }

  /**
   * 获取元素文本内容
   * @param element DOM元素
   * @returns 文本内容
   */
  static getElementText(element: Element): string {
    return element.textContent || element.innerText || '';
  }

  /**
   * 创建支持命名空间的解析器
   * @param xmlString XML字符串
   * @param namespaces 命名空间映射
   * @returns 解析器对象
   */
  static namespaceAwareParser(xmlString: string, namespaces: Record<string, string> = {}): {
    root: Element;
    find: (xpath: string) => Element[];
    element: (tagName: string) => Element | null;
    elements: (tagName: string) => Element[];
  } {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    return {
      root: xmlDoc.documentElement,
      find: (xpath: string): Element[] => {
        // 简化的XPath查找，实际使用中可能需要更完整的XPath实现
        const elements = xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const results: Element[] = [];
        for (let i = 0; i < elements.snapshotLength; i++) {
          results.push(elements.snapshotItem(i) as Element);
        }
        return results;
      },
      element: (tagName: string): Element | null => this.findElementByTagName(xmlDoc.documentElement, tagName),
      elements: (tagName: string): Element[] => this.findElementsByTagName(xmlDoc.documentElement, tagName)
    };
  }
}