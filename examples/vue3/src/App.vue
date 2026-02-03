<template>
  <div class="app">
    <header class="header">
      <h1>EPUB Reader Vue 3 Example</h1>
    </header>
    
    <main class="main">
      <EpubLoader @loaded="onEpubLoaded" v-if="!reader" />
      
      <div v-if="reader" class="reader-container">
        <EpubInfo :reader="reader" />
        <EpubViewer :reader="reader" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { EpubReader } from 'epub-reader-src';
import EpubLoader from './components/EpubLoader.vue';
import EpubInfo from './components/EpubInfo.vue';
import EpubViewer from './components/EpubViewer.vue';

const reader = ref<EpubReader | null>(null);

const onEpubLoaded = (epubReader: EpubReader) => {
  reader.value = epubReader;
  console.log('Epub loaded', epubReader);
  
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
}

@media (max-width: 768px) {
  .reader-container {
    grid-template-columns: 1fr;
  }
}
</style>