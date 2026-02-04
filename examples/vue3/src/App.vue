<template>
  <div class="app">
    <header class="header">
      <h1>EPUB Reader Vue 3 - 增强标记功能</h1>
      <div class="header-stats" v-if="reader && epubInfo">
        <span>章节数: {{ epubInfo.chapters.length }}</span>
        <span>标记数: {{ totalMarks }}</span>
      </div>
    </header>
    
    <main class="main">
      <EpubLoader @loaded="onEpubLoaded" v-if="!reader" />
      
      <!-- 始终渲染容器，但只有加载后才显示内容 -->
      <div class="reader-container" :class="{ 'reader-hidden': !reader }">
        <div class="sidebar">
          <EpubInfo v-if="reader" :reader="reader" @chapter-selected="onChapterSelected" />
          
          <!-- 标记管理面板 -->
          <div v-if="reader" class="marks-panel">
            <h3>标记管理</h3>
            <div class="marks-stats">
              <p>总标记数: {{ totalMarks }}</p>
              <p>当前章节: {{ currentChapterMarks.length }}</p>
            </div>
            <div class="marks-actions">
              <button @click="exportMarks" :disabled="totalMarks === 0" class="export-btn">
                导出标记
              </button>
              <button @click="importMarks" class="import-btn">
                导入标记
              </button>
              <input 
                ref="fileInput" 
                type="file" 
                accept=".json" 
                @change="handleFileImport" 
                style="display: none"
              >
            </div>
            <div class="marks-list" v-if="currentChapterMarks.length > 0">
              <h4>当前章节标记</h4>
              <div 
                v-for="mark in currentChapterMarks" 
                :key="mark.id"
                class="mark-item"
                @click="scrollToMark(mark)"
              >
                <div class="mark-preview">
                  <span 
                    class="mark-color-indicator" 
                    :style="{ backgroundColor: mark.style.color }"
                  ></span>
                  <span class="mark-text">{{ mark.text.substring(0, 30) }}...</span>
                  <span class="mark-style">{{ mark.style.type }}</span>
                </div>
                <div class="mark-actions">
                  <button @click.stop="editMark(mark)" class="mini-edit-btn">编辑</button>
                  <button @click.stop="deleteMark(mark.id)" class="mini-delete-btn">删除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="content-area">
          <EnhancedEpubViewer 
            v-if="reader && epubInfo"
            :reader="reader" 
            :epubInfo="epubInfo"
            :viewerElementId="viewerElementId"
            :toolbarConfig="toolbarConfig"
            @chapter-change="onChapterChange"
            @mark-created="onMarkCreated"
            @mark-deleted="onMarkDeleted"
            @mark-updated="onMarkUpdated"
            @selection-change="onSelectionChange"
            ref="viewerRef"
          />
          
          <!-- 章节内容容器，始终存在但为空 -->
          <div id="epub-viewer" class="chapter-render-area"></div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { EpubReader } from 'epub-reader-src';
import { EpubTableOfContents, EpubInfo as EpubInfoType, SVGMark, SVGMarkStyle } from 'epub-reader-src';
import EpubLoader from './components/EpubLoader.vue';
import EpubInfo from './components/EpubInfo.vue';
import EnhancedEpubViewer from './components/EnhancedEpubViewer.vue';

const reader = ref<EpubReader | null>(null);
const epubInfo = ref<EpubInfoType | null>(null);
const viewerRef = ref();
const fileInput = ref<HTMLInputElement>();
const allMarks = ref<SVGMark[]>([]);
const currentChapter = ref<EpubTableOfContents | null>(null);

const viewerElementId = 'epub-viewer';
const toolbarConfig = {
  elementId: 'epub-marking-toolbar',
  colors: ['#ffeb3b', '#4caf50', '#2196f3', '#e91e63', '#ff9800', '#9c27b0', '#00bcd4', '#ff5722'],
  styles: ['highlight', 'underline', 'dashed', 'wavy', 'dotted'] as SVGMarkStyle['type'][],
  position: 'floating' as const,
  autoHide: true,
  hideDelay: 4000
};

// 计算属性
const totalMarks = computed(() => allMarks.value.length);
const currentChapterMarks = computed(() => {
  if (!currentChapter.value) return [];
  return allMarks.value.filter(mark => mark.chapterHref === currentChapter.value?.href);
});

// 事件处理
const onEpubLoaded = (epubReader: EpubReader) => {
  console.log('EpubReader loaded:', epubReader);
  reader.value = epubReader;
  
  // 获取EPUB信息
  setTimeout(async () => {
    try {
      const info = await epubReader.getInfo();
      epubInfo.value = info;
    } catch (error) {
      console.error('获取EPUB信息失败:', error);
    }
  }, 100);
};

