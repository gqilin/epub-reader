<template>
  <div class="epub-viewer">
    <div class="viewer-header">
      <button @click="onPreviousChapter" :disabled="!hasPreviousChapter" class="nav-btn">
        ← Previous
      </button>
      
      <select v-model="currentChapterIndex" class="chapter-select" @change="onChapterChange">
        <option v-for="(chapter, index) in chapters" :key="chapter.id" :value="index">
          {{ getChapterTitle(chapter, index) }}
        </option>
      </select>
      
      <button @click="onNextChapter" :disabled="!hasNextChapter" class="nav-btn">
        Next →
      </button>
      
      <!-- 标记控制按钮 -->
      <div class="annotation-controls">
        <button @click="toggleAnnotations" class="annotation-toggle" :class="{ active: annotationsEnabled }">
          📝 标记
        </button>
        <button @click="showAnnotationList" class="annotation-list-btn" v-if="annotationsEnabled">
          📋 列表
        </button>
      </div>
    </div>
    
    <div class="content-container">
      <!-- 章节内容现在由父组件App.vue提供 -->
      <!-- 章节内容容器，始终存在但为空 -->
      <div id="epub-chapter-container" class="chapter-render-area"></div>
    </div>
    
    <!-- 标记工具栏 -->
    <div id="annotation-toolbar" class="annotation-toolbar">
      <button @click="createHighlight" class="tool-btn" title="高亮">
        🟨 高亮
      </button>
      <button @click="createUnderline" class="tool-btn" title="下划线">
        U̲ 下划线
      </button>
      <button @click="createNote" class="tool-btn" title="笔记">
        📝 笔记
      </button>
      <button @click="createBookmark" class="tool-btn" title="书签">
        🔖 书签
      </button>
    </div>
    
    <!-- 标记列表弹窗 -->
    <div v-if="showAnnotationModal" class="annotation-modal" @click.self="closeAnnotationModal">
      <div class="annotation-modal-content">
        <div class="annotation-modal-header">
          <h3>标记列表</h3>
          <button @click="closeAnnotationModal" class="close-btn">×</button>
        </div>
        <div class="annotation-modal-body">
          <div v-if="annotations.length === 0" class="no-annotations">
            暂无标记
          </div>
          <div v-else class="annotation-list">
            <div v-for="annotation in annotations" :key="annotation.id" class="annotation-item">
              <div class="annotation-type">
                <span :class="['type-icon', annotation.type]">{{ getAnnotationIcon(annotation.type) }}</span>
                <span class="type-text">{{ getAnnotationTypeName(annotation.type) }}</span>
              </div>
              <div class="annotation-text">{{ annotation.text.substring(0, 100) }}{{ annotation.text.length > 100 ? '...' : '' }}</div>
              <div v-if="annotation.note" class="annotation-note">📝 {{ annotation.note }}</div>
              <div class="annotation-actions">
                <button @click="jumpToAnnotation(annotation)" class="action-btn">跳转</button>
                <button @click="removeAnnotation(annotation.id)" class="action-btn delete">删除</button>
              </div>
            </div>
          </div>
        </div>
        <div class="annotation-modal-footer">
          <button @click="exportAnnotations" class="export-btn">导出标记</button>
          <button @click="importAnnotations" class="import-btn">导入标记</button>
        </div>
      </div>
    </div>
    
    <div class="viewer-footer">
      <span>Chapter {{ currentChapterIndex + 1 }} of {{ chapters.length }}</span>
      <span v-if="annotationsEnabled && annotations.length > 0" class="annotation-count">
        ({{ annotations.length }} 个标记)
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { EpubReader, EpubChapter, Annotation, AnnotationType } from 'epub-reader-src';

interface Props {
  reader: EpubReader;
}

const props = defineProps<Props>();

const chapters = ref<EpubChapter[]>(props.reader.getChapters());
const currentChapterIndex = ref(props.reader.getCurrentChapterIndex());
const hasPreviousChapter = ref(props.reader.hasPreviousChapter());
const hasNextChapter = ref(props.reader.hasNextChapter());

