import JSZip from 'jszip';

/**
 * ZIP文件读取工具类
 */
export default class ZipReader {
  private zip: JSZip | null = null;
  private entries: Map<string, JSZip.JSZipObject> = new Map();

  /**
   * 加载ZIP文件
   * @param data ZIP文件数据（ArrayBuffer或Blob）
   * @returns 当前实例（支持链式调用）
   */
  async load(data: ArrayBuffer | Blob): Promise<ZipReader> {
    try {
      if (data instanceof ArrayBuffer) {
        this.zip = await JSZip.loadAsync(data);
      } else if (data instanceof Blob) {
        const arrayBuffer = await data.arrayBuffer();
        this.zip = await JSZip.loadAsync(arrayBuffer);
      } else {
        throw new Error('Unsupported data type. Expected ArrayBuffer or Blob.');
      }

      // 缓存文件条目
      this.zip.forEach((relativePath: string, file: JSZip.JSZipObject) => {
        this.entries.set(relativePath, file);
      });

      return this;
    } catch (error) {
      throw new Error(`Failed to load ZIP file: ${(error as Error).message}`);
    }
  }

  /**
   * 获取文件文本内容
   * @param path 文件路径
   * @returns 文件文本内容
   */
  async getFileText(path: string): Promise<string> {
    const file = this.entries.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }

    try {
      return await file.async('text');
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * 获取文件二进制内容
   * @param path 文件路径
   * @returns 文件二进制内容
   */
  async getFileBinary(path: string): Promise<ArrayBuffer> {
    const file = this.entries.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }

    try {
      return await file.async('arraybuffer');
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * 获取文件Base64内容
   * @param path 文件路径
   * @returns 文件Base64内容
   */
  async getFileBase64(path: string): Promise<string> {
    const file = this.entries.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }

    try {
      return await file.async('base64');
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * 检查文件是否存在
   * @param path 文件路径
   * @returns 文件是否存在
   */
  hasFile(path: string): boolean {
    return this.entries.has(path);
  }

  /**
   * 列出所有文件
   * @returns 文件路径数组
   */
  listFiles(): string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * 获取文件大小
   * @param path 文件路径
   * @returns 文件大小（字节）
   */
  getFileSize(path: string): number {
    const file = this.entries.get(path);
    return file ? (file as any)._data?.uncompressedSize || 0 : 0;
  }

  /**
   * 获取文件MIME类型
   * @param path 文件路径
   * @returns MIME类型
   */
  getFileMimeType(path: string): string {
    const file = this.entries.get(path);
    if (!file) return null;
    
    // JSZip doesn't store original MIME type, infer from extension
    const extension = path.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'xhtml': 'application/xhtml+xml',
      'html': 'text/html',
      'htm': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'otf': 'font/otf',
      'ttf': 'font/ttf',
      'woff': 'font/woff',
      'woff2': 'font/woff2'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * 销毁实例，释放资源
   */
  destroy(): void {
    this.entries.clear();
    this.zip = null;
  }
}