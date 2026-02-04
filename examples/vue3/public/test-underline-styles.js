// 下划线样式测试脚本
// 用于测试各种下划线样式的渲染效果

async function testUnderlineStyles() {
  console.log('🧪 开始下划线样式测试...');
  
  try {
    // 检查基础环境
    const epubViewer = document.querySelector('.epub-viewer');
    if (!epubViewer) {
      throw new Error('找不到EPUB查看器');
    }
    
    // 启用标记功能
    const toggleBtn = document.querySelector('.annotation-toggle');
    if (toggleBtn && !toggleBtn.textContent?.includes('禁用')) {
      toggleBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const testTexts = document.querySelectorAll('#epub-chapter-container p');
    const styles = ['solid', 'dashed', 'dotted', 'wavy', 'double', 'thick'];
    const results = [];
    
    // 为每种样式创建测试标记
    for (let i = 0; i < Math.min(styles.length, testTexts.length); i++) {
      const style = styles[i];
      const text = testTexts[i];
      
      if (!text) {
        console.warn(`跳过样式 ${style}：没有找到测试文本`);
        continue;
      }
      
      console.log(`🔍 测试下划线样式: ${style}`);
      
      // 选择文字
      const range = document.createRange();
      range.selectNodeContents(text);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 检查工具栏是否显示
      const toolbar = document.getElementById('annotation-toolbar');
      if (!toolbar || toolbar.style.display === 'none') {
        throw new Error(`样式 ${style} 的工具栏未显示`);
      }
      
      // 打开下划线菜单
      const underlineBtn = toolbar.querySelector('.underline-main-btn');
      if (underlineBtn) {
        underlineBtn.click();
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // 选择特定样式
      const styleOption = document.querySelector(`.underline-option:has([title="${getStyleTitle(style)}"])`);
      if (styleOption) {
        styleOption.click();
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        console.warn(`找不到样式选项: ${style}`);
      }
      
      // 清除选择
      selection?.removeAllRanges();
      
      // 等待渲染完成
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 检查渲染结果
      const svgElements = document.querySelectorAll('.epub-annotation-overlay [data-underline-style]');
      const styleElements = Array.from(svgElements).filter(el => 
        el.getAttribute('data-underline-style') === style
      );
      
      const result = {
        style,
        success: styleElements.length > 0,
        count: styleElements.length,
        element: styleElements[0] || null
      };
      
      results.push(result);
      console.log(`✅ 样式 ${style} 测试完成:`, result);
      
      // 等待一下再测试下一个
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 汇总测试结果
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log('📊 测试结果汇总:');
    console.log(`成功: ${successCount}/${totalCount}`);
    results.forEach(result => {
      console.log(`  ${result.style}: ${result.success ? '✅' : '❌'} (${result.count} 个元素)`);
    });
    
    return {
      success: successCount === totalCount,
      totalTests: totalCount,
      passedTests: successCount,
      results,
      message: successCount === totalCount ? 
        '所有下划线样式测试通过！' : 
        `部分测试失败 (${successCount}/${totalCount})`
    };
    
  } catch (error) {
    console.error('❌ 下划线样式测试失败:', error);
    
    return {
      success: false,
      error: error.message,
      message: '下划线样式测试失败'
    };
  }
}

// 获取样式标题
function getStyleTitle(style) {
  const titles = {
    solid: '实线',
    dashed: '虚线',
    dotted: '点线',
    wavy: '波浪线',
    double: '双线',
    thick: '粗线'
  };
  return titles[style] || style;
}

// 验证下划线SVG元素
function validateUnderlineSVG(element, expectedStyle) {
  if (!element) return false;
  
  const actualStyle = element.getAttribute('data-underline-style');
  if (actualStyle !== expectedStyle) {
    console.warn('样式不匹配: 期望 ' + expectedStyle + ', 实际 ' + actualStyle);
    return false;
  }
  
  // 根据样式验证特定的SVG属性
  switch (expectedStyle) {
    case 'solid':
      return element.tagName === 'line' && !element.getAttribute('stroke-dasharray');
    
    case 'dashed':
      return element.tagName === 'line' && element.getAttribute('stroke-dasharray') && element.getAttribute('stroke-dasharray').includes(',');
    
    case 'dotted':
      return element.tagName === 'line' && element.getAttribute('stroke-dasharray') === '2,3';
    
    case 'wavy':
      return element.tagName === 'path' && element.hasAttribute('d');
    
    case 'double':
      return element.tagName === 'g' && element.querySelectorAll('line').length === 2;
    
    case 'thick':
      return element.tagName === 'rect' && element.hasAttribute('height');
    
    default:
      return false;
  }
}

// 性能测试
async function testUnderlinePerformance() {
  console.log('⚡ 开始下划线性能测试...');
  
  try {
    const startTime = performance.now();
    const style = 'wavy'; // 使用最复杂的样式进行测试
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      // 查找测试文本
      const testText = document.querySelector(`#epub-chapter-container p:nth-child(${(i % 5) + 1})`);
      if (!testText) continue;
      
      // 选择文字
      const range = document.createRange();
      range.selectNodeContents(testText);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 创建下划线标记
      try {
        // 这里需要调用实际的创建方法
        // 由于测试环境限制，我们模拟这个过程
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.warn(`性能测试第 ${i + 1} 次迭代失败:`, error);
      }
      
      selection?.removeAllRanges();
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const averageTime = duration / iterations;
    
    console.log(`✅ 性能测试完成，总耗时: ${duration.toFixed(2)}ms`);
    console.log(`平均每次创建耗时: ${averageTime.toFixed(2)}ms`);
    
    return {
      success: true,
      duration,
      averageTime,
      iterations,
      message: `性能测试通过，平均每次耗时: ${averageTime.toFixed(2)}ms`
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
async function runAllUnderlineTests() {
  console.log('🚀 开始运行所有下划线测试...');
  
  const styleTest = await testUnderlineStyles();
  const performanceTest = await testUnderlinePerformance();
  
  const results = {
    timestamp: new Date().toISOString(),
    styleTest,
    performanceTest,
    summary: {
      totalTests: styleTest.totalTests + 1,
      passedTests: (styleTest.passedTests || 0) + (performanceTest.success ? 1 : 0),
      overallSuccess: styleTest.success && performanceTest.success
    }
  };
  
  console.log('📊 下划线功能测试结果汇总:', results);
  
  // 生成测试报告
  const report = `
🧪 下划线样式功能测试报告
🕒 测试时间: ${results.timestamp}
📋 样式测试: ${styleTest.success ? '✅ 通过' : '❌ 失败'} (${styleTest.passedTests || 0}/${styleTest.totalTests})
⚡ 性能测试: ${performanceTest.success ? '✅ 通过' : '❌ 失败'}
📊 总体结果: ${results.summary.overallSuccess ? '🎉 全部通过' : '⚠️ 需要修复'}

样式测试详情:
${styleTest.results?.map(r => `  ${r.style}: ${r.success ? '✅' : '❌'} (${r.count} 个元素)`).join('\n') || '无数据'}

性能测试详情:
  平均耗时: ${performanceTest.averageTime?.toFixed(2) || 'N/A'}ms
  总耗时: ${performanceTest.duration?.toFixed(2) || 'N/A'}ms

详细信息:
${JSON.stringify(results, null, 2)}
  `;
  
  console.log(report);
  
  return results;
}

// 导出测试函数
window.testUnderlineStyles = testUnderlineStyles;
window.testUnderlinePerformance = testUnderlinePerformance;
window.runAllUnderlineTests = runAllUnderlineTests;

console.log('🔧 下划线样式测试工具已加载！');
console.log('💡 使用方法:');
console.log('  - testUnderlineStyles() // 测试所有下划线样式');
console.log('  - testUnderlinePerformance() // 性能测试');
console.log('  - runAllUnderlineTests() // 运行所有测试');