// 标记功能相关状态
const annotationsEnabled = ref(false);
const showAnnotationModal = ref(false);
const annotations = ref<Annotation[]>([]);

// 计算当前章节的标记
const currentAnnotations = computed(() => {
  const currentChapter = chapters.value[currentChapterIndex.value];
  return annotations.value.filter(ann => ann.chapterId === currentChapter?.id);
});

const onPreviousChapter = async () => {
  if (!props.reader.hasPreviousChapter()) return;
  
  try {
    await props.reader.previousChapter({
      showLoading: true,
      onError: (error) => {
        console.error('上一章加载失败:', error);
      },
      onSuccess: () => {
        updateNavigationState();
      }
    });
  } catch (error) {
    console.error('Failed to load previous chapter:', error);
  }
};

const onNextChapter = async () => {
  if (!props.reader.hasNextChapter()) return;
  
  try {
    await props.reader.nextChapter({
      showLoading: true,
      onError: (error) => {
        console.error('下一章加载失败:', error);
      },
      onSuccess: () => {
        updateNavigationState();
      }
    });
  } catch (error) {
    console.error('Failed to load next chapter:', error);
  }
};

const onChapterChange = async () => {
  try {
    await props.reader.loadChapterByIndex(currentChapterIndex.value, {
      showLoading: true,
      onError: (error) => {
        console.error('章节加载失败:', error);
      },
      onSuccess: () => {
        updateNavigationState();
      }
    });
  } catch (error) {
    console.error('Failed to load chapter:', error);
  }
};

const getChapterTitle = (chapter: EpubChapter, index: number): string => {
  const toc = props.reader.getTableOfContents();
  const tocItem = toc.find(item => item.href.includes(chapter.href.split('/').pop() || ''));
  return tocItem?.title || `Chapter ${index + 1}`;
};

const onRenderError = (event: Event) => {
  console.error('Rendering error:', event);
};

const updateNavigationState = () => {
  currentChapterIndex.value = props.reader.getCurrentChapterIndex();
  hasPreviousChapter.value = props.reader.hasPreviousChapter();
  hasNextChapter.value = props.reader.hasNextChapter();
  
  // 更新标记列表
  if (annotationsEnabled.value) {
    loadAnnotations();
  }
};

// CFI相关方法
const jumpToCFI = async (cfi: string) => {
  try {
    await props.reader.jumpToCFI(cfi, {
      showLoading: true,
      highlightTarget: true,
      highlightDuration: 3000,
      scrollBehavior: 'smooth',
      onError: (error) => {
        console.error('CFI跳转失败:', error);
      },
      onSuccess: () => {
        console.log('CFI跳转成功:', cfi);
      }
    });
  } catch (error) {
    console.error('CFI跳转异常:', error);
  }
};

const getCurrentCFI = () => {
  try {
    const cfi = props.reader.generateCFI();
    console.log('当前CFI:', cfi);
    return cfi;
  } catch (error) {
    console.error('生成CFI失败:', error);
    return null;
  }
};

const getCurrentCFICursor = () => {
  try {
    const cursor = props.reader.getCurrentCFICursor();
    console.log('当前CFI光标:', cursor);
    return cursor;
  } catch (error) {
    console.error('获取CFI光标失败:', error);
    return null;
  }
};

// 确保DOM元素存在并清理样式
onUnmounted(() => {
  const styleElement = document.getElementById('epub-chapter-styles');
  if (styleElement) {
    document.head.removeChild(styleElement);
  }
});

// ==================== 标记功能方法 ====================

/**
 * 初始化标记功能
 */
const initializeAnnotations = () => {
  if (!annotationsEnabled.value) return;
  
  props.reader.setupAnnotations({
    containerId: 'epub-chapter-container',
    toolbarId: 'annotation-toolbar',
    onAnnotationCreated: handleAnnotationCreated,
    onAnnotationRemoved: handleAnnotationRemoved,
    onAnnotationUpdated: handleAnnotationUpdated
  });
  
  loadAnnotations();
};

/**
 * 加载标记列表
 */
