// JSZip兼容性包装器
import JSZip from 'jszip';

// 环境检测工具
class EnvironmentDetector {
  static checkCompatibility(): string[] {
    const issues: string[] = [];
    
    if (typeof ArrayBuffer === 'undefined') {
      issues.push('ArrayBuffer不支持 - 需要现代浏览器');
    }
    if (typeof Uint8Array === 'undefined') {
      issues.push('Uint8Array不支持 - 需要现代浏览器');
    }
    if (typeof Promise === 'undefined') {
      issues.push('Promise不支持 - 需要现代浏览器或polyfill');
    }

    return issues;
  }
}

// 确保在浏览器环境中正常工作
if (typeof window !== 'undefined' && typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

export class JSZipWrapper {
  static async loadAsync(data: Uint8Array | ArrayBuffer | Blob): Promise<JSZip> {
    // 兼容性检查
    const compatibilityIssues = EnvironmentDetector.checkCompatibility();
    if (compatibilityIssues.length > 0) {
      console.warn('JSZip兼容性问题:', compatibilityIssues.join(', '));
    }

    let processedData: Uint8Array;
    
    // 标准化数据格式
    if (data instanceof Blob) {
      data = await data.arrayBuffer();
    }
    
    if (data instanceof ArrayBuffer) {
      processedData = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
      processedData = data;
    } else {
      throw new Error(`不支持的数据类型: ${typeof data}`);
    }

    // 检查数据大小
    if (processedData.length === 0) {
      throw new Error('数据为空');
    }

    // 尝试多种加载方式
    let lastError: Error | null = null;
    
    // 方法1: 直接导入的JSZip
    try {
      return await JSZip.loadAsync(processedData);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    
    // 方法2: 动态导入JSZip
    try {
      const freshJSZip = (await import('jszip')).default;
      return await freshJSZip.loadAsync(processedData);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    
    // 方法3: 创建新实例
    try {
      const newZip = new JSZip();
      await newZip.loadAsync(processedData);
      return newZip;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    // 所有方法都失败
    let errorMessage = '无法解析EPUB文件。';
    
    if (lastError) {
      const errorMsg = lastError.message.toLowerCase();
      
      if (errorMsg.includes('removealllisteners') || errorMsg.includes('eventemitter')) {
        errorMessage += '这通常是由于浏览器环境不兼容导致的。';
        errorMessage += '建议：1) 使用现代浏览器（Chrome 80+、Firefox 75+、Safari 13+、Edge 80+）；';
        errorMessage += '2) 清除浏览器缓存；';
        errorMessage += '3) 尝试无痕模式；';
        errorMessage += '4) 检查浏览器控制台详细错误。';
      } else if (errorMsg.includes('corrupt') || errorMsg.includes('invalid')) {
        errorMessage += 'EPUB文件可能已损坏或格式不正确。';
      } else if (errorMsg.includes('memory') || errorMsg.includes('out of memory')) {
        errorMessage += '内存不足，尝试较小的EPUB文件或关闭其他浏览器标签页。';
      } else {
        errorMessage += `详细错误: ${lastError.message}`;
      }
    }
    
    if (compatibilityIssues.length > 0) {
      errorMessage += ` 兼容性问题: ${compatibilityIssues.join(', ')}`;
    }
    
    throw new Error(errorMessage);
  }
}

export default JSZipWrapper;