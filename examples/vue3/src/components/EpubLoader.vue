<template>
  <div class="epub-loader">
    <div class="upload-area" 
         :class="{ 'drag-over': isDragOver }"
         @drop="handleDrop"
         @dragover.prevent="isDragOver = true"
         @dragleave="isDragOver = false"
         @dragenter.prevent="isDragOver = true"
         @click="triggerFileInput">
      
      <div class="upload-icon">📚</div>
      <h2>Load EPUB File</h2>
      <p>Click to select or drag and drop an EPUB file</p>
      
      <input 
        ref="fileInput"
        type="file" 
        accept=".epub"
        @change="handleFileSelect"
        style="display: none;"
      />
    </div>
    
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading EPUB...</p>
    </div>
    
    <div v-if="error" class="error">
      <div class="error-content">
        <div class="error-icon">❌</div>
        <div class="error-message" v-html="formatError(error)"></div>
      </div>
      <div class="error-actions">
        <button @click="error = ''" class="retry-btn">重试</button>
        <button @click="showDebugInfo" class="debug-btn">调试信息</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { EpubReader } from 'epub-reader-src';

interface Props {
  toolbarElementId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  toolbarElementId: 'epub-marking-toolbar'
});

const emit = defineEmits<{
  loaded: [reader: EpubReader];
}>();

const fileInput = ref<HTMLInputElement>();
const loading = ref(false);
const error = ref('');
const isDragOver = ref(false);

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (file) {
    await loadEpub(file);
  }
};

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;
  
  const file = event.dataTransfer?.files[0];
  if (file && file.type === 'application/epub+zip') {
    await loadEpub(file);
  } else {
    error.value = 'Please drop a valid EPUB file';
  }
};

const loadEpub = async (file: File) => {
  loading.value = true;
  error.value = '';
  
  try {
    // 文件类型检查
    if (!file.name.toLowerCase().endsWith('.epub')) {
      throw new Error('请选择EPUB格式的文件（文件扩展名为.epub）');
    }
    
    if (file.size === 0) {
      throw new Error('文件为空，请选择有效的EPUB文件');
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB
      throw new Error('文件过大（超过100MB），可能超出浏览器处理能力');
    }
    
    const readerOptions: any = {
      targetElementId: 'epub-viewer'
    };
    
    if (props.toolbarElementId) {
      readerOptions.toolbarElementId = props.toolbarElementId;
    }
    
    const reader = new EpubReader(readerOptions);
    await reader.load(file);
    emit('loaded', reader);
    
  } catch (err) {
    console.error('EPUB加载失败:', err);
    
    // 生成用户友好的错误信息
    let userError = '';
    if (err instanceof Error) {
      const errorMsg = err.message.toLowerCase();
      
      if (errorMsg.includes('不是epub格式') || errorMsg.includes('请选择epub')) {
        userError = '请选择有效的EPUB文件（文件扩展名应为.epub）';
      } else if (errorMsg.includes('文件为空')) {
        userError = '文件为空，请重新选择有效的EPUB文件';
      } else if (errorMsg.includes('文件过大')) {
        userError = '文件过大，请选择小于100MB的EPUB文件';
      } else if (errorMsg.includes('兼容性') || errorMsg.includes('removealllisteners')) {
        userError = '浏览器兼容性问题：<br><br>' +
                   '• 请使用最新版浏览器（Chrome 80+、Firefox 75+、Safari 13+、Edge 80+）<br>' +
                   '• 尝试清除浏览器缓存或使用无痕模式<br>' +
                   '• 检查浏览器控制台获取详细错误信息';
      } else if (errorMsg.includes('内存不足') || errorMsg.includes('memory')) {
        userError = '内存不足：<br><br>' +
                   '• 关闭其他浏览器标签页<br>' +
                   '• 尝试较小的EPUB文件<br>' +
                   '• 重启浏览器释放内存';
      } else if (errorMsg.includes('损坏') || errorMsg.includes('corrupt') || errorMsg.includes('invalid')) {
        userError = 'EPUB文件损坏：<br><br>' +
                   '• 重新下载EPUB文件<br>' +
                   '• 检查文件完整性<br>' +
                   '• 尝试用其他EPUB阅读器打开文件';
      } else {
        userError = `加载失败：${err.message}`;
      }
    } else {
      userError = '加载EPUB文件时发生未知错误';
    }
    
    error.value = userError;
  } finally {
    loading.value = false;
  }
};



const formatError = (error: string) => {
  return error.replace(/\n/g, '<br>');
};

const showDebugInfo = () => {
  const debugInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth
    },
    memory: (performance as any).memory ? {
      used: `${((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      total: `${((performance as any).memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      limit: `${((performance as any).memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
    } : '不可用',
    timestamp: new Date().toISOString()
  };
  
  console.group('🔍 调试信息');
  console.log('浏览器环境:', debugInfo);
  console.log('当前错误:', error.value);
  console.groupEnd();
  
  // 创建调试信息弹窗
  const debugContent = `
调试信息
==================
用户代理: ${debugInfo.userAgent}
平台: ${debugInfo.platform}
语言: ${debugInfo.language}
在线状态: ${debugInfo.onLine ? '在线' : '离线'}
屏幕分辨率: ${debugInfo.screen.width}x${debugInfo.screen.height}
内存使用: ${typeof debugInfo.memory === 'string' ? debugInfo.memory : 
          `已用: ${debugInfo.memory.used}, 总计: ${debugInfo.memory.total}, 限制: ${debugInfo.memory.limit}`}
时间戳: ${debugInfo.timestamp}

当前错误: ${error.value}

请将此信息提供给开发者进行问题排查。
  `;
  
  alert(debugContent);
};
</script>

<style scoped>
.epub-loader {
  max-width: 400px;
  margin: 2rem auto;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.upload-area:hover {
  border-color: #007bff;
  background: #f8f9ff;
}

.upload-area.drag-over {
  border-color: #007bff;
  background: #e3f2fd;
}

.upload-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.upload-area h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.upload-area p {
  margin: 0;
  color: #666;
}

.loading {
  text-align: center;
  margin-top: 2rem;
  padding: 2rem;
  background: white;
  border-radius: 8px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1rem;
  text-align: left;
}

.error-content {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.error-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.error-message {
  color: #c00;
  line-height: 1.5;
  flex: 1;
}

.error-message :deep(br) {
  margin-bottom: 0.25rem;
}

.error-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.retry-btn, .debug-btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  font-size: 0.9rem;
}

.retry-btn {
  background: #007bff;
  color: white;
}

.retry-btn:hover {
  background: #0056b3;
}

.debug-btn {
  background: #6c757d;
  color: white;
}

.debug-btn:hover {
  background: #545b62;
}
</style>