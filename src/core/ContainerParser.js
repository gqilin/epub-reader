import XMLParser from '../utils/XMLParser.js';

class ContainerParser {
  static async parse(xmlString) {
    try {
      const xmlDoc = await XMLParser.parseXML(xmlString);
      const rootElement = xmlDoc.documentElement;
      
      if (rootElement.tagName !== 'container') {
        throw new Error('Invalid container file: root element must be "container"');
      }

      const rootfiles = XMLParser.findElementByTagName(rootElement, 'rootfiles');
      if (!rootfiles) {
        throw new Error('Invalid container file: missing "rootfiles" element');
      }

      const rootfile = XMLParser.findElementByTagName(rootfiles, 'rootfile');
      if (!rootfile) {
        throw new Error('Invalid container file: missing "rootfile" element');
      }

      const fullPath = XMLParser.getAttributeValue(rootfile, 'full-path');
      if (!fullPath) {
        throw new Error('Invalid container file: missing "full-path" attribute');
      }

      const mediaType = XMLParser.getAttributeValue(rootfile, 'media-type');
      if (mediaType && mediaType !== 'application/oebps-package+xml') {
        console.warn(`Unexpected media-type in container: ${mediaType}`);
      }

      return {
        fullPath: fullPath,
        mediaType: mediaType || 'application/oebps-package+xml',
        version: XMLParser.getAttributeValue(rootfile, 'version') || null
      };
    } catch (error) {
      throw new Error(`Failed to parse container.xml: ${error.message}`);
    }
  }
}

export default ContainerParser;