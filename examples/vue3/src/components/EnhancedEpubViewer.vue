<template>
  <div class="epub-viewer-container">
    <!-- 简化的工具栏 - 由调用方定义DOM结构 -->
    <div 
      :id="toolbarConfig.elementId" 
      class="custom-toolbar"
      v-show="isToolbarVisible"
    >
      <div class="toolbar-header">
        <h3>📝 标记工具</h3>
        <button @click="hideToolbar" class="close-btn">×</button>
      </div>
      
      <div class="toolbar-section">
        <div class="toolbar-label">颜色:</div>
        <div class="color-palette">
          <button
            v-for="color in toolbarConfig.colors"
            :key="color"
            :class="['color-btn', { active: selectedColor === color }]"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="selectColor(color)"
          />
        </div>
      </div>

      <div class="toolbar-section">
        <div class="toolbar-label">样式:</div>
        <div class="style-buttons">
          <button
            v-for="style in toolbarConfig.styles"
            :key="style"
            :class="['style-btn', { active: selectedStyle === style }]"
            @click="selectStyle(style)"
          >
            getStyleLabel(style)
          </button>
        </div>
      </div>

      <div class="toolbar-section">
        <button class="action-btn create-btn" @click="createMark">
          创建标记
        </button>
        <button class="action-btn delete-btn" @click="deleteMark">
          删除标记
        </button>
      </div>
      
      <div v-if="selectionInfo" class="toolbar-section selection-info">
        <div class="selection-text">
          选中文本: {{ selectionInfo.text.substring(0, 30) }}{{ selectionInfo.text.length > 30 ? '...' : '' }}
        </div>
        <div class="selection-cfi" v-if="selectionInfo.cfi">
          CFI: {{ selectionInfo.cfi.substring(0, 30) }}{{ selectionInfo.cfi.length > 30 ? '...' : '' }}
        </div>
      </div>
    </div>

    <!-- 章节内容 -->
    <div class="viewer-controls">
      <div class="chapter-info" v-if="epubInfo && currentChapter">
        <h3>{{ currentChapter.title || `第 ${currentChapterIndex + 1} 章` }}</h3>
      </div>
      
      <div class="navigation-controls">
        <button 
          @click="previousChapter" 
          :disabled="!hasPreviousChapter"
          class="nav-btn prev-btn"
        >
          上一章
        </button>
        
        <select 
          v-model="currentChapterIndex" 
          @change="handleChapterSelectorChange"
          class="chapter-selector"
        >
          <option 
            v-for="(chapter, index) in chapters" 
            :key="chapter.id || index"
            :value="index"
          >
            {{ chapter.title || `第 ${index + 1} 章` }}
          </option>
        </select>
        
        <button 
          @click="nextChapter" 
          :disabled="!hasNextChapter"
          class="nav-btn next-btn"
        >
          下一章
        </button>
      </div>

      <!-- 标记控制 -->
      <div class="marking-controls">
        <button 
          @click="toggleToolbar"
          class="toolbar-toggle-btn"
          :class="{ active: isToolbarVisible }"
        >
          {{ isToolbarVisible ? '隐藏工具栏' : '显示工具栏' }}
        </button>
        
        <button 
          @click="showAllMarks"
          class="marks-btn"
        >
          显示所有标记 ({{ totalMarks }})
        </button>
        
        <button 
          @click="clearAllMarks"
          class="clear-marks-btn"
          :disabled="totalMarks === 0"
        >
          清除所有标记
        </button>
      </div>
    </div>

    <!-- EPUB内容显示区域 -->
    <div 
      id="epub-viewer" 
      class="epub-content"
      @mouseup="handleTextSelection"
    >
      <!-- EPUB内容将在这里渲染 -->
    </div>

    <!-- 标记信息面板 -->
    <div v-if="selectedMarkInfo" class="mark-info-panel">
      <h4>标记信息</h4>
      <p><strong>文本:</strong> {{ selectedMarkInfo.text }}</p>
      <p><strong>CFI:</strong> {{ selectedMarkInfo.cfi }}</p>
      <p><strong>样式:</strong> {{ selectedMarkInfo.style.type }}</p>
      <p><strong>颜色:</strong> {{ selectedMarkInfo.style.color }}</p>
      <p><strong>创建时间:</strong> {{ formatDate(selectedMarkInfo.created) }}</p>
      <div class="mark-actions">
        <button @click="editMark(selectedMarkInfo)" class="edit-btn">编辑</button>
        <button @click="removeMark(selectedMarkInfo.id)" class="remove-btn">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { EpubReader } from 'epub-reader-src';
