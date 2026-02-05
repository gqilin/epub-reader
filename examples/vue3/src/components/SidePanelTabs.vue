<template>
  <div class="side-panel-tabs">
    <el-tabs v-model="activeTab" type="border-card" class="tabs-container">
      <!-- 笔记标签页 -->
      <el-tab-pane label="笔记" name="notes">
        <div class="tab-content">
          <div class="tab-header">
            <el-button 
              type="primary" 
              size="small" 
              :icon="Plus" 
              @click="addNote"
            >
              添加笔记
            </el-button>
          </div>
          
          <el-scrollbar height="calc(100vh - 200px)">
            <div class="notes-list">
              <div 
                v-for="note in notes" 
                :key="note.id"
                class="note-item"
                @click="editNote(note)"
              >
                <div class="note-header">
                  <span class="note-time">{{ formatTime(note.createdAt) }}</span>
                  <el-button 
                    :icon="Delete" 
                    text 
                    size="small"
                    @click.stop="deleteNote(note.id)"
                  />
                </div>
                <div class="note-content">{{ note.content }}</div>
                <div class="note-location">{{ note.location }}</div>
              </div>
              
              <el-empty v-if="notes.length === 0" description="暂无笔记" />
            </div>
          </el-scrollbar>
        </div>
      </el-tab-pane>

      <!-- 书签标签页 -->
      <el-tab-pane label="书签" name="bookmarks">
        <div class="tab-content">
          <div class="tab-header">
            <el-button 
              type="primary" 
              size="small" 
              :icon="Plus" 
              @click="addBookmark"
            >
              添加书签
            </el-button>
          </div>
          
          <el-scrollbar height="calc(100vh - 200px)">
            <div class="bookmarks-list">
              <div 
                v-for="bookmark in bookmarks" 
                :key="bookmark.id"
                class="bookmark-item"
              >
                <div class="bookmark-header">
                  <span class="bookmark-title">{{ bookmark.title }}</span>
                  <el-button 
                    :icon="Delete" 
                    text 
                    size="small"
                    @click="deleteBookmark(bookmark.id)"
                  />
                </div>
                <div class="bookmark-location">{{ bookmark.location }}</div>
                <div class="bookmark-time">{{ formatTime(bookmark.createdAt) }}</div>
              </div>
              
              <el-empty v-if="bookmarks.length === 0" description="暂无书签" />
            </div>
          </el-scrollbar>
        </div>
      </el-tab-pane>

      <!-- 高亮标签页 -->
      <el-tab-pane label="高亮" name="highlights">
        <div class="tab-content">
          <div class="tab-header">
            <el-button 
              type="primary" 
              size="small" 
              :icon="Plus" 
              @click="addHighlight"
            >
              添加高亮
            </el-button>
          </div>
          
          <el-scrollbar height="calc(100vh - 200px)">
            <div class="highlights-list">
              <div 
                v-for="highlight in highlights" 
                :key="highlight.id"
                class="highlight-item"
              >
                <div 
                  class="highlight-text"
                  :style="{ backgroundColor: highlight.color }"
                >
                  {{ highlight.text }}
                </div>
                <div class="highlight-location">{{ highlight.location }}</div>
                <div class="highlight-time">{{ formatTime(highlight.createdAt) }}</div>
              </div>
              
              <el-empty v-if="highlights.length === 0" description="暂无高亮" />
            </div>
          </el-scrollbar>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { EpubReader } from 'epub-reader-src'

interface Note {
  id: string
  content: string
  location: string
  createdAt: Date
}

interface Bookmark {
  id: string
  title: string
  location: string
  href: string
  createdAt: Date
}

interface Highlight {
  id: string
  text: string
  location: string
  color: string
  createdAt: Date
}

const props = defineProps<{
  reader: EpubReader
}>()

const activeTab = ref('notes')
const notes = ref<Note[]>([])
const bookmarks = ref<Bookmark[]>([])
const highlights = ref<Highlight[]>([])

// 模拟数据
const mockNotes: Note[] = [
  {
    id: '1',
    content: '这里有一个重要的概念需要理解...',
    location: '第3章 45页',
    createdAt: new Date('2024-01-15')
  },
  {
    id: '2',
    content: '作者的观点很有见地',
    location: '第5章 120页',
    createdAt: new Date('2024-01-16')
  }
]

const mockBookmarks: Bookmark[] = [
  {
    id: '1',
    title: '第3章 - 重要概念',
    location: '第3章 45页',
    href: 'chapter3.html',
    createdAt: new Date('2024-01-15')
  }
]

const mockHighlights: Highlight[] = [
  {
    id: '1',
    text: '这是一段重要的文本，需要特别关注',
    location: '第3章 45页',
    color: '#fff3cd',
    createdAt: new Date('2024-01-15')
  }
]

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const addNote = () => {
  ElMessage.success('笔记功能开发中...')
}

const editNote = (note: Note) => {
  ElMessage.info(`编辑笔记: ${note.content}`)
}

const deleteNote = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个笔记吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    notes.value = notes.value.filter(note => note.id !== id)
    ElMessage.success('笔记已删除')
  } catch {
    // 用户取消删除
  }
}

const addBookmark = () => {
  ElMessage.success('书签功能开发中...')
}

const deleteBookmark = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个书签吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    bookmarks.value = bookmarks.value.filter(bookmark => bookmark.id !== id)
    ElMessage.success('书签已删除')
  } catch {
    // 用户取消删除
  }
}

const addHighlight = () => {
  ElMessage.success('高亮功能开发中...')
}

onMounted(() => {
  // 加载模拟数据
  notes.value = mockNotes
  bookmarks.value = mockBookmarks
  highlights.value = mockHighlights
})
</script>

<style lang="scss" scoped>
.side-panel-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tabs-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  
  :deep(.el-tabs__content) {
    flex: 1;
    padding: 0;
  }
  
  :deep(.el-tab-pane) {
    height: 100%;
  }
}

.tab-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: #fafafa;
}

.notes-list,
.bookmarks-list,
.highlights-list {
  padding: 16px;
}

.note-item,
.bookmark-item,
.highlight-item {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
}

.note-header,
.bookmark-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.note-time,
.bookmark-time,
.highlight-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.note-content,
.bookmark-title {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 6px;
  line-height: 1.4;
}

.note-location,
.bookmark-location,
.highlight-location {
  font-size: 12px;
  color: var(--text-regular);
  margin-top: 8px;
}

.highlight-text {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 8px;
}
</style>