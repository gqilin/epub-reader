/**
 * MIME类型检查工具类
 */
export default class MimeTypeChecker {
  private static readonly MIME_TYPES: Record<string, string> = {
    'xhtml': 'application/xhtml+xml',
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'ncx': 'application/x-dtbncx+xml',
    'opf': 'application/oebps-package+xml',
    'nav': 'application/xhtml+xml',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'otf': 'font/otf',
    'ttf': 'font/ttf',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'eot': 'application/vnd.ms-fontobject',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'pdf': 'application/pdf',
    'epub': 'application/epub+zip'
  };

  /**
   * 根据扩展名获取MIME类型
   * @param extension 文件扩展名
   * @returns MIME类型
   */
  static getMimeTypeFromExtension(extension: string): string {
    return this.MIME_TYPES[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * 根据文件名获取MIME类型
   * @param fileName 文件名
   * @returns MIME类型
   */
  static getMimeTypeFromFileName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return this.getMimeTypeFromExtension(extension);
  }

  /**
   * 检查是否为XHTML文件
   * @param fileName 文件名
   * @returns 是否为XHTML
   */
  static isXHTML(fileName: string): boolean {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType === 'application/xhtml+xml';
  }

  /**
   * 检查是否为HTML文件
   * @param fileName 文件名
   * @returns 是否为HTML
   */
  static isHTML(fileName: string): boolean {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType === 'text/html';
  }

  /**
   * 检查是否为CSS文件
   * @param fileName 文件名
   * @returns 是否为CSS
   */
  static isCSS(fileName: string): boolean {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType === 'text/css';
  }

  /**
   * 检查是否为图片文件
   * @param fileName 文件名
   * @returns 是否为图片
   */
  static isImage(fileName: string): boolean {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType.startsWith('image/');
  }

  /**
   * 检查是否为字体文件
   * @param fileName 文件名
   * @returns 是否为字体
   */
  static isFont(fileName: string): boolean {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType.startsWith('font/') || 
           mimeType === 'application/vnd.ms-fontobject';
  }

  /**
   * 检查是否为音频文件
   * @param fileName 文件名
   * @returns 是否为音频
   */
  static isAudio(fileName: string): boolean {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType.startsWith('audio/');
  }

  /**
   * 检查是否为视频文件
   * @param fileName 文件名
   * @returns 是否为视频
   */
  static isVideo(fileName: string): boolean {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType.startsWith('video/');
  }

  /**
   * 检查是否为文档文件
   * @param fileName 文件名
   * @returns 是否为文档
   */
  static isDocument(fileName: string): boolean {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return ['application/xhtml+xml', 'text/html', 'text/css'].includes(mimeType);
  }

  /**
   * 检查是否为EPUB文件
   * @param fileName 文件名
   * @returns 是否为EPUB
   */
  static isEPUB(fileName: string): boolean {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType === 'application/epub+zip';
  }

  /**
   * 验证MIME类型是否匹配预期类型
   * @param fileName 文件名
   * @param expectedMimeType 预期的MIME类型
   * @returns 是否匹配
   */
  static validateMimeType(fileName: string, expectedMimeType: string): boolean {
    const actualMimeType = this.getMimeTypeFromFileName(fileName);
    return actualMimeType === expectedMimeType;
  }

  /**
   * 获取媒体类型分类
   * @param fileName 文件名
   * @returns 媒体类型分类
   */
  static getMediaTypeCategory(fileName: string): string {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('font/') || mimeType === 'application/vnd.ms-fontobject') return 'font';
    if (['application/xhtml+xml', 'text/html'].includes(mimeType)) return 'document';
    if (['text/css'].includes(mimeType)) return 'stylesheet';
    if (['application/javascript'].includes(mimeType)) return 'script';
    
    return 'other';
  }
}