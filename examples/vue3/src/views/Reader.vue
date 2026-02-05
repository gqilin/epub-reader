<template>
  <div class="layout-container">
    <!-- 顶部导航 -->
    <header class="layout-header">
      <div class="header-left">
        <el-button 
          :icon="Menu" 
          @click="toggleLeftSidebar"
          text 
          class="sidebar-toggle"
        />
        <h1 class="app-title">EPUB Reader</h1>
      </div>
      
      <div class="header-right">
        <el-dropdown @command="handleThemeChange">
          <el-button :icon="Setting" circle />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="light">
                <el-icon><Sunny /></el-icon> 浅色主题
              </el-dropdown-item>
              <el-dropdown-item command="dark">
                <el-icon><Moon /></el-icon> 深色主题
              </el-dropdown-item>
              <el-dropdown-item command="sepia">
                <el-icon><Reading /></el-icon> 护眼主题
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <el-button 
          :icon="View" 
          @click="toggleRightSidebar"
          text 
          class="sidebar-toggle"
        />
      </div>
    </header>

    <!-- 主内容区域 -->
    <div class="layout-main">
      <!-- 左侧目录 -->
      <aside class="layout-sidebar-left" :class="{ show: leftSidebarVisible }">
        <TableOfContents 
          v-if="reader"
          :reader="reader" 
          @chapter-selected="onChapterSelected" 
        />
        <EpubLoader v-else @loaded="onEpubLoaded" />
      </aside>

      <!-- 中间内容区域 -->
      <main class="layout-content">
        <div class="epub-reader-area">
          <EpubViewer 
            v-if="reader" 
            :reader="reader" 
            :theme="currentTheme"
          />
        </div>
      </main>

      <!-- 右侧边栏 -->
      <aside class="layout-sidebar-right" :class="{ show: rightSidebarVisible }">
        <SidePanelTabs 
          v-if="reader"
          :reader="reader"
        />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  Menu, 
  Setting, 
  View, 
  Sunny, 
  Moon, 
  Reading 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { EpubReader } from 'epub-reader-src'
import { EpubTableOfContents } from 'epub-reader-src'
import EpubLoader from '../components/EpubLoader.vue'
import EpubViewer from '../components/EpubViewer.vue'
import TableOfContents from '../components/TableOfContents.vue'
import SidePanelTabs from '../components/SidePanelTabs.vue'

const reader = ref<EpubReader | null>(null)
const leftSidebarVisible = ref(true)
const rightSidebarVisible = ref(true)
const currentTheme = ref('light')

const onEpubLoaded = (epubReader: EpubReader) => {
  console.log('EpubReader loaded:', epubReader)
  reader.value = epubReader
}

const onChapterSelected = async (chapter: EpubTableOfContents) => {
  if (!reader.value || !chapter.href) return
  
  try {
    await reader.value.loadChapterByHref(chapter.href, {
      showLoading: true,
      onError: (error) => {
        ElMessage.error(`章节加载失败: ${error}`)
      },
      onSuccess: () => {
        ElMessage.success('章节加载成功')
      }
    })
  } catch (error) {
    ElMessage.error(`加载失败: ${error}`)
  }
}

const toggleLeftSidebar = () => {
  leftSidebarVisible.value = !leftSidebarVisible.value
}

const toggleRightSidebar = () => {
  rightSidebarVisible.value = !rightSidebarVisible.value
}

const handleThemeChange = (theme: string) => {
  currentTheme.value = theme
  ElMessage.success(`已切换到${theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '护眼'}主题`)
}

onMounted(() => {
  // 检测窗口大小，自动调整侧边栏状态
  const checkScreenSize = () => {
    if (window.innerWidth <= 768) {
      leftSidebarVisible.value = false
      rightSidebarVisible.value = false
    } else if (window.innerWidth <= 1200) {
      rightSidebarVisible.value = false
    } else {
      leftSidebarVisible.value = true
      rightSidebarVisible.value = true
    }
  }
  
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})
</script>

<style lang="scss" scoped>
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.layout-header {
  height: var(--header-height);
  background: white;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar-toggle {
  font-size: 18px;
}

.layout-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.layout-sidebar-left {
  width: var(--sidebar-width);
  background: white;
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  transition: transform 0.3s ease;
}

.layout-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout-sidebar-right {
  width: var(--right-sidebar-width);
  background: white;
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
}

.epub-reader-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #fafafa;
}

// 响应式设计
@media (max-width: 1200px) {
  .layout-sidebar-right {
    position: absolute;
    right: 0;
    top: var(--header-height);
    height: calc(100vh - var(--header-height));
    transform: translateX(100%);
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
    z-index: 50;
  }
  
  .layout-sidebar-right.show {
    transform: translateX(0);
  }
}

@media (max-width: 768px) {
  .layout-sidebar-left {
    position: absolute;
    left: 0;
    top: var(--header-height);
    height: calc(100vh - var(--header-height));
    transform: translateX(-100%);
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    z-index: 50;
  }
  
  .layout-sidebar-left.show {
    transform: translateX(0);
  }
  
  .layout-sidebar-right {
    width: 100%;
  }
}
</style>