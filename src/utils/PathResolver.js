class PathResolver {
  constructor(basePath = '') {
    this.basePath = basePath;
  }

  resolve(path) {
    if (!path) return this.basePath;
    
    // 如果是绝对路径（以/开头），直接返回
    if (path.startsWith('/')) {
      return path.substring(1); // 移除开头的/
    }
    
    // 如果是URL，直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // 相对路径处理
    const basePathParts = this.basePath.split('/').filter(part => part);
    const pathParts = path.split('/').filter(part => part);
    
    // 处理 .. 和 .
    for (const part of pathParts) {
      if (part === '..') {
        basePathParts.pop();
      } else if (part !== '.') {
        basePathParts.push(part);
      }
    }
    
    return basePathParts.join('/');
  }

  getDirectory(path) {
    const parts = path.split('/');
    parts.pop(); // 移除文件名
    return parts.join('/');
  }

  getFileName(path) {
    const parts = path.split('/');
    return parts[parts.length - 1];
  }

  getFileExtension(path) {
    const fileName = this.getFileName(path);
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  isRelative(path) {
    return !path.startsWith('/') && 
           !path.startsWith('http://') && 
           !path.startsWith('https://');
  }

  normalize(path) {
    // 标准化路径分隔符
    return path.replace(/\\/g, '/');
  }

  join(...paths) {
    return paths
      .filter(path => path && path !== '.')
      .map(path => path.replace(/\/$/, '')) // 移除末尾的/
      .join('/');
  }

  static create(basePath) {
    return new PathResolver(basePath);
  }
}

export default PathResolver;