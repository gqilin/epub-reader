<template>
  <div class="app">
    <header class="header">
      <h1>EPUB Reader Vue 3 Example</h1>
    </header>
    
    <main class="main">
      <EpubLoader @loaded="onEpubLoaded" v-if="!reader" />
      
      <!-- 始终渲染容器，但只有加载后才显示内容 -->
      <div class="reader-container" :class="{ 'reader-hidden': !reader }">
        <EpubInfo v-if="reader" :reader="reader" @chapter-selected="onChapterSelected" />
        <EpubViewer v-if="reader" :reader="reader" />
        
        <!-- 章节内容容器，始终存在但为空 -->
        <div v-if="reader" id="epub-chapter-container" class="chapter-render-area"></div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, type ComponentPublicInstance } from 'vue';
import { EpubReader } from 'epub-reader-src';
import { EpubTableOfContents } from 'epub-reader-src';
import EpubLoader from './components/EpubLoader.vue';
import EpubInfo from './components/EpubInfo.vue';
import EpubViewer from './components/EpubViewer.vue';

const reader = ref<EpubReader | null>(null);

const onEpubLoaded = (epubReader: EpubReader) => {
  console.log('EpubReader loaded:', epubReader);
  reader.value = epubReader;
};

const onChapterSelected = async (chapter: EpubTableOfContents) => {
  if (!reader.value || !chapter.href) return;
  
  try {
    // 使用新的API，通过href加载章节（使用初始化时设置的目标元素）
    await reader.value.loadChapterByHref(chapter.href, {
      showLoading: true,
      onError: (error) => {
        console.error('章节加载失败:', error);
      },
      onSuccess: () => {
        console.log('章节加载成功');
      }
    });
  } catch (error) {
    console.error('Failed to load chapter:', error);
  }
};
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
  margin: 0;
  color: #333;
}

.main {
  flex: 1;
  padding: 2rem;
}

.reader-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
  transition: opacity 0.3s ease;
}

.reader-hidden {
  opacity: 0;
  pointer-events: none;
  height: 0;
  overflow: hidden;
}

.chapter-render-area {
  grid-column: 2;
  min-height: 400px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .reader-container {
    grid-template-columns: 1fr;
  }
  
  .chapter-render-area {
    grid-column: 1;
  }
}
</style>