const onChapterSelected = async (chapter: EpubTableOfContents) => {
  if (!reader.value || !chapter.href) return;
  
  try {
    await reader.value.loadChapterByHref(chapter.href, {
      showLoading: true,
      onError: (error) => {
        console.error('章节加载失败:', error);
      },
      onSuccess: () => {
        console.log('章节加载成功');
      }
    });
    currentChapter.value = chapter;
  } catch (error) {
    console.error('Failed to load chapter:', error);
  }
};

const onChapterChange = (chapter: any, index: number) => {
  currentChapter.value = { href: chapter.href, title: chapter.title, id: chapter.id, order: index };
  console.log('章节变化:', chapter);
};

const onMarkCreated = (mark: SVGMark) => {
  console.log('标记创建:', mark);
  allMarks.value.push(mark);
};

const onMarkDeleted = (markId: string) => {
  console.log('标记删除:', markId);
  allMarks.value = allMarks.value.filter(mark => mark.id !== markId);
};

const onMarkUpdated = (mark: SVGMark) => {
  console.log('标记更新:', mark);
  const index = allMarks.value.findIndex(m => m.id === mark.id);
  if (index !== -1) {
    allMarks.value[index] = { ...mark };
  }
};

const onSelectionChange = (selection: any) => {
  console.log('选择变化:', selection);
};

// 标记管理功能
const editMark = (mark: SVGMark) => {
  const newColor = prompt('请输入新的颜色 (例如: #ff0000):', mark.style.color);
  if (newColor && viewerRef.value) {
    viewerRef.value.editMark(mark);
  }
};

const deleteMark = (markId: string) => {
  if (confirm('确定要删除这个标记吗？') && viewerRef.value) {
    viewerRef.value.removeMark(markId);
  }
};

const scrollToMark = (mark: SVGMark) => {
  // 这里可以实现滚动到标记位置的功能
  console.log('滚动到标记:', mark);
};

const exportMarks = () => {
  if (allMarks.value.length === 0) return;
  
  const dataStr = JSON.stringify(allMarks.value, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `epub-marks-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const importMarks = () => {
  fileInput.value?.click();
};

const handleFileImport = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const marks = JSON.parse(e.target?.result as string);
      if (Array.isArray(marks) && viewerRef.value) {
        viewerRef.value.addExternalMarks(marks);
      }
    } catch (error) {
      console.error('导入标记失败:', error);
      alert('导入失败，请检查文件格式');
    }
  };
  reader.readAsText(file);
};

onMounted(() => {
  // 可以在这里加载示例数据或进行初始化
});
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: white;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.header h1 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 24px;
}

.header-stats {
  display: flex;
  justify-content: center;
  gap: 2rem;
  font-size: 14px;
  color: #666;
}

.main {
  flex: 1;
  padding: 1rem;
}

.reader-container {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
  height: calc(100vh - 120px);
  transition: opacity 0.3s ease;
}

.reader-hidden {
  opacity: 0;
  pointer-events: none;
  height: 0;
  overflow: hidden;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  overflow-y: auto;
}

.marks-panel {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.marks-panel h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.marks-stats {
  margin-bottom: 1rem;
}

.marks-stats p {
  margin: 0.25rem 0;
  font-size: 14px;
  color: #666;
}

.marks-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.export-btn, .import-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.export-btn {
  background: #4caf50;
  color: white;
}

.export-btn:hover:not(:disabled) {
  background: #45a049;
}

.export-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.import-btn {
  background: #2196f3;
  color: white;
}

.import-btn:hover {
  background: #1976d2;
}

.marks-list h4 {
  margin: 1rem 0 0.5rem 0;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.mark-item {
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mark-item:hover {
  background: #f5f5f5;
  border-color: #1976d2;
}

.mark-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.mark-color-indicator {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid #ddd;
}

.mark-text {
  flex: 1;
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mark-style {
  font-size: 11px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
}

.mark-actions {
  display: flex;
  gap: 0.5rem;
}

.mini-edit-btn, .mini-delete-btn {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
}

.mini-edit-btn {
  background: #1976d2;
  color: white;
}

.mini-edit-btn:hover {
  background: #1565c0;
}

.mini-delete-btn {
  background: #f44336;
  color: white;
}

.mini-delete-btn:hover {
  background: #da190b;
}

.content-area {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chapter-render-area {
  flex: 1;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  overflow-y: auto;
  position: relative;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .reader-container {
    grid-template-columns: 300px 1fr;
  }
}

@media (max-width: 968px) {
  .reader-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    height: auto;
  }
  
  .sidebar {
    order: 2;
  }
  
  .content-area {
    order: 1;
  }
  
  .marks-panel {
    margin-bottom: 1rem;
  }
}

@media (max-width: 768px) {
  .header {
    padding: 0.75rem;
  }
  
  .header h1 {
    font-size: 20px;
  }
  
  .header-stats {
    gap: 1rem;
    font-size: 13px;
  }
  
  .main {
    padding: 0.5rem;
  }
  
  .reader-container {
    gap: 1rem;
  }
  
  .marks-actions {
    flex-direction: column;
  }
  
  .export-btn, .import-btn {
    width: 100%;
  }
}
</style>