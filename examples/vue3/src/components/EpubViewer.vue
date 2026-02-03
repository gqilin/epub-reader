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
    </div>
    
    <div class="content-container">
      <!-- 章节内容现在由父组件App.vue提供 -->
      <div class="chapter-placeholder">
        <p>章节内容将在下方显示</p>
      </div>
    </div>
    
    <div class="viewer-footer">
      <span>Chapter {{ currentChapterIndex + 1 }} of {{ chapters.length }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { EpubReader, EpubChapter } from 'epub-reader-src';

interface Props {
  reader: EpubReader;
}

const props = defineProps<Props>();

const chapters = ref<EpubChapter[]>(props.reader.getChapters());
const currentChapterIndex = ref(props.reader.getCurrentChapterIndex());
const hasPreviousChapter = ref(props.reader.hasPreviousChapter());
const hasNextChapter = ref(props.reader.hasNextChapter());

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

// 暴露CFI方法给父组件
defineExpose({
  setCurrentChapter: (index: number) => {
    if (index >= 0 && index < chapters.value.length) {
      currentChapterIndex.value = index;
    }
  },
  jumpToCFI,
  getCurrentCFI,
  getCurrentCFICursor
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
}
</style>