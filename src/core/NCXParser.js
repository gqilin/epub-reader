import XMLParser from '../utils/XMLParser.js';
import TOCItem from '../models/TOCItem.js';

class NCXParser {
  static async parse(xmlString) {
    try {
      const xmlDoc = await XMLParser.parseXML(xmlString);
      const ncxElement = xmlDoc.documentElement;
      
      if (ncxElement.tagName !== 'ncx') {
        throw new Error('Invalid NCX file: root element must be "ncx"');
      }

      const version = XMLParser.getAttributeValue(ncxElement, 'version') || '2005-1';
      
      // 解析head
      const head = this.parseHead(ncxElement);
      
      // 解析docTitle
      const docTitle = this.parseDocTitle(ncxElement);
      
      // 解析docAuthor
      const docAuthor = this.parseDocAuthor(ncxElement);
      
      // 解析navMap
      const navMap = this.parseNavMap(ncxElement);
      
      // 解析pageList (可选)
      const pageList = this.parsePageList(ncxElement);
      
      // 解析navList (可选)
      const navList = this.parseNavList(ncxElement);

      return {
        version,
        head,
        docTitle,
        docAuthor,
        navMap,
        pageList,
        navList
      };
    } catch (error) {
      throw new Error(`Failed to parse NCX file: ${error.message}`);
    }
  }

  static parseHead(ncxElement) {
    const headElement = XMLParser.findElementByTagName(ncxElement, 'head');
    if (!headElement) {
      return {};
    }

    const head = {};
    const metaElements = XMLParser.findElementsByTagName(headElement, 'meta');
    
    metaElements.forEach(meta => {
      const name = XMLParser.getAttributeValue(meta, 'name');
      const content = XMLParser.getAttributeValue(meta, 'content');
      
      if (name && content) {
        head[name] = content;
      }
    });
    
    return head;
  }

  static parseDocTitle(ncxElement) {
    const docTitleElement = XMLParser.findElementByTagName(ncxElement, 'docTitle');
    if (!docTitleElement) {
      return '';
    }

    const textElement = XMLParser.findElementByTagName(docTitleElement, 'text');
    return textElement ? XMLParser.getElementText(textElement).trim() : '';
  }

  static parseDocAuthor(ncxElement) {
    const docAuthorElement = XMLParser.findElementByTagName(ncxElement, 'docAuthor');
    if (!docAuthorElement) {
      return '';
    }

    const textElement = XMLParser.findElementByTagName(docAuthorElement, 'text');
    return textElement ? XMLParser.getElementText(textElement).trim() : '';
  }

  static parseNavMap(ncxElement) {
    const navMapElement = XMLParser.findElementByTagName(ncxElement, 'navMap');
    if (!navMapElement) {
      throw new Error('NCX file missing navMap element');
    }

    const navPoints = XMLParser.findElementsByTagName(navMapElement, 'navPoint');
    const tocRoot = new TOCItem('root', '', '', 0, 0);
    
    navPoints.forEach((navPoint, index) => {
      const tocItem = this.parseNavPoint(navPoint, index);
      if (tocItem) {
        tocRoot.addChild(tocItem);
      }
    });
    
    return tocRoot;
  }

  static parseNavPoint(navPoint, order = 0) {
    const id = XMLParser.getAttributeValue(navPoint, 'id');
    const classAttr = XMLParser.getAttributeValue(navPoint, 'class') || '';
    
    // 解析label
    const labelElement = XMLParser.findElementByTagName(navPoint, 'navLabel');
    let title = '';
    if (labelElement) {
      const textElement = XMLParser.findElementByTagName(labelElement, 'text');
      title = textElement ? XMLParser.getElementText(textElement).trim() : '';
    }
    
    // 解析content
    const contentElement = XMLParser.findElementByTagName(navPoint, 'content');
    let href = '';
    if (contentElement) {
      href = XMLParser.getAttributeValue(contentElement, 'src') || '';
    }
    
    if (!id || !href) {
      console.warn('NavPoint missing required attributes');
      return null;
    }
    
    const tocItem = new TOCItem(id, title, href, order, 0);
    
    // 解析子navPoints - 只查找直接子元素
    const childNavPoints = XMLParser.findDirectChildrenByTagName(navPoint, 'navPoint');
    
    childNavPoints.forEach((childNavPoint, index) => {
      const childItem = this.parseNavPoint(childNavPoint, index);
      if (childItem) {
        tocItem.addChild(childItem);
      }
    });
    
    return tocItem;
  }

  static parsePageList(ncxElement) {
    const pageListElement = XMLParser.findElementByTagName(ncxElement, 'pageList');
    if (!pageListElement) {
      return null;
    }

    const pageTargets = XMLParser.findElementsByTagName(pageListElement, 'pageTarget');
    const pageList = [];
    
    pageTargets.forEach(pageTarget => {
      const type = XMLParser.getAttributeValue(pageTarget, 'type') || 'normal';
      const value = XMLParser.getAttributeValue(pageTarget, 'value') || '';
      
      // 解析label
      const labelElement = XMLParser.findElementByTagName(pageTarget, 'navLabel');
      let label = '';
      if (labelElement) {
        const textElement = XMLParser.findElementByTagName(labelElement, 'text');
        label = textElement ? XMLParser.getElementText(textElement).trim() : '';
      }
      
      // 解析content
      const contentElement = XMLParser.findElementByTagName(pageTarget, 'content');
      let href = '';
      if (contentElement) {
        href = XMLParser.getAttributeValue(contentElement, 'src') || '';
      }
      
      if (href) {
        pageList.push({
          type,
          value,
          label,
          href
        });
      }
    });
    
    return pageList;
  }

  static parseNavList(ncxElement) {
    const navListElement = XMLParser.findElementByTagName(ncxElement, 'navList');
    if (!navListElement) {
      return null;
    }

    const navTargets = XMLParser.findElementsByTagName(navListElement, 'navTarget');
    const navList = [];
    
    navTargets.forEach(navTarget => {
      const id = XMLParser.getAttributeValue(navTarget, 'id') || '';
      const value = XMLParser.getAttributeValue(navTarget, 'value') || '';
      
      // 解析label
      const labelElement = XMLParser.findElementByTagName(navTarget, 'navLabel');
      let label = '';
      if (labelElement) {
        const textElement = XMLParser.findElementByTagName(labelElement, 'text');
        label = textElement ? XMLParser.getElementText(textElement).trim() : '';
      }
      
      // 解析content
      const contentElement = XMLParser.findElementByTagName(navTarget, 'content');
      let href = '';
      if (contentElement) {
        href = XMLParser.getAttributeValue(contentElement, 'src') || '';
      }
      
      if (href) {
        navList.push({
          id,
          value,
          label,
          href
        });
      }
    });
    
    return navList;
  }
}

export default NCXParser;