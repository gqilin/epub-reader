<template>
  <div class="table-of-contents">
    <div class="toc-header">
      <h3>目录</h3>
    </div>
    
    <el-scrollbar height="calc(100vh - 120px)">
      <el-tree
        :data="tocData"
        :props="defaultProps"
        node-key="id"
        :default-expand-all="true"
        :expand-on-click-node="false"
        @node-click="handleNodeClick"
        class="toc-tree"
      >
        <template #default="{ node, data }">
          <div class="tree-node">
            <span class="node-title">{{ node.label }}</span>
          </div>
        </template>
      </el-tree>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { EpubReader, EpubTableOfContents } from 'epub-reader-src'
import { ElMessage } from 'element-plus'

interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
  chapter?: EpubTableOfContents
}

const props = defineProps<{
  reader: EpubReader
}>()

const emit = defineEmits<{
  chapterSelected: [chapter: EpubTableOfContents]
}>()

const tocData = ref<TreeNode[]>([])

const defaultProps = {
  children: 'children',
  label: 'title'
}


const handleNodeClick = (data: TreeNode) => {
  if (data.chapter && data.chapter.href) {
    emit('chapterSelected', data.chapter)
  }
}

onMounted(async () => {
  try {
    const toc = await props.reader.getTableOfContents()
    console.log('Table of contents:', toc)
    tocData.value = toc
  } catch (error) {
    ElMessage.error('获取目录失败')
    console.error('Failed to get table of contents:', error)
  }
})
</script>

<style lang="scss" scoped>
.table-of-contents {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toc-header {
  padding: 16px;
  border-bottom: 1px solid #e1e8ed;
  background: #ffffff;
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #2c3e50;
  }
}

.toc-tree {
  padding: 8px;
  background: #ffffff;
}

.tree-node {
  flex: 1;
  padding: 4px 0;
  
  .node-title {
    font-size: 14px;
    color: #5a6c7d;
    cursor: pointer;
    padding: 6px 8px;
    border-radius: 4px;
    transition: all 0.2s ease;
    
    &:hover {
      color: #409eff;
      background: #f0f7ff;
    }
  }
}

:deep(.el-tree-node__content) {
  padding: 4px 0;
  
  &:hover {
    background: #f8fafc;
  }
}

:deep(.el-tree-node__expand-icon) {
  padding: 4px;
  color: #a0aec0;
  
  &:hover {
    color: #409eff;
  }
}

:deep(.el-tree-node__children) {
  margin-left: 12px;
}
</style>