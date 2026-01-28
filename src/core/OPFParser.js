import XMLParser from '../utils/XMLParser.js';

class OPFParser {
  static async parse(xmlString) {
    try {
      const xmlDoc = await XMLParser.parseXML(xmlString);
      const packageElement = xmlDoc.documentElement;
      
      if (packageElement.tagName !== 'package') {
        throw new Error('Invalid OPF file: root element must be "package"');
      }

      const version = XMLParser.getAttributeValue(packageElement, 'version') || '2.0';
      const uniqueIdentifier = XMLParser.getAttributeValue(packageElement, 'unique-identifier');

      // 解析metadata
      const metadata = this.parseMetadata(packageElement, uniqueIdentifier);
      
      // 解析manifest
      const manifest = this.parseManifest(packageElement);
      
      // 解析spine
      const spine = this.parseSpine(packageElement);
      
      // 解析guide (可选)
      const guide = this.parseGuide(packageElement);

      return {
        version,
        uniqueIdentifier,
        metadata,
        manifest,
        spine,
        guide
      };
    } catch (error) {
      throw new Error(`Failed to parse OPF file: ${error.message}`);
    }
  }

  static parseMetadata(packageElement, uniqueIdentifier) {
    const metadataElement = XMLParser.findElementByTagName(packageElement, 'metadata');
    if (!metadataElement) {
      throw new Error('OPF file missing metadata element');
    }

    const metadata = {};
    
    // 处理所有子元素
    Array.from(metadataElement.children).forEach(child => {
      const tagName = child.tagName;
      const attributes = {};
      
      // 收集属性
      if (child.attributes) {
        for (let i = 0; i < child.attributes.length; i++) {
          const attr = child.attributes[i];
          attributes[attr.name] = attr.value;
        }
      }
      
      const textContent = XMLParser.getElementText(child).trim();
      
      // 处理meta元素
      if (tagName === 'meta') {
        const name = attributes.name || attributes.property || '';
        const content = attributes.content || textContent;
        
        if (name) {
          if (metadata.meta) {
            metadata.meta[name] = content;
          } else {
            metadata.meta = { [name]: content };
          }
        }
      } else {
        // 处理其他元数据元素
        if (metadata[tagName]) {
          if (!Array.isArray(metadata[tagName])) {
            metadata[tagName] = [metadata[tagName]];
          }
          metadata[tagName].push(textContent);
        } else {
          metadata[tagName] = textContent;
        }
        
        // 保存属性信息
        if (Object.keys(attributes).length > 0) {
          const attrKey = `${tagName}_attributes`;
          metadata[attrKey] = attributes;
        }
      }
    });

    return metadata;
  }

  static parseManifest(packageElement) {
    const manifestElement = XMLParser.findElementByTagName(packageElement, 'manifest');
    if (!manifestElement) {
      throw new Error('OPF file missing manifest element');
    }

    const manifest = {};
    const items = XMLParser.findElementsByTagName(manifestElement, 'item');
    
    items.forEach(item => {
      const id = XMLParser.getAttributeValue(item, 'id');
      const href = XMLParser.getAttributeValue(item, 'href');
      const mediaType = XMLParser.getAttributeValue(item, 'media-type');
      
      if (!id || !href || !mediaType) {
        console.warn('Manifest item missing required attributes');
        return;
      }
      
      manifest[id] = {
        id,
        href,
        mediaType,
        properties: XMLParser.getAttributeValue(item, 'properties') || '',
        mediaOverlay: XMLParser.getAttributeValue(item, 'media-overlay') || null,
        fallback: XMLParser.getAttributeValue(item, 'fallback') || null
      };
    });
    
    return manifest;
  }

  static parseSpine(packageElement) {
    const spineElement = XMLParser.findElementByTagName(packageElement, 'spine');
    if (!spineElement) {
      throw new Error('OPF file missing spine element');
    }

    const spine = [];
    const toc = XMLParser.getAttributeValue(spineElement, 'toc');
    const pageProgressionDirection = XMLParser.getAttributeValue(spineElement, 'page-progression-direction');
    
    const itemrefs = XMLParser.findElementsByTagName(spineElement, 'itemref');
    
    itemrefs.forEach((itemref, index) => {
      const idref = XMLParser.getAttributeValue(itemref, 'idref');
      const linear = XMLParser.getAttributeValue(itemref, 'linear') !== 'no';
      const properties = XMLParser.getAttributeValue(itemref, 'properties') || '';
      
      if (!idref) {
        console.warn('Spine itemref missing idref attribute');
        return;
      }
      
      spine.push({
        idref,
        linear,
        properties,
        order: index
      });
    });
    
    return {
      items: spine,
      toc,
      pageProgressionDirection
    };
  }

  static parseGuide(packageElement) {
    const guideElement = XMLParser.findElementByTagName(packageElement, 'guide');
    if (!guideElement) {
      return null;
    }

    const guide = [];
    const references = XMLParser.findElementsByTagName(guideElement, 'reference');
    
    references.forEach(reference => {
      const type = XMLParser.getAttributeValue(reference, 'type');
      const title = XMLParser.getAttributeValue(reference, 'title');
      const href = XMLParser.getAttributeValue(reference, 'href');
      
      if (type && href) {
        guide.push({
          type,
          title: title || '',
          href
        });
      }
    });
    
    return guide;
  }
}

export default OPFParser;