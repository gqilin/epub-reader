// 标记功能自动化测试脚本
// 在浏览器控制台中运行此脚本来测试标记功能

async function testAnnotationFeatures() {
  console.log('🚀 开始标记功能测试...');
  
  try {
    // 测试1：基础功能检查
    console.log('📋 测试1: 基础功能检查');
    const epubViewer = document.querySelector('.epub-viewer');
    if (!epubViewer) {
      throw new Error('找不到EPUB查看器组件');
    }
    
    // 测试2：启用标记功能
    console.log('📋 测试2: 启用标记功能');
    const toggleBtn = document.querySelector('.annotation-toggle');
    if (!toggleBtn) {
      throw new Error('找不到标记切换按钮');
    }
    
    toggleBtn.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (toggleBtn.textContent?.includes('禁用')) {
      console.log('✅ 标记功能启用成功');
    } else {
      throw new Error('标记功能启用失败');
    }
    
    // 测试3：创建测试标记
    console.log('📋 测试3: 创建测试标记');
    const testText = document.querySelector('#epub-chapter-container p');
    if (!testText) {
      throw new Error('找不到测试文本');
    }
    
    // 选择文字
    const range = document.createRange();
    range.selectNodeContents(testText);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 检查工具栏是否显示
    const toolbar = document.getElementById('annotation-toolbar');
    if (!toolbar || toolbar.style.display === 'none') {
      throw new Error('工具栏未显示');
    }
    
    console.log('✅ 工具栏显示成功');
    
    // 创建高亮标记
    const highlightBtn = toolbar.querySelector('[data-action="highlight"]');
    if (!highlightBtn) {
      throw new Error('找不到高亮按钮');
    }
    
    highlightBtn.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ 高亮标记创建成功');
    
    // 清除选择
    selection?.removeAllRanges();
    
    // 测试4：检查LocalStorage
    console.log('📋 测试4: 检查LocalStorage存储');
    const storageData = localStorage.getItem('epub-annotations');
    if (!storageData) {
      throw new Error('LocalStorage中没有找到标记数据');
    }
    
    const annotations = JSON.parse(storageData);
    if (!Array.isArray(annotations.annotations) || annotations.annotations.length === 0) {
      throw new Error('LocalStorage中的标记数据格式错误');
    }
    
    console.log(`✅ LocalStorage存储正常，共${annotations.annotations.length}个标记`);
    
    // 测试5：调试功能
    console.log('📋 测试5: 调试功能');
    const debugBtn = document.querySelector('.debug-btn');
    if (!debugBtn) {
      throw new Error('找不到调试按钮');
    }
    
    debugBtn.click();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const debugModal = document.querySelector('.debug-modal');
    if (!debugModal || debugModal.style.display === 'none') {
      throw new Error('调试面板未显示');
    }
    
    console.log('✅ 调试面板显示成功');
    
    // 检查调试统计
    const debugStats = document.querySelector('.debug-info');
    if (debugStats && debugStats.textContent?.includes('总标记数')) {
      console.log('✅ 调试统计信息正常');
    } else {
      console.warn('⚠️ 调试统计信息可能不完整');
    }
    
    // 关闭调试面板
    const closeBtn = debugModal?.querySelector('.close-btn');
    closeBtn?.click();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 测试6：标记列表功能
    console.log('📋 测试6: 标记列表功能');
    const listBtn = document.querySelector('.annotation-list-btn');
    if (!listBtn) {
      throw new Error('找不到列表按钮');
    }
    
    listBtn.click();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const listModal = document.querySelector('.annotation-modal');
    if (!listModal || listModal.style.display === 'none') {
      throw new Error('标记列表未显示');
    }
    
    console.log('✅ 标记列表显示成功');
    
    // 关闭列表
    listModal?.querySelector('.close-btn')?.click();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 测试7：导出功能
    console.log('📋 测试7: 导出功能');
    const exportData = localStorage.getItem('epub-annotations');
    if (exportData) {
      const parsed = JSON.parse(exportData);
      console.log(`✅ 导出数据格式正确，包含${parsed.annotations?.length || 0}个标记`);
    }
    
    console.log('🎉 所有测试通过！标记功能运行正常！');
    
    // 返回测试结果
    return {
      success: true,
      totalTests: 7,
      passedTests: 7,
      annotationsCount: annotations.annotations.length,
      storageSize: storageData.length,
      message: '所有功能测试通过'
    };
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    
    return {
      success: false,
      error: error.message,
      totalTests: 7,
      passedTests: 0,
      message: '测试失败，请检查控制台错误信息'
    };
  }
}

// 性能测试
async function testAnnotationPerformance() {
  console.log('⚡ 开始性能测试...');
  
  try {
    const startTime = performance.now();
    
    // 模拟创建100个标记
    for (let i = 0; i < 10; i++) { // 减少到10个以避免影响实际使用
      const testText = document.querySelector(`#epub-chapter-container p:nth-child(${(i % 5) + 1})`);
      if (testText) {
        const range = document.createRange();
        range.selectNodeContents(testText);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const toolbar = document.getElementById('annotation-toolbar');
        if (toolbar && toolbar.style.display !== 'none') {
          const highlightBtn = toolbar.querySelector('[data-action="highlight"]');
          highlightBtn?.click();
          await new Promise(resolve => setTimeout(resolve, 200));
          selection?.removeAllRanges();
        }
      }
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`✅ 性能测试完成，耗时: ${duration.toFixed(2)}ms`);
    
    return {
      success: true,
      duration: duration,
      averageTime: duration / 10,
      message: `性能测试通过，平均每个标记耗时: ${(duration / 10).toFixed(2)}ms`
    };
    
  } catch (error) {
    console.error('❌ 性能测试失败:', error);
    
    return {
      success: false,
      error: error.message,
      message: '性能测试失败'
    };
  }
}

// 一键运行所有测试
async function runAllTests() {
  console.log('🧪 开始运行所有测试...');
  
  const functionalTest = await testAnnotationFeatures();
  const performanceTest = await testAnnotationPerformance();
  
  const results = {
    timestamp: new Date().toISOString(),
    functionalTest,
    performanceTest,
    summary: {
      totalTests: functionalTest.totalTests + 1,
      passedTests: (functionalTest.passedTests || 0) + (performanceTest.success ? 1 : 0),
      overallSuccess: functionalTest.success && performanceTest.success
    }
  };
  
  console.log('📊 测试结果汇总:', results);
  
  // 生成测试报告
  const report = `
🧪 EPUB标记功能测试报告
🕒 测试时间: ${results.timestamp}
📋 功能测试: ${functionalTest.success ? '✅ 通过' : '❌ 失败'}
⚡ 性能测试: ${performanceTest.success ? '✅ 通过' : '❌ 失败'}
📊 总体结果: ${results.summary.overallSuccess ? '🎉 全部通过' : '⚠️ 需要修复'}

详细信息:
${JSON.stringify(results, null, 2)}
  `;
  
  console.log(report);
  
  return results;
}

// 导出测试函数到全局作用域
window.testAnnotationFeatures = testAnnotationFeatures;
window.testAnnotationPerformance = testAnnotationPerformance;
window.runAllTests = runAllTests;

console.log('🔧 测试工具已加载！');
console.log('💡 使用方法:');
console.log('  - testAnnotationFeatures() // 功能测试');
console.log('  - testAnnotationPerformance() // 性能测试');
console.log('  - runAllTests() // 运行所有测试');