import type { 
  EpubInfo as EpubInfoType, 
  EpubChapter, 
  Annotation,
  SelectedTextInfo
} from 'epub-reader-src/types';

interface Props {
  reader: EpubReader;
  epubInfo: EpubInfoType | null;
  initialChapterIndex?: number;
  viewerElementId?: string;
  toolbarConfig?: {
    elementId?: string;
    colors?: string[];
    styles?: string[];
    position?: 'floating' | 'top' | 'bottom';
    autoHide?: boolean;
    hideDelay?: number;
  };
}

interface Emits {
  (e: 'chapter-change', chapter: EpubChapter, index: number): void;
  (e: 'mark-created', mark: Annotation): void;
  (e: 'mark-deleted', markId: string): void;
  (e: 'mark-updated', mark: Annotation): void;
  (e: 'selection-change', selection: SelectedTextInfo | null): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialChapterIndex: 0,
  viewerElementId: 'epub-viewer',
  toolbarConfig: () => ({
    elementId: 'epub-marking-toolbar',
    colors: ['#ffeb3b', '#4caf50', '#2196f3', '#e91e63', '#ff9800'],
    styles: ['highlight', 'underline', 'dashed', 'wavy'],
    position: 'floating',
    autoHide: true,
    hideDelay: 3000
  })
});

const emit = defineEmits<Emits>();

// 响应式状态
const currentChapterIndex = ref(props.initialChapterIndex);
const currentChapter = ref<EpubChapter | null>(null);
const isToolbarVisible = ref(false);
const selectedColor = ref('#ffeb3b');
const selectedStyle = ref('highlight');
const marks = ref<Annotation[]>([]);
const selectedMarkInfo = ref<Annotation | null>(null);
const selectionInfo = ref<SelectedTextInfo | null>(null);

// 计算属性
const chapters = computed(() => props.epubInfo?.chapters || []);
const hasPreviousChapter = computed(() => currentChapterIndex.value > 0);
const hasNextChapter = computed(() => currentChapterIndex.value < chapters.value.length - 1);
const totalMarks = computed(() => marks.value.length);

// 方法
const loadChapterByIndex = async (index: number) => {
console.log('🔍 [DEBUG] loadChapterByIndex 开始:', { 
    index, 
    hasReader: !!props.reader, 
    chaptersLength: chapters.value.length,
    chapterExists: !!chapters.value[index],
    currentChapterIndex: currentChapterIndex.value,
    currentChapter: currentChapter.value?.title || currentChapter.value?.id
  });
  
  if (!props.reader) {
    console.error('❌ [DEBUG] EpubReader 不存在');
    return;
  }
  
  if (!chapters.value[index]) {
    console.error('❌ [DEBUG] 章节不存在:', { 
      index, 
      chaptersLength: chapters.value.length,
      availableChapters: chapters.value.map((ch, i) => ({ index: i, id: ch.id, href: ch.href }))
    });
    return;
  }
  
  try {
    const chapter = chapters.value[index];
console.log('📖 [DEBUG] 准备加载章节:', { 
      index, 
      chapterId: chapter.id, 
      chapterHref: chapter.href,
      chapterTitle: chapter.title || `第 ${index + 1} 章`,
      targetElementId: props.viewerElementId
    });
    
await props.reader.loadChapterByIndex(index);
    
    console.log('✅ [DEBUG] EpubReader.loadChapterByIndex 完成，更新状态');
    
    currentChapter.value = chapter;
    currentChapterIndex.value = index;
    
    console.log('🔄 [DEBUG] 状态已更新:', { 
      newCurrentChapterIndex: currentChapterIndex.value,
      newCurrentChapter: currentChapter.value?.title || currentChapter.value?.id,
      chapterObjectMatch: currentChapter.value === chapter
    });
    
    // 更新当前章节的标记
    updateMarksForChapter();
    
    console.log('📢 [DEBUG] 触发 chapter-change 事件');
    emit('chapter-change', chapter, index);
    
    console.log('🎉 [DEBUG] loadChapterByIndex 完成');
  } catch (error) {
    console.error('❌ [DEBUG] 加载章节失败:', error);
    console.error('❌ [DEBUG] 错误详情:', {
      index,
      chapter: chapters.value[index],
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack
    });
  }
};

