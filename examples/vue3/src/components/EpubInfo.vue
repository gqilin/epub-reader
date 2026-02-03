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
      <div class="toc-info" v-if="tableOfContents.length === 0">
        <p>No table of contents found</p>
      </div>
      <div class="toc" v-else>
        <div 
          v-for="item in tableOfContents" 
          :key="item.id"
          class="toc-item"
          @click="selectChapter(item)"
        >
          <div class="toc-title">{{ item.title }}</div>
          <div class="toc-href">{{ item.href }}</div>
          <!-- 添加CFI相关操作 -->
          <div class="toc-actions" v-if="showCFIActions">
            <button @click.stop="getChapterCFI(item)" class="cfi-btn" title="获取章节CFI">
              📍
            </button>
            <button @click.stop="jumpToCFI(item)" class="cfi-btn" title="跳转到章节">
              🔗
            </button>
          </div>
          <!-- 递归显示子目录 -->
          <div v-if="item.children && item.children.length > 0" class="toc-children">
            <div 
              v-for="child in item.children" 
              :key="child.id"
              class="toc-item toc-child"
              @click.stop="selectChapter(child)"
            >
              <div class="toc-title">{{ child.title }}</div>
              <div class="toc-href">{{ child.href }}</div>
              <div class="toc-actions">
                <button @click.stop="getChildCFI(child)" class="cfi-btn" title="获取CFI">
                  📍
                </button>
                <button @click.stop="jumpToChildCFI(child)" class="cfi-btn" title="跳转到CFI">
                  🔗
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="toc-stats">
        <small>{{ tableOfContents.length }} chapters found</small>
        <button @click="toggleCFIActions" class="cfi-toggle-btn">
          📍 CFI
        </button>
      </div>
    </div>
    
    <!-- CFI工具面板 -->
    <div v-if="showCFIActions" class="cfi-tools">
      <h4>CFI工具</h4>
      
      <div class="cfi-section">
        <h5>当前CFI</h5>
        <div class="cfi-display">
          <input 
            v-model="currentCFI" 
            placeholder="输入或显示CFI"
            class="cfi-input"
            @keyup.enter="jumpToCustomCFI"
          />
          <button @click="jumpToCustomCFI" class="cfi-jump-btn">跳转</button>
        </div>
      </div>
      
      <div class="cfi-info">
        <p><strong>CFI (Canonical Fragment Identifier)</strong></p>
        <p>CFI是EPUB3标准中的精确定位标识符，可以定位到章节内的具体位置。</p>
        <ul>
          <li>📍 点击目录项的 📍 按钮获取章节CFI</li>
          <li>🔗 点击目录项的 🔗 按钮跳转到章节位置</li>
          <li>📝 在输入框中输入CFI并按回车跳转</li>
        </ul>
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
  'chapter-selected': [chapter: EpubTableOfContents];
}>();

const metadata = ref(props.reader.getMetadata() || {});
const tableOfContents = ref(props.reader.getTableOfContents());
const coverImage = ref<string | null>(null);
const loading = ref(true);
const showCFIActions = ref(false);
const currentCFI = ref<string>('');
const showCFIInput = ref(false);

const loadCover = async () => {
  loading.value = true;
  
  try {
    coverImage.value = await props.reader.getCoverImage();
  } catch (error) {
    console.error('封面加载失败:', error);
  } finally {
    loading.value = false;
  }
};

const tryLoadCover = () => {
  loadCover();
};

const onCoverError = (event: Event) => {
  console.error('封面图片显示失败:', event);
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
};

const selectChapter = (chapter: EpubTableOfContents) => {
  emit('chapter-selected', chapter);
};

const getChapterCFI = async (chapter: EpubTableOfContents) => {
  try {
    // 先跳转到该章节
    await props.reader.loadChapterByHref(chapter.href);
    
    // 生成该章节的CFI
    const cfi = props.reader.generateCFI();
    if (cfi) {
      currentCFI.value = cfi.path;
      navigator.clipboard.writeText(cfi.path);
      console.log('章节CFI已复制到剪贴板:', cfi.path);
    }
  } catch (error) {
    console.error('获取章节CFI失败:', error);
  }
};

const jumpToCFI = async (chapter: EpubTableOfContents) => {
  try {
    // 生成该章节的基础CFI
    const cfi = props.reader.generateCFI();
    if (cfi) {
      await props.reader.jumpToCFI(cfi.path);
      console.log('跳转到CFI:', cfi.path);
    }
  } catch (error) {
    console.error('CFI跳转失败:', error);
  }
};

const getChildCFI = async (child: EpubTableOfContents) => {
  try {
    await props.reader.loadChapterByHref(child.href);
    const cfi = props.reader.generateCFI();
    if (cfi) {
      currentCFI.value = cfi.path;
      navigator.clipboard.writeText(cfi.path);
      console.log('子章节CFI已复制:', cfi.path);
    }
  } catch (error) {
    console.error('获取子章节CFI失败:', error);
  }
};

const jumpToChildCFI = async (child: EpubTableOfContents) => {
  try {
    const cfi = props.reader.generateCFI();
    if (cfi) {
      await props.reader.jumpToCFI(cfi.path);
      console.log('跳转到子章节CFI:', cfi.path);
    }
  } catch (error) {
    console.error('子章节CFI跳转失败:', error);
  }
};

const toggleCFIActions = () => {
  showCFIActions.value = !showCFIActions.value;
};

const toggleCFIInput = () => {
  showCFIInput.value = !showCFIInput.value;
};

const jumpToCustomCFI = async () => {
  try {
    if (currentCFI.value.trim()) {
      await props.reader.jumpToCFI(currentCFI.value.trim());
      console.log('跳转到自定义CFI:', currentCFI.value);
    }
  } catch (error) {
    console.error('自定义CFI跳转失败:', error);
  }
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

.toc-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
}

.toc-href {
  font-size: 0.8rem;
  color: #888;
  font-family: monospace;
}

.toc-children {
  margin-left: 1rem;
  margin-top: 0.5rem;
  border-left: 2px solid #e0e0e0;
  padding-left: 0.5rem;
}

.toc-child {
  background: #fafafa;
  margin-bottom: 0.25rem;
}

.toc-child:hover {
  background: #f5f5f5;
}

.toc-info {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
}

.toc-stats {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
  text-align: center;
  color: #888;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cfi-toggle-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cfi-toggle-btn:hover {
  background: #0056b3;
}

.cfi-tools {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-top: 1rem;
}

.cfi-tools h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
}

.cfi-section {
  margin-bottom: 1.5rem;
}

.cfi-section h5 {
  margin: 0 0 0.5rem 0;
  color: #555;
  font-size: 0.9rem;
  font-weight: 600;
}

.cfi-display {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.cfi-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.8rem;
}

.cfi-jump-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cfi-jump-btn:hover {
  background: #218838;
}

.cfi-info {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  border-left: 4px solid #007bff;
}

.cfi-info p {
  margin: 0.5rem 0;
  color: #555;
  line-height: 1.5;
}

.cfi-info ul {
  margin: 0.5rem 0 0 1rem;
  padding-left: 1.5rem;
}

.cfi-info li {
  margin-bottom: 0.25rem;
  color: #666;
}

.toc-actions {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.25rem;
}

.cfi-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cfi-btn:hover {
  background: #545b62;
}

.toc-child .toc-actions {
  margin-left: 1rem;
}
</style>