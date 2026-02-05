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
        :default-expand-all="false"
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
  label: 'label'
}

const convertTocToTreeData = (toc: EpubTableOfContents[], prefix = ''): TreeNode[] => {
  return toc.map((item, index) => {
    const label = `${prefix}${index + 1}. ${item.title}`
    const node: TreeNode = {
      id: item.href || `toc-${index}`,
      label,
      chapter: item
    }
    
    if (item.subitems && item.subitems.length > 0) {
      node.children = convertTocToTreeData(item.subitems, `${prefix}${index + 1}.`)
    }
    
    return node
  })
}

const handleNodeClick = (data: TreeNode) => {
  if (data.chapter && data.chapter.href) {
    emit('chapterSelected', data.chapter)
  }
}

onMounted(async () => {
  try {
    const toc = await props.reader.getTableOfContents()
    tocData.value = convertTocToTreeData(toc)
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
  border-bottom: 1px solid var(--border-color);
  background: #fafafa;
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.toc-tree {
  padding: 8px;
}

.tree-node {
  flex: 1;
  padding: 4px 0;
  
  .node-title {
    font-size: 14px;
    color: var(--text-regular);
    cursor: pointer;
    
    &:hover {
      color: var(--primary-color);
    }
  }
}

:deep(.el-tree-node__content) {
  padding: 6px 0;
  
  &:hover {
    background-color: #f5f7fa;
  }
}

:deep(.el-tree-node__expand-icon) {
  padding: 6px;
}
</style>