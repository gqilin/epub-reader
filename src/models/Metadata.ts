import { EPUBMetadata } from '../types/index';

/**
 * EPUB元数据类
 */
export default class Metadata implements EPUBMetadata {
  title: string = '';
  creator: string = '';
  language: string = '';
  identifier: string = '';
  date: string = '';
  publisher: string = '';
  description: string = '';
  subject: string = '';
  rights: string = '';
  cover: string | null = null;
  custom: Record<string, any> = {};

  constructor() {
    // Default constructor
  }

  /**
   * 从OPF元数据创建Metadata实例
   * @param opfMetadata OPF元数据对象
   * @returns Metadata实例
   */
  static fromOPFMetadata(opfMetadata: Record<string, any>): Metadata {
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
        (metadata as any)[field] = Array.isArray(opfMetadata[key]) 
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