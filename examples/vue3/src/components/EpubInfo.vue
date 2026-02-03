<template>
  <div class="epub-info">
    <div class="info-card">
      <h3>Book Information</h3>
      
      <div class="cover-container">
        <div v-if="loading" class="cover-loading">
          <div class="cover-spinner"></div>
          <p>Loading cover...</p>
        </div>
        <img v-else-if="coverImage" :src="coverImage" alt="Book cover" class="cover-image" @load="onCoverLoad" @error="onCoverError" />
        <div v-else class="cover-placeholder" @click="tryLoadCover">
          <div class="no-cover-icon">📚</div>
          <div>No Cover</div>
          <div class="retry-text">Click to retry</div>
        </div>
      </div>
      
      <div class="book-details">
        <div class="detail-item" v-if="metadata.title">
          <strong>Title:</strong> {{ metadata.title }}
        </div>
        <div class="detail-item" v-if="metadata.creator">
          <strong>Author:</strong> {{ metadata.creator }}
        </div>
        <div class="detail-item" v-if="metadata.description">
          <strong>Description:</strong> 
          <p class="description">{{ metadata.description }}</p>
        </div>
        <div class="detail-item" v-if="metadata.publisher">
          <strong>Publisher:</strong> {{ metadata.publisher }}
        </div>
        <div class="detail-item" v-if="metadata.language">
          <strong>Language:</strong> {{ metadata.language }}
        </div>
        <div class="detail-item" v-if="metadata.date">
          <strong>Date:</strong> {{ metadata.date }}
        </div>
      </div>
    </div>
    
    <div class="toc-card">
      <h3>Table of Contents</h3>
      <div class="toc">
        <div 
          v-for="item in tableOfContents" 
          :key="item.id"
          class="toc-item"
          @click="$emit('chapter-selected', item.href)"
        >
          {{ item.title }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { EpubReader } from 'epub-reader-src';

interface Props {
  reader: EpubReader;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'chapter-selected': [href: string];
}>();

const metadata = ref(props.reader.getMetadata() || {});
const tableOfContents = ref(props.reader.getTableOfContents());
const coverImage = ref<string | null>(null);
const loading = ref(true);

const loadCover = async () => {
  console.group('🖼️ EpubInfo: 开始加载封面');
  loading.value = true;
  
  try {
    console.log('🔍 开始封面加载流程...');
    coverImage.value = await props.reader.getCoverImage();
    
    if (coverImage.value) {
      console.log('✅ 封面加载成功');
      console.log('📋 封面URL长度:', coverImage.value.length);
      console.log('🖼️ 封面URL前缀:', coverImage.value.substring(0, 50) + '...');
    } else {
      console.warn('⚠️ 封面未找到');
    }
  } catch (error) {
    console.error('❌ 封面加载失败:', error);
  } finally {
    loading.value = false;
    console.groupEnd();
  }
};

const tryLoadCover = () => {
  console.log('🔄 用户点击重试加载封面');
  loadCover();
};

const onCoverLoad = () => {
  console.log('✅ 封面图片加载完成');
};

const onCoverError = (event: Event) => {
  console.error('❌ 封面图片显示失败:', event);
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
};

onMounted(loadCover);
</script>

<style scoped>
.epub-info {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card, .toc-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.info-card h3, .toc-card h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.2rem;
}

.cover-container {
  text-align: center;
  margin-bottom: 1.5rem;
}

.cover-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.cover-loading {
  width: 200px;
  height: 280px;
  background: #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  border-radius: 4px;
  margin: 0 auto;
}

.cover-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.cover-placeholder {
  width: 200px;
  height: 280px;
  background: #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  border-radius: 4px;
  margin: 0 auto;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px dashed #ccc;
}

.cover-placeholder:hover {
  background: #e8e8e8;
  border-color: #007bff;
}

.no-cover-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.retry-text {
  font-size: 0.8rem;
  color: #007bff;
  margin-top: 0.5rem;
}

.book-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-item {
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item strong {
  color: #555;
}

.description {
  margin: 0.5rem 0 0 0;
  line-height: 1.5;
  color: #666;
  font-style: italic;
}

.toc {
  max-height: 400px;
  overflow-y: auto;
}

.toc-item {
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.toc-item:hover {
  background: #f0f0f0;
}

.toc-item:active {
  background: #e0e0e0;
}
</style>