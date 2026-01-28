class Metadata {
  constructor() {
    this.title = '';
    this.creator = '';
    this.language = '';
    this.identifier = '';
    this.date = '';
    this.publisher = '';
    this.description = '';
    this.subject = '';
    this.rights = '';
    this.cover = null;
    this.custom = {};
  }

  static fromOPFMetadata(opfMetadata) {
    const metadata = new Metadata();
    
    if (opfMetadata['dc:title']) {
      metadata.title = Array.isArray(opfMetadata['dc:title']) 
        ? opfMetadata['dc:title'][0] 
        : opfMetadata['dc:title'];
    }
    
    if (opfMetadata['dc:creator']) {
      metadata.creator = Array.isArray(opfMetadata['dc:creator'])
        ? opfMetadata['dc:creator'][0]
        : opfMetadata['dc:creator'];
    }
    
    ['language', 'identifier', 'date', 'publisher', 'description', 'subject', 'rights'].forEach(field => {
      const key = `dc:${field}`;
      if (opfMetadata[key]) {
        metadata[field] = Array.isArray(opfMetadata[key]) 
          ? opfMetadata[key][0] 
          : opfMetadata[key];
      }
    });

    // 处理自定义元数据
    Object.keys(opfMetadata).forEach(key => {
      if (!key.startsWith('dc:') && key !== 'meta') {
        metadata.custom[key] = opfMetadata[key];
      }
    });

    return metadata;
  }
}

export default Metadata;