<template>
  <div class="epub-viewer">
    <div class="viewer-header">
      <button @click="previousChapter" :disabled="currentChapterIndex === 0" class="nav-btn">
        ← Previous
      </button>
      
      <select v-model="currentChapterIndex" class="chapter-select">
        <option v-for="(chapter, index) in chapters" :key="chapter.id" :value="index">
          {{ getChapterTitle(chapter, index) }}
        </option>
      </select>
      
      <button @click="nextChapter" :disabled="currentChapterIndex >= chapters.length - 1" class="nav-btn">
        Next →
      </button>
    </div>
    
    <div class="content-container">
      <div v-if="loading" class="loading-chapter">
        <div class="spinner"></div>
        <p>Loading chapter...</p>
      </div>
      
      <div v-else-if="error" class="error-chapter">
        <p>❌ {{ error }}</p>
        <button @click="loadCurrentChapter" class="retry-btn">Retry</button>
      </div>
      
      <div v-else class="chapter-content" v-html="chapterContent"></div>
    </div>
    
    <div class="viewer-footer">
      <span>Chapter {{ currentChapterIndex + 1 }} of {{ chapters.length }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { EpubReader, EpubChapter } from 'epub-reader-src';

interface Props {
  reader: EpubReader;
}

const props = defineProps<Props>();

const chapters = ref<EpubChapter[]>(props.reader.getChapters());
const currentChapterIndex = ref(0);
const chapterContent = ref('');
const loading = ref(false);
const error = ref('');

const loadCurrentChapter = async () => {
  if (chapters.value.length === 0) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    chapterContent.value = await props.reader.getChapterContentByIndex(currentChapterIndex.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load chapter';
  } finally {
    loading.value = false;
  }
};

const previousChapter = () => {
  if (currentChapterIndex.value > 0) {
    currentChapterIndex.value--;
  }
};

const nextChapter = () => {
  if (currentChapterIndex.value < chapters.value.length - 1) {
    currentChapterIndex.value++;
  }
};

const getChapterTitle = (chapter: EpubChapter, index: number): string => {
  const toc = props.reader.getTableOfContents();
  const tocItem = toc.find(item => item.href.includes(chapter.href.split('/').pop() || ''));
  return tocItem?.title || `Chapter ${index + 1}`;
};

watch(currentChapterIndex, loadCurrentChapter);

onMounted(loadCurrentChapter);
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
  padding: 2rem;
}

.loading-chapter {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-chapter {
  text-align: center;
  padding: 3rem;
}

.error-chapter p {
  color: #c00;
  margin-bottom: 1rem;
}

.retry-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.retry-btn:hover {
  background: #c82333;
}

.chapter-content {
  line-height: 1.6;
  font-size: 1rem;
  color: #333;
}

.chapter-content :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1rem auto;
}

.chapter-content :deep(p) {
  margin-bottom: 1rem;
}

.chapter-content :deep(h1),
.chapter-content :deep(h2),
.chapter-content :deep(h3),
.chapter-content :deep(h4),
.chapter-content :deep(h5),
.chapter-content :deep(h6) {
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #222;
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