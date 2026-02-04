<template>
  <div class="epub-viewer-container">
    <!-- 工具栏 -->
    <MarkingToolbar
      ref="toolbarRef"
      :elementId="toolbarConfig.elementId"
      :colors="toolbarConfig.colors"
      :styles="toolbarConfig.styles"
      :position="toolbarConfig.position"
      :autoHide="toolbarConfig.autoHide"
      :hideDelay="toolbarConfig.hideDelay"
      @color-change="handleColorChange"
      @style-change="handleStyleChange"
      @create-mark="handleCreateMark"
      @delete-mark="handleDeleteMark"
      @visibility-change="handleToolbarVisibilityChange"
    />

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
          @change="loadChapterByIndex(currentChapterIndex)"
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
      id="epub-chapter-container" 
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
import { EpubReader, SVGMarkManager } from 'epub-reader-src';
import type { 
  EpubInfo as EpubInfoType, 
  EpubChapter, 
  SVGMark, 
  SelectionInfo, 
  SVGMarkStyle 
} from 'epub-reader-src/types';
import MarkingToolbar from './MarkingToolbar.vue';

interface Props {
  epubReader: EpubReader;
  epubInfo: EpubInfoType | null;
  initialChapterIndex?: number;
  viewerElementId?: string;
  toolbarConfig?: {
    elementId?: string;
    colors?: string[];
    styles?: SVGMarkStyle['type'][];
    position?: 'floating' | 'top' | 'bottom';
    autoHide?: boolean;
    hideDelay?: number;
  };
}

interface Emits {
  (e: 'chapter-change', chapter: EpubChapter, index: number): void;
  (e: 'mark-created', mark: SVGMark): void;
  (e: 'mark-deleted', markId: string): void;
  (e: 'mark-updated', mark: SVGMark): void;
  (e: 'selection-change', selection: SelectionInfo | null): void;
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
const selectedStyle = ref<SVGMarkStyle['type']>('highlight');
const marks = ref<SVGMark[]>([]);
const selectedMarkInfo = ref<SVGMark | null>(null);

// SVG标记管理器
let svgMarkManager: SVGMarkManager | null = null;

// 工具栏引用
const toolbarRef = ref();

// 计算属性
const chapters = computed(() => props.epubInfo?.chapters || []);
const hasPreviousChapter = computed(() => currentChapterIndex.value > 0);
const hasNextChapter = computed(() => currentChapterIndex.value < chapters.value.length - 1);
const totalMarks = computed(() => marks.value.length);

// 方法
const loadChapterByIndex = async (index: number) => {
  if (!props.epubReader || !chapters.value[index]) return;
  
  try {
    const chapter = chapters.value[index];
    await props.epubReader.loadChapterByIndex(index, {
      targetElementId: props.viewerElementId
    });
    
    currentChapter.value = chapter;
    currentChapterIndex.value = index;
    
    // 更新当前章节的标记
    updateMarksForChapter();
    
    emit('chapter-change', chapter, index);
  } catch (error) {
    console.error('加载章节失败:', error);
  }
};

const previousChapter = () => {
  if (hasPreviousChapter.value) {
    loadChapterByIndex(currentChapterIndex.value - 1);
  }
};

const nextChapter = () => {
  if (hasNextChapter.value) {
    loadChapterByIndex(currentChapterIndex.value + 1);
  }
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
const handleTextSelection = (event: MouseEvent) => {
  setTimeout(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selectionInfo = svgMarkManager?.getSelectedTextInfo();
      if (selectionInfo) {
        // 触发自定义事件显示工具栏
        const customEvent = new CustomEvent('showMarkingToolbar', {
          detail: {
            selection: selectionInfo,
            x: event.clientX,
            y: event.clientY
          }
        });
        document.dispatchEvent(customEvent);
      }
    }
  }, 10);
};

// 处理工具栏事件
const handleColorChange = (color: string) => {
  selectedColor.value = color;
};

