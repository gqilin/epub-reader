/**
 * 路径解析工具类
 */
export default class PathResolver {
  private basePath: string;

  constructor(basePath: string = '') {
    this.basePath = basePath;
  }

  /**
   * 解析相对路径为绝对路径
   * @param path 要解析的路径
   * @returns 解析后的路径
   */
  resolve(path: string): string {
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

  /**
   * 获取路径的目录部分
   * @param path 文件路径
   * @returns 目录路径
   */
  getDirectory(path: string): string {
    const parts = path.split('/');
    parts.pop(); // 移除文件名
    return parts.join('/');
  }

  /**
   * 获取路径的文件名部分
   * @param path 文件路径
   * @returns 文件名
   */
  getFileName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1];
  }

  /**
   * 获取文件扩展名
   * @param path 文件路径
   * @returns 扩展名（小写）
   */
  getFileExtension(path: string): string {
    const fileName = this.getFileName(path);
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * 检查是否为相对路径
   * @param path 路径
   * @returns 是否为相对路径
   */
  isRelative(path: string): boolean {
    return !path.startsWith('/') && 
           !path.startsWith('http://') && 
           !path.startsWith('https://');
  }

  /**
   * 标准化路径分隔符
   * @param path 原始路径
   * @returns 标准化后的路径
   */
  normalize(path: string): string {
    // 标准化路径分隔符
    return path.replace(/\\/g, '/');
  }

  /**
   * 连接多个路径段
   * @param paths 路径段
   * @returns 连接后的路径
   */
  join(...paths: string[]): string {
    return paths
      .filter(path => path && path !== '.')
      .map(path => path.replace(/\/$/, '')) // 移除末尾的/
      .join('/');
  }

  /**
   * 创建PathResolver实例
   * @param basePath 基础路径
   * @returns PathResolver实例
   */
  static create(basePath: string): PathResolver {
    return new PathResolver(basePath);
  }
}