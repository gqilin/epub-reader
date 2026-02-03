// JSZip兼容性包装器
import JSZip from 'jszip';

// 环境检测工具
class EnvironmentDetector {
  static detectEnvironment() {
    const env = {
      isBrowser: typeof window !== 'undefined',
      isNode: typeof process !== 'undefined' && process.versions?.node,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      hasArrayBuffer: typeof ArrayBuffer !== 'undefined',
      hasUint8Array: typeof Uint8Array !== 'undefined',
      hasPromise: typeof Promise !== 'undefined',
      hasBlob: typeof Blob !== 'undefined',
      jszipVersion: '',
      memory: 0
    };

    // 获取JSZip版本
    try {
      env.jszipVersion = (JSZip as any).version || 'unknown';
    } catch (e) {
      env.jszipVersion = 'error';
    }

    // 获取内存信息（如果可用）
    if (env.isBrowser && 'memory' in performance) {
      env.memory = (performance as any).memory?.usedJSHeapSize || 0;
    }

    return env;
  }

  static logEnvironmentInfo() {
    const env = this.detectEnvironment();
    console.group('🔍 JSZip环境检测信息');
    console.log('环境类型:', env.isBrowser ? '浏览器' : (env.isNode ? 'Node.js' : '未知'));
    console.log('User Agent:', env.userAgent);
    console.log('ArrayBuffer支持:', env.hasArrayBuffer);
    console.log('Uint8Array支持:', env.hasUint8Array);
    console.log('Promise支持:', env.hasPromise);
    console.log('Blob支持:', env.hasBlob);
    console.log('JSZip版本:', env.jszipVersion);
    console.log('内存使用:', env.memory ? `${(env.memory / 1024 / 1024).toFixed(2)}MB` : '不可用');
    console.groupEnd();
  }

  static checkCompatibility(): string[] {
    const issues: string[] = [];
    const env = this.detectEnvironment();

    if (!env.hasArrayBuffer) {
      issues.push('ArrayBuffer不支持 - 需要现代浏览器');
    }
    if (!env.hasUint8Array) {
      issues.push('Uint8Array不支持 - 需要现代浏览器');
    }
    if (!env.hasPromise) {
      issues.push('Promise不支持 - 需要现代浏览器或polyfill');
    }

    // 检查浏览器版本（基于User Agent）
    if (env.isBrowser) {
      const ua = env.userAgent.toLowerCase();
      
      // Chrome检测
      if (ua.includes('chrome')) {
        const match = ua.match(/chrome\/(\d+)/);
        if (match && parseInt(match[1]) < 80) {
          issues.push('Chrome版本过低，需要80+版本');
        }
      }
      // Firefox检测
      else if (ua.includes('firefox')) {
        const match = ua.match(/firefox\/(\d+)/);
        if (match && parseInt(match[1]) < 75) {
          issues.push('Firefox版本过低，需要75+版本');
        }
      }
      // Safari检测
      else if (ua.includes('safari') && !ua.includes('chrome')) {
        const match = ua.match(/version\/(\d+)/);
        if (match && parseInt(match[1]) < 13) {
          issues.push('Safari版本过低，需要13+版本');
        }
      }
      // Edge检测
      else if (ua.includes('edg')) {
        const match = ua.match(/edg\/(\d+)/);
        if (match && parseInt(match[1]) < 80) {
          issues.push('Edge版本过低，需要80+版本');
        }
      }
    }

    return issues;
  }
}

// 确保在浏览器环境中正常工作
if (typeof window !== 'undefined' && typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

export class JSZipWrapper {
  private static debugMode = true;

  static enableDebug(enabled: boolean) {
    this.debugMode = enabled;
  }

  private static log(message: string, data?: any) {
    if (this.debugMode) {
      if (data) {
        console.log(`📦 JSZipWrapper: ${message}`, data);
      } else {
        console.log(`📦 JSZipWrapper: ${message}`);
      }
    }
  }

  private static warn(message: string, data?: any) {
    if (this.debugMode) {
      if (data) {
        console.warn(`⚠️ JSZipWrapper: ${message}`, data);
      } else {
        console.warn(`⚠️ JSZipWrapper: ${message}`);
      }
    }
  }

  private static error(message: string, data?: any) {
    console.error(`❌ JSZipWrapper: ${message}`, data);
  }

  static async loadAsync(data: Uint8Array | ArrayBuffer | Blob): Promise<JSZip> {
    this.log('开始加载EPUB数据');
    
    // 环境检测和兼容性检查
    EnvironmentDetector.logEnvironmentInfo();
    const compatibilityIssues = EnvironmentDetector.checkCompatibility();
    if (compatibilityIssues.length > 0) {
      this.warn('发现兼容性问题:', compatibilityIssues);
    }

    let processedData: Uint8Array;
    
    // 标准化数据格式
    this.log('处理输入数据类型:', typeof data);
    
    if (data instanceof Blob) {
      this.log('检测到Blob数据，转换为ArrayBuffer');
      this.log('Blob信息:', {
        size: data.size,
        type: data.type
      });
      data = await data.arrayBuffer();
    }
    
    if (data instanceof ArrayBuffer) {
      this.log('ArrayBuffer数据，大小:', data.byteLength);
      processedData = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
      this.log('Uint8Array数据，长度:', data.length);
      processedData = data;
    } else {
      const error = new Error(`不支持的数据类型: ${typeof data}`);
      this.error('数据类型不支持', { type: typeof data, data });
      throw error;
    }

    // 检查数据大小
    const dataSize = processedData.length;
    this.log('处理后的数据大小:', `${(dataSize / 1024 / 1024).toFixed(2)}MB`);
    
    if (dataSize === 0) {
      const error = new Error('数据为空');
      this.error('数据为空');
      throw error;
    }

    // 尝试多种加载方式
    let lastError: Error | null = null;
    
    // 方法1: 直接导入的JSZip
    try {
      this.log('尝试方法1: 使用默认导入的JSZip');
      this.log('JSZip构造函数状态:', typeof JSZip);
      this.log('JSZip实例创建测试...');
      
      const testZip = new JSZip();
      this.log('JSZip实例创建成功');
      
      const result = await JSZip.loadAsync(processedData);
      this.log('方法1成功加载EPUB文件');
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      this.warn('方法1失败', lastError);
    }
    
    // 方法2: 动态导入JSZip
    try {
      this.log('尝试方法2: 动态导入JSZip');
      const freshJSZip = (await import('jszip')).default;
      this.log('动态导入JSZip成功');
      
      const result = await freshJSZip.loadAsync(processedData);
      this.log('方法2成功加载EPUB文件');
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      this.warn('方法2失败', lastError);
    }
    
    // 方法3: 创建新实例
    try {
      this.log('尝试方法3: 创建新的JSZip实例');
      const newZip = new JSZip();
      
      this.log('使用新实例加载...');
      await newZip.loadAsync(processedData);
      this.log('方法3成功加载EPUB文件');
      return newZip;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      this.warn('方法3失败', lastError);
    }

    // 所有方法都失败
    this.error('所有JSZip加载方法都失败了', {
      lastError: lastError?.message,
      dataSize: processedData.length,
      compatibilityIssues
    });
    
    // 生成详细的错误信息
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