const previousChapter = () => {
  console.log('⬅️ [DEBUG] previousChapter 被调用:', {
    currentChapterIndex: currentChapterIndex.value,
    hasPreviousChapter: hasPreviousChapter.value,
    totalChapters: chapters.value.length
  });
  
  if (hasPreviousChapter.value) {
    const newIndex = currentChapterIndex.value - 1;
    console.log('⬅️ [DEBUG] 准备加载上一章:', { newIndex });
    loadChapterByIndex(newIndex);
  } else {
    console.log('⚠️ [DEBUG] 没有上一章可加载');
  }
};

const nextChapter = () => {
  console.log('➡️ [DEBUG] nextChapter 被调用:', {
    currentChapterIndex: currentChapterIndex.value,
    hasNextChapter: hasNextChapter.value,
    totalChapters: chapters.value.length
  });
  
  if (hasNextChapter.value) {
    const newIndex = currentChapterIndex.value + 1;
    console.log('➡️ [DEBUG] 准备加载下一章:', { newIndex });
    loadChapterByIndex(newIndex);
  } else {
    console.log('⚠️ [DEBUG] 没有下一章可加载');
  }
};

const handleChapterSelectorChange = () => {
  console.log('📋 [DEBUG] 章节选择器变化:', {
    newIndex: currentChapterIndex.value,
    oldIndex: currentChapter.value ? chapters.value.findIndex(ch => ch.id === currentChapter.value.id) : -1,
    chaptersLength: chapters.value.length,
    selectedChapter: chapters.value[currentChapterIndex.value]?.title || chapters.value[currentChapterIndex.value]?.id
  });
  
  loadChapterByIndex(currentChapterIndex.value);
};

// 初始化SVG标记管理器
const initMarkingManager = () => {
  if (!svgMarkManager) {
    svgMarkManager = new SVGMarkManager(
      props.viewerElementId,
      {
        onAnnotationCreated: (annotation) => {
          console.log('标记创建:', annotation);
        },
        onAnnotationUpdated: (annotation) => {
          console.log('标记更新:', annotation);
        },
        onAnnotationDeleted: (markId) => {
          console.log('标记删除:', markId);
          // 从本地标记列表中移除
          marks.value = marks.value.filter(mark => mark.id !== markId);
          selectedMarkInfo.value = null;
          emit('mark-deleted', markId);
        },
        onSelectionChange: (selection) => {
          emit('selection-change', selection);
        },
        onToolbarToggle: (visible) => {
          isToolbarVisible.value = visible;
        }
      },
      props.toolbarConfig
    );

    // 监听标记点击事件
    document.addEventListener('markClick', handleMarkClick);
  }
};

// 处理文本选择
const handleTextSelection = () => {
  setTimeout(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      // 这里可以获取选区信息
      selectionInfo.value = {
        text: selection.toString(),
        cfi: `epub-generated-cfi-${Date.now()}`,
        range: selection.getRangeAt(0),
        startOffset: selection.getRangeAt(0).startOffset,
        endOffset: selection.getRangeAt(0).endOffset
      };
      
      // 使用新的简化工具栏系统
      showToolbar();
      
      emit('selection-change', selectionInfo.value);
    } else {
      selectionInfo.value = null;
      hideToolbar();
      emit('selection-change', null);
    }
  }, 10);
};

// 工具栏选择方法
const selectColor = (color: string) => {
  selectedColor.value = color;
};

const selectStyle = (style: string) => {
  selectedStyle.value = style;
};

