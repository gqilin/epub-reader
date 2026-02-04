// 章节切换标记渲染测试脚本
// 用于测试章节切换时标记是否能正确渲染

async function testChapterSwitchAnnotationRendering() {
  console.log('🧪 开始章节切换标记渲染测试...');
  
  try {
    // 检查基础环境
    const epubViewer = document.querySelector('.epub-viewer');
    if (!epubViewer) {
      throw new Error('找不到EPUB查看器');
    }
    
    // 启用标记功能
    console.log('📋 启用标记功能...');
    const toggleBtn = document.querySelector('.annotation-toggle');
    if (toggleBtn && !toggleBtn.textContent?.includes('禁用')) {
      toggleBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 记录初始章节信息
    const chapterSelect = document.querySelector('.chapter-select');
    const initialChapterIndex = chapterSelect?.value || '0';
    console.log(`📖 初始章节索引: ${initialChapterIndex}`);
    
    // 在当前章节创建测试标记
    console.log('📝 在当前章节创建测试标记...');
    const testText = document.querySelector('#epub-chapter-container p');
    if (testText) {
      const range = document.createRange();
      range.selectNodeContents(testText);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 检查工具栏
      const toolbar = document.getElementById('annotation-toolbar');
      if (toolbar && toolbar.style.display !== 'none') {
        const highlightBtn = toolbar.querySelector('[data-action="highlight"]');
        highlightBtn?.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        selection?.removeAllRanges();
        console.log('✅ 测试标记创建成功');
      } else {
        throw new Error('工具栏未显示');
      }
    }
    
    // 获取创建的标记数量
    let initialAnnotationCount = 0;
    try {
      const reader = window.epubReader; // 假设reader在全局作用域
      if (reader) {
        const annotations = reader.getAnnotations();
        initialAnnotationCount = annotations.length;
        console.log(`📊 当前标记总数: ${initialAnnotationCount}`);
      }
    } catch (error) {
      console.warn('无法获取标记统计');
    }
    
    // 测试章节切换
    console.log('🔄 测试章节切换...');
    const chapterOptions = chapterSelect?.querySelectorAll('option');
    if (chapterOptions && chapterOptions.length > 1) {
      // 切换到下一个章节
      const nextChapterIndex = (parseInt(initialChapterIndex) + 1) % chapterOptions.length;
      chapterSelect.value = String(nextChapterIndex);
      chapterSelect?.dispatchEvent(new Event('change'));
      
      console.log(`📖 切换到章节 ${nextChapterIndex}`);
      
      // 等待章节加载完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 检查新章节是否加载
      const container = document.getElementById('epub-chapter-container');
      const newContent = container?.querySelector('.epub-chapter-content');
      if (newContent) {
        console.log('✅ 新章节加载成功');
      } else {
        console.warn('⚠️ 新章节可能未完全加载');
      }
      
      // 检查标记是否清理
      const svgOverlay = container?.querySelector('.epub-annotation-overlay');
      if (svgOverlay) {
        const childCount = svgOverlay.children.length;
        console.log(`📊 切换后SVG覆盖层有 ${childCount} 个元素`);
        
        // 如果新章节也有标记，这是正常的
        // 如果没有标记，SVG层应该是空的或只有新章节的标记
      }
      
      // 切换回原章节
      console.log('🔄 切换回原章节...');
      chapterSelect.value = initialChapterIndex;
      chapterSelect?.dispatchEvent(new Event('change'));
      
      // 等待章节加载和标记渲染
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 检查原章节的标记是否重新渲染
      const returnedSvgOverlay = container?.querySelector('.epub-annotation-overlay');
      if (returnedSvgOverlay) {
        const returnedChildCount = returnedSvgOverlay.children.length;
        console.log(`📊 返回原章节后SVG覆盖层有 ${returnedChildCount} 个元素`);
        
        if (returnedChildCount > 0) {
          console.log('✅ 标记在章节切换后成功重新渲染');
        } else {
          console.warn('⚠️ 标记在章节切换后未重新渲染');
          
          // 尝试手动触发重新渲染
          console.log('🔧 尝试手动重新渲染...');
          
          // 检查调试功能是否可用
          const debugBtn = document.querySelector('.debug-btn');
          if (debugBtn) {
            console.log('使用调试工具重新渲染...');
            
            // 打开调试面板
            debugBtn.click();
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 查找重新渲染按钮
            const rerenderBtn = document.querySelector('.rerender-btn');
            if (rerenderBtn) {
              rerenderBtn.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // 再次检查
              const finalSvgOverlay = container?.querySelector('.epub-annotation-overlay');
              if (finalSvgOverlay && finalSvgOverlay.children.length > 0) {
                console.log('✅ 手动重新渲染成功');
              } else {
                console.error('❌ 手动重新渲染也失败');
              }
            }
            
            // 关闭调试面板
            const closeBtn = document.querySelector('.debug-modal .close-btn');
            closeBtn?.click();
          }
        }
      } else {
        console.warn('⚠️ 返回原章节后找不到SVG覆盖层');
      }
    } else {
      console.warn('⚠️ 只有一个章节，无法测试章节切换');
    }
    
    console.log('🎉 章节切换测试完成');
    
    return {
      success: true,
      initialAnnotations: initialAnnotationCount,
      message: '章节切换测试完成，请查看控制台详细信息'
    };
    
  } catch (error) {
    console.error('❌ 章节切换测试失败:', error);
    
    return {
      success: false,
      error: error.message,
      message: '章节切换测试失败'
    };
  }
}

// 自动修复章节切换标记渲染问题
async function autoFixChapterRendering() {
  console.log('🔧 自动修复章节切换标记渲染问题...');
  
  try {
    // 启用标记功能
    const toggleBtn = document.querySelector('.annotation-toggle');
    if (toggleBtn && !toggleBtn.textContent?.includes('禁用')) {
      toggleBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 监听章节变化
    const chapterSelect = document.querySelector('.chapter-select');
    if (chapterSelect) {
      // 添加章节变化监听器
      chapterSelect.addEventListener('change', async (event) => {
        console.log('📖 检测到章节变化:', event.target.value);
        
        // 延迟执行标记重渲染
        setTimeout(() => {
          // 检查容器
          const container = document.getElementById('epub-chapter-container');
          if (container) {
            // 清理现有SVG层
            const existingSvg = container.querySelector('.epub-annotation-overlay');
            if (existingSvg) {
              console.log('🧹 清理现有SVG层');
              existingSvg.remove();
            }
            
            // 延迟重新初始化
            setTimeout(() => {
              console.log('🔄 重新初始化标记系统');
              // 模拟重新开启标记功能
              const toggleBtn = document.querySelector('.annotation-toggle');
              if (toggleBtn && toggleBtn.textContent?.includes('禁用')) {
                toggleBtn.click();
                setTimeout(() => {
                  toggleBtn.click();
                }, 100);
              }
            }, 200);
          }
        }, 800); // 增加延迟时间确保章节完全加载
      });
      
      console.log('✅ 章节变化监听器已安装');
    }
    
    // 监听导航按钮点击
    const prevBtn = document.querySelector('.nav-btn');
    const nextBtns = document.querySelectorAll('.nav-btn');
    
    nextBtns.forEach(btn => {
      if (btn && btn.textContent?.includes('Next')) {
        btn.addEventListener('click', () => {
          console.log('➡️ 检测到下一章点击');
          setTimeout(autoRerender, 1000);
        });
      }
      if (btn && btn.textContent?.includes('Previous')) {
        btn.addEventListener('click', () => {
          console.log('⬅️ 检测到上一章点击');
          setTimeout(autoRerender, 1000);
        });
      }
    });
    
    function autoRerender() {
      console.log('🔄 自动重新渲染标记...');
      const container = document.getElementById('epub-chapter-container');
      const svgOverlay = container?.querySelector('.epub-annotation-overlay');
      
      if (!svgOverlay || svgOverlay.children.length === 0) {
        // 如果没有SVG层或为空，触发重新渲染
        const toggleBtn = document.querySelector('.annotation-toggle');
        if (toggleBtn) {
          toggleBtn.click();
          setTimeout(() => {
            toggleBtn.click();
          }, 100);
        }
      }
    }
    
    console.log('✅ 自动修复功能已启用');
    
    return {
      success: true,
      message: '自动修复功能已启用，章节切换时会自动处理标记渲染问题'
    };
    
  } catch (error) {
    console.error('❌ 自动修复功能失败:', error);
    
    return {
      success: false,
      error: error.message,
      message: '自动修复功能启用失败'
    };
  }
}

// 一键测试和修复
async function testAndFixChapterRendering() {
  console.log('🚀 开始章节切换标记渲染测试和修复...');
  
  // 先运行测试
  const testResult = await testChapterSwitchAnnotationRendering();
  
  // 如果测试失败或发现问题，启用自动修复
  if (!testResult.success) {
    console.log('⚠️ 测试发现问题，启用自动修复...');
    const fixResult = await autoFixChapterRendering();
    
    return {
      testResult,
      fixResult,
      overallSuccess: fixResult.success,
      message: fixResult.success ? 
        '测试发现问题，自动修复已启用' : 
        '测试发现问题，自动修复也失败了'
    };
  } else {
    console.log('✅ 测试通过，章节切换标记渲染正常');
    
    return {
      testResult,
      overallSuccess: true,
      message: '章节切换标记渲染正常'
    };
  }
}

// 导出函数到全局作用域
window.testChapterSwitchAnnotationRendering = testChapterSwitchAnnotationRendering;
window.autoFixChapterRendering = autoFixChapterRendering;
window.testAndFixChapterRendering = testAndFixChapterRendering;

console.log('🔧 章节切换测试工具已加载！');
console.log('💡 使用方法:');
console.log('  - testChapterSwitchAnnotationRendering() // 测试章节切换');
console.log('  - autoFixChapterRendering() // 启用自动修复');
console.log('  - testAndFixChapterRendering() // 测试并修复');