const handleStyleChange = (style: SVGMarkStyle['type']) => {
  selectedStyle.value = style;
};

const handleCreateMark = ({ color, style }: { color: string; style: SVGMarkStyle['type'] }) => {
  if (svgMarkManager) {
    selectedColor.value = color;
    selectedStyle.value = style;
    const mark = svgMarkManager.createMark(color, style);
    if (mark) {
      marks.value.push(mark);
      emit('mark-created', mark);
    }
  }
};

const handleDeleteMark = () => {
  if (svgMarkManager) {
    svgMarkManager.removeMarkAtSelection();
  }
};

const handleToolbarVisibilityChange = (visible: boolean) => {
  isToolbarVisible.value = visible;
};

// 处理标记点击
const handleMarkClick = (event: CustomEvent) => {
  const { mark } = event.detail;
  selectedMarkInfo.value = mark;
};

// 更新当前章节的标记
const updateMarksForChapter = () => {
  if (svgMarkManager && currentChapter.value) {
    const chapterMarks = svgMarkManager.getMarksByChapter(currentChapter.value.href);
    marks.value = chapterMarks;
  }
};

// 工具栏控制
const toggleToolbar = () => {
  if (toolbarRef.value) {
    toolbarRef.value.toggle();
  }
};

const showAllMarks = () => {
  if (svgMarkManager) {
    marks.value = svgMarkManager.getAllMarks();
  }
};

const clearAllMarks = () => {
  if (svgMarkManager && confirm('确定要清除所有标记吗？')) {
    svgMarkManager.clearAllMarks();
    marks.value = [];
    selectedMarkInfo.value = null;
  }
};

// 标记操作
const editMark = (mark: SVGMark) => {
  // 这里可以打开一个编辑对话框
  const newColor = prompt('请输入新的颜色 (例如: #ff0000):', mark.style.color);
  if (newColor && svgMarkManager) {
    const success = svgMarkManager.updateMarkStyle(mark.id, { color: newColor });
    if (success) {
      mark.style.color = newColor;
      mark.updated = new Date();
      emit('mark-updated', mark);
    }
  }
};

const removeMark = (markId: string) => {
  if (svgMarkManager && confirm('确定要删除这个标记吗？')) {
    svgMarkManager.removeMark(markId);
  }
};

// 格式化日期
const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString();
};

// 添加标记（从外部数据）
const addExternalMark = (markData: Omit<SVGMark, 'id' | 'created' | 'updated'>) => {
  if (svgMarkManager) {
    const markId = svgMarkManager.addMark(markData);
    const mark = svgMarkManager.getAllMarks().find(m => m.id === markId);
    if (mark) {
      marks.value.push(mark);
      emit('mark-created', mark);
    }
    return markId;
  }
  return '';
};

// 批量添加标记
const addExternalMarks = (marksData: Omit<SVGMark, 'id' | 'created' | 'updated'>[]) => {
  if (svgMarkManager) {
    const markIds = svgMarkManager.addMarks(marksData);
    const newMarks = svgMarkManager.getAllMarks().filter(m => markIds.includes(m.id));
    marks.value.push(...newMarks);
    newMarks.forEach(mark => emit('mark-created', mark));
    return markIds;
  }
  return [];
};

// 生命周期
onMounted(() => {
  initMarkingManager();
  
  // 加载初始章节
  if (chapters.value.length > 0) {
    loadChapterByIndex(currentChapterIndex.value);
  }
});

onUnmounted(() => {
  if (svgMarkManager) {
    svgMarkManager.destroy();
    svgMarkManager = null;
  }
  document.removeEventListener('markClick', handleMarkClick);
});

// 监听章节变化
watch(() => props.epubInfo, (newInfo) => {
  if (newInfo && newInfo.chapters.length > 0) {
    loadChapterByIndex(currentChapterIndex.value);
  }
}, { immediate: true });

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
  flex: 1;
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