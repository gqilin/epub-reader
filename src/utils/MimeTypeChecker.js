class MimeTypeChecker {
  static MIME_TYPES = {
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

  static getMimeTypeFromExtension(extension) {
    return this.MIME_TYPES[extension.toLowerCase()] || 'application/octet-stream';
  }

  static getMimeTypeFromFileName(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    return this.getMimeTypeFromExtension(extension);
  }

  static isXHTML(fileName) {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType === 'application/xhtml+xml';
  }

  static isHTML(fileName) {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType === 'text/html';
  }

  static isCSS(fileName) {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType === 'text/css';
  }

  static isImage(fileName) {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType.startsWith('image/');
  }

  static isFont(fileName) {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType.startsWith('font/') || 
           mimeType === 'application/vnd.ms-fontobject';
  }

  static isAudio(fileName) {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType.startsWith('audio/');
  }

  static isVideo(fileName) {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType.startsWith('video/');
  }

  static isDocument(fileName) {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return ['application/xhtml+xml', 'text/html', 'text/css'].includes(mimeType);
  }

  static isEPUB(fileName) {
    const mimeType = this.getMimeTypeFromFileName(fileName);
    return mimeType === 'application/epub+zip';
  }

  static validateMimeType(fileName, expectedMimeType) {
    const actualMimeType = this.getMimeTypeFromFileName(fileName);
    return actualMimeType === expectedMimeType;
  }

  static getMediaTypeCategory(fileName) {
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

export default MimeTypeChecker;