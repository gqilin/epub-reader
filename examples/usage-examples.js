import EPUBReader from '../src/index.js';

// 示例1: 基本使用
async function basicExample() {
  console.log('=== 基本使用示例 ===');
  
  const reader = new EPUBReader();
  
  try {
    // 从文件加载EPUB
    const response = await fetch('path/to/your/book.epub');
    const arrayBuffer = await response.arrayBuffer();
    
    // 加载并解析EPUB
    const book = await reader.load(arrayBuffer);
    
    // 获取基本信息
    const metadata = reader.getMetadata();
    console.log('书名:', metadata.title);
    console.log('作者:', metadata.creator);
    console.log('语言:', metadata.language);
    
    // 获取目录
    const toc = reader.getTableOfContents();
    console.log('目录结构:', toc);
    
    // 获取章节列表
    const chapters = reader.getChapters();
    console.log('章节数量:', chapters.length);
    
    // 获取第一章内容
    if (chapters.length > 0) {
      const firstChapter = await reader.getChapter(chapters[0].id);
      console.log('第一章标题:', firstChapter.title);
      console.log('第一章字数:', firstChapter.getWordCount());
      console.log('第一章内容预览:', firstChapter.getPlainText().substring(0, 100) + '...');
    }
    
  } catch (error) {
    console.error('加载EPUB失败:', error.message);
  } finally {
    reader.destroy();
  }
}

// 示例2: 搜索功能
async function searchExample() {
  console.log('\n=== 搜索功能示例 ===');
  
  const reader = new EPUBReader();
  
  try {
    // 加载EPUB
    const response = await fetch('path/to/your/book.epub');
    const arrayBuffer = await response.arrayBuffer();
    await reader.load(arrayBuffer);
    
    // 搜索关键词
    const searchResults = await reader.search('JavaScript', {
      caseSensitive: false,
      wholeWord: false
    });
    
    console.log(`找到 ${searchResults.length} 个章节包含 "JavaScript":`);
    searchResults.forEach(result => {
      console.log(`章节: ${result.chapter.title}`);
      console.log(`匹配数量: ${result.matches.length}`);
      result.matches.forEach((match, index) => {
        console.log(`  匹配 ${index + 1}: "${match.text}"`);
        console.log(`  上下文: ${match.context}`);
      });
    });
    
  } catch (error) {
    console.error('搜索失败:', error.message);
  } finally {
    reader.destroy();
  }
}

// 示例3: 目录导航
async function navigationExample() {
  console.log('\n=== 目录导航示例 ===');
  
  const reader = new EPUBReader();
  
  try {
    // 加载EPUB
    const response = await fetch('path/to/your/book.epub');
    const arrayBuffer = await response.arrayBuffer();
    await reader.load(arrayBuffer);
    
    // 获取扁平化目录
    const toc = reader.getTableOfContents();
    const flatTOC = toc ? toc.toArray() : [];
    
    console.log('目录:');
    flatTOC.forEach((item, index) => {
      const indent = '  '.repeat(item.level);
      console.log(`${indent}${index + 1}. ${item.title}`);
    });
    
    // 通过目录导航到章节
    if (flatTOC.length > 0) {
      const firstTOCItem = flatTOC[0];
      const chapter = await reader.getChapter(firstTOCItem.href);
      console.log(`\n导航到章节: ${chapter.title}`);
      console.log('内容预览:', chapter.getPlainText().substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('导航失败:', error.message);
  } finally {
    reader.destroy();
  }
}

// 示例4: 获取书籍统计信息
async function statsExample() {
  console.log('\n=== 统计信息示例 ===');
  
  const reader = new EPUBReader();
  
  try {
    // 加载EPUB
    const response = await fetch('path/to/your/book.epub');
    const arrayBuffer = await response.arrayBuffer();
    await reader.load(arrayBuffer);
    
    const metadata = reader.getMetadata();
    const chapters = reader.getChapters();
    
    console.log('=== 书籍统计信息 ===');
    console.log('书名:', metadata.title);
    console.log('作者:', metadata.creator);
    console.log('EPUB版本:', reader.book.version);
    console.log('章节数量:', chapters.length);
    
    // 加载所有章节以获取完整统计
    let totalWords = 0;
    let totalSize = 0;
    
    for (const chapter of chapters) {
      await reader.getChapter(chapter.id);
      totalWords += chapter.getWordCount();
      totalSize += chapter.size;
    }
    
    console.log('总字数:', totalWords);
    console.log('总大小:', (totalSize / 1024).toFixed(2), 'KB');
    
    // 目录深度
    const toc = reader.getTableOfContents();
    const tocDepth = reader.book.getTOCDepth();
    console.log('目录深度:', tocDepth);
    
  } catch (error) {
    console.error('获取统计信息失败:', error.message);
  } finally {
    reader.destroy();
  }
}

// 运行所有示例
async function runAllExamples() {
  console.log('EPUBReader 使用示例\n');
  
  // 注意: 需要实际的EPUB文件路径才能运行这些示例
  console.log('注意: 这些示例需要实际的EPUB文件才能运行');
  console.log('请将示例中的文件路径替换为实际的EPUB文件路径\n');
  
  // 取消注释以下行来运行示例
  // await basicExample();
  // await searchExample();
  // await navigationExample();
  // await statsExample();
}

export {
  basicExample,
  searchExample,
  navigationExample,
  statsExample,
  runAllExamples
};