const loadAnnotations = () => {
  annotations.value = props.reader.getAnnotations();
};

/**
 * 切换标记功能
 */
const toggleAnnotations = () => {
  annotationsEnabled.value = !annotationsEnabled.value;
  
  if (annotationsEnabled.value) {
    initializeAnnotations();
  } else {
    // 禁用标记功能，可以在这里添加清理逻辑
  }
};

/**
 * 创建高亮标记
 */
const createHighlight = async () => {
  try {
    await props.reader.createAnnotationFromSelection('highlight', { color: '#ffeb3b' });
  } catch (error) {
    console.error('创建高亮失败:', error);
    alert('创建高亮失败: ' + (error instanceof Error ? error.message : String(error)));
  }
};

/**
 * 创建下划线标记
 */
const createUnderline = async () => {
  try {
    await props.reader.createAnnotationFromSelection('underline', { color: '#2196f3' });
  } catch (error) {
    console.error('创建下划线失败:', error);
    alert('创建下划线失败: ' + (error instanceof Error ? error.message : String(error)));
  }
};

/**
 * 创建笔记标记
 */
const createNote = async () => {
  const note = prompt('请输入笔记内容：');
  if (note) {
    try {
      await props.reader.createAnnotationFromSelection('note', { note, color: '#4caf50' });
    } catch (error) {
      console.error('创建笔记失败:', error);
      alert('创建笔记失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
};

/**
 * 创建书签标记
 */
const createBookmark = async () => {
  try {
    await props.reader.createAnnotationFromSelection('bookmark', { color: '#ff9800' });
  } catch (error) {
    console.error('创建书签失败:', error);
    alert('创建书签失败: ' + (error instanceof Error ? error.message : String(error)));
  }
};

/**
 * 移除标记
 */
const removeAnnotation = async (id: string) => {
  if (confirm('确定要删除这个标记吗？')) {
    try {
      await props.reader.removeAnnotation(id);
      loadAnnotations(); // 重新加载列表
    } catch (error) {
      console.error('删除标记失败:', error);
      alert('删除标记失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
};

/**
 * 跳转到标记位置
 */
const jumpToAnnotation = async (annotation: Annotation) => {
  try {
    // 这里可以根据CFI跳转到标记位置
    console.log('跳转到标记:', annotation);
    // 实际实现需要调用 reader.jumpToCFI(annotation.cfi.path)
  } catch (error) {
    console.error('跳转失败:', error);
  }
};

/**
 * 导出标记
 */
const exportAnnotations = () => {
  try {
    const data = props.reader.exportAnnotations();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `epub-annotations-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败: ' + (error instanceof Error ? error.message : String(error)));
  }
};

/**
 * 导入标记
 */
const importAnnotations = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const merge = confirm('是否与现有标记合并？(点击"确定"合并，点击"取消"替换)');
      
      await props.reader.importAnnotations(text, merge);
      loadAnnotations();
      
      alert('标记导入成功！');
      closeAnnotationModal();
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  input.click();
};

/**
 * 显示标记列表
 */
const showAnnotationList = () => {
  loadAnnotations();
  showAnnotationModal.value = true;
};

/**
 * 关闭标记列表
 */
const closeAnnotationModal = () => {
  showAnnotationModal.value = false;
};

/**
 * 获取标记图标
 */
const getAnnotationIcon = (type: AnnotationType): string => {
  const icons = {
    highlight: '🟨',
    underline: 'U̲',
    note: '📝',
    bookmark: '🔖'
  };
  return icons[type] || '📌';
};

/**
 * 获取标记类型名称
 */
const getAnnotationTypeName = (type: AnnotationType): string => {
  const names = {
    highlight: '高亮',
    underline: '下划线',
    note: '笔记',
    bookmark: '书签'
  };
  return names[type] || '未知';
};

/**
 * 标记创建回调
 */
const handleAnnotationCreated = (annotation: Annotation) => {
  console.log('标记已创建:', annotation);
  loadAnnotations();
};

/**
 * 标记移除回调
 */
const handleAnnotationRemoved = (id: string) => {
  console.log('标记已移除:', id);
  loadAnnotations();
};

/**
 * 标记更新回调
 */
const handleAnnotationUpdated = (annotation: Annotation) => {
  console.log('标记已更新:', annotation);
  loadAnnotations();
};

// 组件挂载时初始化
onMounted(() => {
  // 可以在这里自动启用标记功能
  // annotationsEnabled.value = true;
  // initializeAnnotations();
});

// 暴露CFI方法给父组件
defineExpose({
  setCurrentChapter: (index: number) => {
    if (index >= 0 && index < chapters.value.length) {
      currentChapterIndex.value = index;
    }
  },
  jumpToCFI,
  getCurrentCFI,
  getCurrentCFICursor,
  toggleAnnotations,
  createHighlight,
  createUnderline,
  createNote,
  createBookmark,
  annotations: currentAnnotations
});


</script>

<style scoped>
.epub-viewer {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  gap: 1rem;
}

.nav-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.nav-btn:hover:not(:disabled) {
  background: #0056b3;
}

.nav-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.chapter-select {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.content-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.chapter-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px dashed #ddd;
  color: #666;
  font-style: italic;
}

.viewer-footer {
  padding: 1rem;
  border-top: 1px solid #eee;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
}

/* 标记功能样式 */
.annotation-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.annotation-toggle {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.annotation-toggle:hover {
  background: #5a6268;
}

.annotation-toggle.active {
  background: #28a745;
}

.annotation-toggle.active:hover {
  background: #218838;
}

.annotation-list-btn {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background-color 0.2s;
}

.annotation-list-btn:hover {
  background: #138496;
}

/* 工具栏样式 */
.annotation-toolbar {
  display: none;
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 8px;
  gap: 4px;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

.annotation-toolbar.show {
  display: flex;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.tool-btn {
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.tool-btn:hover {
  background: #f0f0f0;
}

.tool-btn:active {
  background: #e0e0e0;
}

/* 标记列表弹窗样式 */
.annotation-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.annotation-modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.annotation-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.annotation-modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: #f0f0f0;
}

.annotation-modal-body {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.no-annotations {
  text-align: center;
  color: #666;
  padding: 2rem;
  font-style: italic;
}

.annotation-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.annotation-item {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 1rem;
  background: #fafafa;
  transition: box-shadow 0.2s;
}

.annotation-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.annotation-type {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.type-icon {
  font-size: 16px;
}

.type-icon.highlight {
  color: #f9a825;
}

.type-icon.underline {
  color: #1976d2;
  text-decoration: underline;
}

.type-icon.note {
  color: #388e3c;
}

.type-icon.bookmark {
  color: #f57c00;
}

.annotation-text {
  margin-bottom: 0.5rem;
  color: #333;
  line-height: 1.4;
}

.annotation-note {
  background: #e8f5e8;
  border-left: 3px solid #4caf50;
  padding: 0.5rem;
  margin: 0.5rem 0;
  border-radius: 0 4px 4px 0;
  font-size: 0.9rem;
  color: #2e7d32;
}

.annotation-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.action-btn {
  padding: 0.3rem 0.8rem;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f0f0f0;
}

.action-btn.delete {
  border-color: #dc3545;
  color: #dc3545;
}

.action-btn.delete:hover {
  background: #dc3545;
  color: white;
}

.annotation-modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  border-top: 1px solid #eee;
  background: #f8f9fa;
  border-radius: 0 0 8px 8px;
}

.export-btn, .import-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #007bff;
  background: #007bff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.export-btn:hover, .import-btn:hover {
  background: #0056b3;
}

.annotation-count {
  color: #28a745;
  font-weight: 600;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .viewer-header {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .chapter-select {
    width: 100%;
  }
  
  .content-container {
    padding: 1rem;
  }
  
  .annotation-controls {
    width: 100%;
    justify-content: center;
  }
  
  .annotation-modal-content {
    width: 95%;
    max-height: 90vh;
  }
  
  .annotation-item {
    padding: 0.8rem;
  }
  
  .annotation-actions {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
}
</style>