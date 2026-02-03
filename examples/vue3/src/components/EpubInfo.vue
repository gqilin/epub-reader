<template>
  <div class="epub-info">
    <div class="info-card">
      <h3>Book Information</h3>
      
      <div class="cover-container">
        <img v-if="coverImage" :src="coverImage" alt="Book cover" class="cover-image" />
        <div v-else class="cover-placeholder">No Cover</div>
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

onMounted(async () => {
  try {
    coverImage.value = await props.reader.getCoverImage();
  } catch (error) {
    console.warn('Failed to load cover image:', error);
  }
});
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

.cover-placeholder {
  width: 200px;
  height: 280px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  border-radius: 4px;
  margin: 0 auto;
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