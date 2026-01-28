import XMLParser from '../utils/XMLParser.js';
import TOCItem from '../models/TOCItem.js';

class NavigationParser {
  static async parse(xmlString) {
    try {
      const xmlDoc = await XMLParser.parseXML(xmlString);
      const htmlElement = xmlDoc.documentElement;
      
      if (htmlElement.tagName !== 'html') {
        throw new Error('Invalid navigation document: root element must be "html"');
      }

      // 查找nav元素
      const navElement = XMLParser.findElementByTagName(htmlElement, 'nav');
      if (!navElement) {
        throw new Error('Navigation document missing nav element');
      }

      // 解析不同类型的nav
      const navigation = {};
      const navElements = XMLParser.findElementsByTagName(htmlElement, 'nav');
      
      navElements.forEach(nav => {
        const epubType = nav.getAttribute('epub:type') || nav.getAttributeNS('http://www.idpf.org/2007/ops', 'type');
        
        if (epubType === 'toc') {
          navigation.toc = this.parseTOC(nav);
        } else if (epubType === 'page-list') {
          navigation.pageList = this.parsePageList(nav);
        } else if (epubType === 'landmarks') {
          navigation.landmarks = this.parseLandmarks(nav);
        }
      });
      
      return navigation;
    } catch (error) {
      throw new Error(`Failed to parse navigation document: ${error.message}`);
    }
  }

  static parseTOC(navElement) {
    const olElement = XMLParser.findElementByTagName(navElement, 'ol');
    if (!olElement) {
      return new TOCItem('root', '', '', 0, 0);
    }

    const tocRoot = new TOCItem('root', '', '', 0, 0);
    const liElements = XMLParser.findElementsByTagName(olElement, 'li');
    
    liElements.forEach((liElement, index) => {
      const tocItem = this.parseListItem(liElement, index);
      if (tocItem) {
        tocRoot.addChild(tocItem);
      }
    });
    
    return tocRoot;
  }

  static parseListItem(liElement, order = 0, level = 0) {
    // 查找链接元素
    const linkElement = liElement.querySelector('a[href]') || 
                       XMLParser.findElementByTagName(liElement, 'a');
    
    let href = '';
    let title = '';
    let id = '';
    
    if (linkElement) {
      href = XMLParser.getAttributeValue(linkElement, 'href') || '';
      title = XMLParser.getElementText(linkElement).trim();
      id = XMLParser.getAttributeValue(linkElement, 'id') || '';
    }
    
    if (!href) {
      return null;
    }
    
    const tocItem = new TOCItem(id || `item-${order}`, title, href, order, level);
    
    // 查找子列表
    const childOlElement = XMLParser.findElementByTagName(liElement, 'ol');
    if (childOlElement) {
      const childLiElements = XMLParser.findElementsByTagName(childOlElement, 'li');
      childLiElements.forEach((childLi, index) => {
        const childItem = this.parseListItem(childLi, index, level + 1);
        if (childItem) {
          tocItem.addChild(childItem);
        }
      });
    }
    
    return tocItem;
  }

  static parsePageList(navElement) {
    const olElement = XMLParser.findElementByTagName(navElement, 'ol');
    if (!olElement) {
      return [];
    }

    const pageList = [];
    const liElements = XMLParser.findElementsByTagName(olElement, 'li');
    
    liElements.forEach(liElement => {
      const linkElement = XMLParser.findElementByTagName(liElement, 'a');
      
      if (!linkElement) return;
      
      const href = XMLParser.getAttributeValue(linkElement, 'href') || '';
      const title = XMLParser.getElementText(linkElement).trim();
      const type = XMLParser.getAttributeValue(linkElement, 'type') || 'normal';
      
      if (href) {
        pageList.push({
          href,
          title,
          type
        });
      }
    });
    
    return pageList;
  }

  static parseLandmarks(navElement) {
    const olElement = XMLParser.findElementByTagName(navElement, 'ol');
    if (!olElement) {
      return [];
    }

    const landmarks = [];
    const liElements = XMLParser.findElementsByTagName(olElement, 'li');
    
    liElements.forEach(liElement => {
      const linkElement = XMLParser.findElementByTagName(liElement, 'a');
      
      if (!linkElement) return;
      
      const href = XMLParser.getAttributeValue(linkElement, 'href') || '';
      const title = XMLParser.getElementText(linkElement).trim();
      const type = XMLParser.getAttributeValue(linkElement, 'epub:type') || 
                   XMLParser.getAttributeValue(linkElement, 'type') || '';
      
      if (href) {
        landmarks.push({
          href,
          title,
          type
        });
      }
    });
    
    return landmarks;
  }

  static isNavigationDocument(xmlString) {
    // 检查是否是EPUB3导航文档
    return xmlString.includes('epub:type="toc"') || 
           xmlString.includes('nav epub:type') ||
           (xmlString.includes('<nav') && xmlString.includes('<html'));
  }
}

export default NavigationParser;