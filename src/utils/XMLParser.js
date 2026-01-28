class XMLParser {
  static async parseXML(xmlString) {
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
      throw new Error(`Failed to parse XML: ${error.message}`);
    }
  }

  static elementToObject(element) {
    const obj = {};
    
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

  static findElementByTagName(root, tagName) {
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

  static findElementsByTagName(root, tagName) {
    const results = [];
    
    function traverse(node) {
      if (node.tagName === tagName) {
        results.push(node);
      }
      
      // 检查childNodes而不是children，以避免某些解析器的问题
      if (node.childNodes) {
        for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i];
          if (child.nodeType === 1) { // Element node
            traverse(child);
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

  static getAttributeValue(element, attributeName) {
    return element.getAttribute ? element.getAttribute(attributeName) : null;
  }

  static getElementText(element) {
    return element.textContent || element.innerText || '';
  }

  static findDirectChildrenByTagName(parent, tagName) {
    const results = [];
    
    if (parent.childNodes) {
      for (let i = 0; i < parent.childNodes.length; i++) {
        const child = parent.childNodes[i];
        if (child.nodeType === 1 && child.tagName === tagName) { // Element node with matching tag
          results.push(child);
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

  static namespaceAwareParser(xmlString, namespaces = {}) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    return {
      root: xmlDoc.documentElement,
      find: (xpath) => {
        // 简化的XPath查找，实际使用中可能需要更完整的XPath实现
        const elements = xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const results = [];
        for (let i = 0; i < elements.snapshotLength; i++) {
          results.push(elements.snapshotItem(i));
        }
        return results;
      },
      element: (tagName) => this.findElementByTagName(xmlDoc.documentElement, tagName),
      elements: (tagName) => this.findElementsByTagName(xmlDoc.documentElement, tagName)
    };
  }
}

export default XMLParser;