const createMark = () => {
  if (selectionInfo.value) {
    const mark: Annotation = {
      id: `mark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cfi: selectionInfo.value.cfi,
      text: selectionInfo.value.text,
      selectedText: selectionInfo.value.text,
      color: selectedColor.value,
      created: new Date(),
      updated: new Date(),
      style: {
        backgroundColor: selectedColor.value
      },
      chapterHref: currentChapter.value?.href,
      chapterTitle: currentChapter.value?.title
    };
    
    marks.value.push(mark);
    emit('mark-created', mark);
    hideToolbar(); // 创建后隐藏工具栏
  }
};

const deleteMark = () => {
  if (selectionInfo.value) {
    // 可以在这里实现删除选区位置的标记
    console.log('删除选区的标记');
  }
};

const getStyleLabel = (style: string): string => {
  const labels: Record<string, string> = {
    highlight: '高亮',
    underline: '下划线',
    dashed: '虚线',
    wavy: '波浪线',
    dotted: '点线',
    double: '双线',
    solid: '实线'
  };
  return labels[style] || style;
};

// 更新当前章节的标记
const updateMarksForChapter = () => {
  if (currentChapter.value) {
    const chapterMarks = marks.value.filter(mark => mark.chapterHref === currentChapter.value?.href);
    console.log('📝 [DEBUG] 更新章节标记:', { marksCount: chapterMarks.length });
  }
};

// 工具栏控制
const showToolbar = () => {
  if (props.reader) {
    props.reader.showToolbar();
    isToolbarVisible.value = true;
  }
};

const hideToolbar = () => {
  if (props.reader) {
    props.reader.hideToolbar();
    isToolbarVisible.value = false;
  }
};

const toggleToolbar = () => {
  if (props.reader) {
    props.reader.toggleToolbar();
    isToolbarVisible.value = props.reader.isToolbarVisible();
  }
};

const showAllMarks = () => {
  // 这里可以实现显示所有标记的逻辑
  console.log('显示所有标记:', marks.value);
};

const clearAllMarks = () => {
  if (confirm('确定要清除所有标记吗？')) {
    marks.value = [];
    selectedMarkInfo.value = null;
  }
};

// 标记操作
const editMark = (mark: Annotation) => {
  // 这里可以打开一个编辑对话框
  const newColor = prompt('请输入新的颜色 (例如: #ff0000):', mark.color);
  if (newColor) {
    mark.color = newColor;
    mark.updated = new Date();
    emit('mark-updated', mark);
  }
};

const removeMark = (markId: string) => {
  if (confirm('确定要删除这个标记吗？')) {
    marks.value = marks.value.filter(mark => mark.id !== markId);
    selectedMarkInfo.value = null;
    emit('mark-deleted', markId);
  }
};

// 格式化日期
const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString();
};

// 添加标记（从外部数据）
const addExternalMark = (markData: Omit<Annotation, 'id' | 'created' | 'updated'>) => {
  const mark: Annotation = {
    id: `mark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...markData,
    created: new Date(),
    updated: new Date()
  };
  marks.value.push(mark);
  emit('mark-created', mark);
  return mark.id;
};

// 批量添加标记
const addExternalMarks = (marksData: Omit<Annotation, 'id' | 'created' | 'updated'>[]) => {
  const newMarks = marksData.map(markData => ({
    id: `mark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...markData,
    created: new Date(),
    updated: new Date()
  }));
  marks.value.push(...newMarks);
  newMarks.forEach(mark => emit('mark-created', mark));
  return newMarks.map(mark => mark.id);
};

// 生命周期
onMounted(() => {
  // 加载初始章节
  if (chapters.value.length > 0) {
    loadChapterByIndex(currentChapterIndex.value);
  }
});

onUnmounted(() => {
  // 清理资源
});

// 监听章节变化
watch(() => props.epubInfo, (newInfo, oldInfo) => {
  console.log('👀 [DEBUG] epubInfo 发生变化:', {
    hasNewInfo: !!newInfo,
    newChaptersCount: newInfo?.chapters?.length || 0,
    oldChaptersCount: oldInfo?.chapters?.length || 0,
    currentChapterIndex: currentChapterIndex.value,
    immediateLoad: newInfo && newInfo.chapters.length > 0
  });
  
  if (newInfo && newInfo.chapters.length > 0) {
    console.log('🚀 [DEBUG] epubInfo 变化，自动加载章节:', { 
      index: currentChapterIndex.value,
      chapterTitle: newInfo.chapters[currentChapterIndex.value]?.title || newInfo.chapters[currentChapterIndex.value]?.id
    });
    loadChapterByIndex(currentChapterIndex.value);
  }
}, { immediate: true });

// 监听当前章节索引变化
watch(currentChapterIndex, (newIndex, oldIndex) => {
  console.log('🔄 [DEBUG] currentChapterIndex 变化:', {
    newIndex,
    oldIndex,
    newChapter: chapters.value[newIndex]?.title || chapters.value[newIndex]?.id,
    oldChapter: chapters.value[oldIndex]?.title || chapters.value[oldIndex]?.id,
    isChangingByUserAction: newIndex !== oldIndex
  });
});

// 监听当前章节对象变化
watch(currentChapter, (newChapter, oldChapter) => {
  console.log('📖 [DEBUG] currentChapter 变化:', {
    newChapterId: newChapter?.id,
    newChapterTitle: newChapter?.title,
    oldChapterId: oldChapter?.id,
    oldChapterTitle: oldChapter?.title,
    isDifferentChapter: newChapter?.id !== oldChapter?.id
  });
});

// 暴露方法给父组件
defineExpose({
  loadChapterByIndex,
  previousChapter,
  nextChapter,
  toggleToolbar,
  clearAllMarks,
  addExternalMark,
  addExternalMarks,
  getAllMarks: () => marks.value,
  getSelectedMark: () => selectedMarkInfo.value,
  getCurrentChapter: () => currentChapter.value
});
</script>

<style scoped>
.epub-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.viewer-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;
  gap: 16px;
}

.chapter-info h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
  font-weight: 500;
}

.navigation-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-btn {
  padding: 8px 16px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn:hover:not(:disabled) {
  background: #1565c0;
  transform: translateY(-1px);
}

.nav-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.chapter-selector {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  min-width: 200px;
  font-size: 14px;
}

.marking-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.toolbar-toggle-btn {
  padding: 8px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbar-toggle-btn:hover {
  background: #45a049;
}

.toolbar-toggle-btn.active {
  background: #ff9800;
}

.marks-btn {
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.marks-btn:hover {
  background: #1976d2;
}

.clear-marks-btn {
  padding: 8px 16px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-marks-btn:hover:not(:disabled) {
  background: #da190b;
}

.clear-marks-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.epub-content {
  margin: 0 auto;
  width: 800px;
  height: 1000px;
  padding: 20px;
  overflow-y: auto;
  background: white;
  position: relative;
}

.mark-info-panel {
  position: fixed;
  right: 20px;
  top: 20px;
  width: 300px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1002;
}

.mark-info-panel h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
  font-weight: 500;
}

.mark-info-panel p {
  margin: 8px 0;
  font-size: 14px;
  color: #666;
}

.mark-info-panel strong {
  color: #333;
}

.mark-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.edit-btn {
  padding: 6px 12px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.edit-btn:hover {
  background: #1565c0;
}

.remove-btn {
  padding: 6px 12px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.remove-btn:hover {
  background: #da190b;
}

/* 自定义工具栏样式 */
.custom-toolbar {
  position: fixed;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  min-width: 280px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
}

.toolbar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.toolbar-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.toolbar-section {
  margin-bottom: 12px;
}

.toolbar-section:last-child {
  margin-bottom: 0;
}

.toolbar-label {
  font-size: 12px;
  font-weight: 500;
  color: #666;
  margin-bottom: 6px;
}

.color-palette {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.color-btn {
  width: 28px;
  height: 28px;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.color-btn:hover {
  transform: scale(1.1);
  border-color: #333;
}

.color-btn.active {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.color-btn.active::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.style-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.style-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 400;
}

.style-btn:hover {
  background: #e3f2fd;
  border-color: #1976d2;
}

.style-btn.active {
  background: #1976d2;
  color: white;
  border-color: #1976d2;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 500;
  min-width: 70px;
  margin: 2px 0;
}

.create-btn {
  background: #4caf50;
  color: white;
}

.create-btn:hover {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.delete-btn {
  background: #f44336;
  color: white;
}

.delete-btn:hover {
  background: #da190b;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
}

.selection-info {
  border-top: 1px solid #e0e0e0;
  padding-top: 8px;
  margin-top: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  padding: 8px;
}

.selection-text {
  font-size: 11px;
  color: #333;
  margin-bottom: 4px;
  word-break: break-all;
}

.selection-cfi {
  font-size: 10px;
  color: #666;
  font-family: 'Courier New', monospace;
  word-break: break-all;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .viewer-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .navigation-controls,
  .marking-controls {
    justify-content: center;
  }
  
  .mark-info-panel {
    position: static;
    width: auto;
    margin: 16px 0;
  }
}

@media (max-width: 768px) {
  .viewer-controls {
    padding: 12px;
  }
  
  .chapter-info h3 {
    font-size: 16px;
  }
  
  .navigation-controls {
    flex-direction: column;
    gap: 8px;
  }
  
  .nav-btn {
    width: 100%;
  }
  
  .marking-controls {
    flex-direction: column;
    gap: 8px;
  }
  
  .marking-controls button {
    width: 100%;
  }
  
  .epub-content {
    padding: 12px;
  }
}
</style>