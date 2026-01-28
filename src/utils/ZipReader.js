import JSZip from 'jszip';

class ZipReader {
  constructor() {
    this.zip = null;
    this.entries = new Map();
  }

  async load(data) {
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
      this.zip.forEach((relativePath, file) => {
        this.entries.set(relativePath, file);
      });

      return this;
    } catch (error) {
      throw new Error(`Failed to load ZIP file: ${error.message}`);
    }
  }

  async getFileText(path) {
    const file = this.entries.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }

    try {
      return await file.async('text');
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${error.message}`);
    }
  }

  async getFileBinary(path) {
    const file = this.entries.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }

    try {
      return await file.async('arraybuffer');
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${error.message}`);
    }
  }

  async getFileBase64(path) {
    const file = this.entries.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }

    try {
      return await file.async('base64');
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${error.message}`);
    }
  }

  hasFile(path) {
    return this.entries.has(path);
  }

  listFiles() {
    return Array.from(this.entries.keys());
  }

  getFileSize(path) {
    const file = this.entries.get(path);
    return file ? file._data.uncompressedSize || 0 : 0;
  }

  getFileMimeType(path) {
    const file = this.entries.get(path);
    if (!file) return null;
    
    // JSZip doesn't store original MIME type, infer from extension
    const extension = path.split('.').pop().toLowerCase();
    const mimeTypes = {
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

  destroy() {
    this.entries.clear();
    this.zip = null;
  }
}

export default ZipReader;