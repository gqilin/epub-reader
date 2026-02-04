// 无限循环问题测试和修复验证脚本
// 用于测试和验证无限循环问题的修复

function testInfiniteLoopFix() {
  console.log('🧪 开始无限循环问题测试...');
  
  let logCount = 0;
  const originalLog = console.log;
  let renderCalls = 0;
  let initCalls = 0;
  
  // 监听console.log，计算渲染和初始化调用次数
  console.log = function(...args) {
    const message = args.join(' ');
    
    if (message.includes('章节切换，重新渲染标记')) {
      renderCalls++;
    }
    
    if (message.includes('初始化标记功能')) {
      initCalls++;
    }
    
    // 检查是否出现无限循环迹象
    logCount++;
    if (logCount > 50) {
      console.error('🚨 检测到可能的无限循环！');
      console.error(`统计信息: 渲染调用 ${renderCalls} 次, 初始化调用 ${initCalls} 次`);
      
      // 恢复原始console.log
      console.log = originalLog;
      
      return {
        hasInfiniteLoop: true,
        renderCalls,
        initCalls,
        logCount
      };
    }
    
    originalLog.apply(console, args);
  };
  
  // 启用标记功能
  console.log('📋 启用标记功能...');
  const toggleBtn = document.querySelector('.annotation-toggle');
  if (toggleBtn && !toggleBtn.textContent?.includes('禁用')) {
    toggleBtn.click();
  }
  
  // 等待初始化完成
  setTimeout(() => {
    console.log('📖 触发章节切换...');
    
    // 模拟章节切换
    const chapterSelect = document.querySelector('.chapter-select');
    if (chapterSelect) {
      const currentOption = chapterSelect.value;
      const options = chapterSelect.querySelectorAll('option');
      
      if (options.length > 1) {
        // 切换到下一个章节
        const nextIndex = (parseInt(currentOption) + 1) % options.length;
        chapterSelect.value = String(nextIndex);
        chapterSelect.dispatchEvent(new Event('change'));
        
        console.log(`📖 切换到章节 ${nextIndex}`);
      } else {
        console.warn('⚠️ 只有一个章节，无法测试切换');
      }
    }
    
    // 等待处理完成
    setTimeout(() => {
      // 恢复原始console.log
      console.log = originalLog;
      
      if (logCount < 50) {
        console.log('✅ 未检测到无限循环，修复成功！');
        console.log(`统计信息: 渲染调用 ${renderCalls} 次, 初始化调用 ${initCalls} 次`);
        
        return {
          hasInfiniteLoop: false,
          renderCalls,
          initCalls,
          logCount,
          success: true
        };
      }
    }, 3000); // 3秒内如果超过50条日志，认为有循环
    
  }, 1000);
  
  // 设置超时保护
  setTimeout(() => {
    console.log = originalLog;
    console.log('⏰ 测试超时，可能存在问题');
    
    return {
      hasInfiniteLoop: null,
      renderCalls,
      initCalls,
      logCount,
      timeout: true
    };
  }, 5000);
}

// 手动重置渲染状态（如果卡在循环中）
function emergencyStop() {
  console.log('🚨 紧急停止！重置所有渲染状态...');
  
  try {
    // 强制清理定时器
    for (let i = 1; i < 99999; i++) {
      clearTimeout(i);
    }
    
    // 清理SVG覆盖层
    const svgElements = document.querySelectorAll('.epub-annotation-overlay');
    svgElements.forEach(element => element.remove());
    
    // 移除事件监听器（部分清理）
    const chapterSelect = document.querySelector('.chapter-select');
    if (chapterSelect) {
      const newSelect = chapterSelect.cloneNode(true);
      chapterSelect.parentNode?.replaceChild(newSelect, chapterSelect);
    }
    
    // 禁用标记功能
    const toggleBtn = document.querySelector('.annotation-toggle');
    if (toggleBtn && toggleBtn.textContent?.includes('禁用')) {
      toggleBtn.click();
    }
    
    console.log('✅ 紧急停止完成！');
    alert('✅ 紧急停止完成！已清理所有渲染状态。');
    
  } catch (error) {
    console.error('❌ 紧急停止失败:', error);
    alert('❌ 紧急停止失败: ' + error.message);
  }
}

// 状态检查工具
function checkRenderState() {
  console.log('🔍 检查当前渲染状态...');
  
  const state = {
    // 基础状态
    annotationsEnabled: !!document.querySelector('.annotation-toggle')?.textContent?.includes('禁用'),
    svgExists: !!document.querySelector('.epub-annotation-overlay'),
    toolbarExists: !!document.getElementById('annotation-toolbar'),
    
    // 章节状态
    currentChapter: document.querySelector('.chapter-select')?.value,
    totalChapters: document.querySelectorAll('.chapter-select option')?.length,
    
    // 标记数据
    annotationCount: 0,
    localStorageData: null
  };
  
  // 获取标记数据
  try {
    const storageData = localStorage.getItem('epub-annotations');
    if (storageData) {
      const parsed = JSON.parse(storageData);
      state.annotationCount = Array.isArray(parsed.annotations) ? parsed.annotations.length : 0;
      state.localStorageData = {
        size: storageData.length,
        timestamp: parsed.timestamp
      };
    }
  } catch (error) {
    console.warn('无法读取localStorage:', error);
  }
  
  console.log('📊 当前状态:', state);
  
  // 健康检查
  const health = {
    isHealthy: true,
    issues: []
  };
  
  if (state.annotationsEnabled && !state.svgExists) {
    health.isHealthy = false;
    health.issues.push('标记已启用但SVG覆盖层不存在');
  }
  
  if (state.annotationsEnabled && !state.toolbarExists) {
    health.isHealthy = false;
    health.issues.push('标记已启用但工具栏不存在');
  }
  
  if (state.annotationCount > 0 && !state.svgExists) {
    health.isHealthy = false;
    health.issues.push('有标记数据但SVG覆盖层不存在');
  }
  
  console.log('🏥 健康检查:', health);
  
  return { state, health };
}

// 性能监控
function monitorPerformance(duration = 10000) {
  console.log('⚡ 开始性能监控...');
  
  const startTime = performance.now();
  let logCount = 0;
  let maxLogsPerSecond = 0;
  let lastSecondLogs = 0;
  
  const logInterval = setInterval(() => {
    const currentLogs = logCount - lastSecondLogs;
    lastSecondLogs = logCount;
    maxLogsPerSecond = Math.max(maxLogsPerSecond, currentLogs);
    
    if (currentLogs > 10) {
      console.warn(`⚠️ 高频日志检测: ${currentLogs} logs/sec`);
    }
  }, 1000);
  
  // 监听console.log
  const originalLog = console.log;
  console.log = function(...args) {
    logCount++;
    originalLog.apply(console, args);
  };
  
  setTimeout(() => {
    clearInterval(logInterval);
    console.log = originalLog;
    
    const endTime = performance.now();
    const durationMs = endTime - startTime;
    
    const report = {
      duration: durationMs,
      totalLogs: logCount,
      averageLogsPerSecond: (logCount / (durationMs / 1000)).toFixed(2),
      maxLogsPerSecond,
      performance: logCount < 100 ? 'good' : logCount < 500 ? 'warning' : 'critical'
    };
    
    console.log('📊 性能监控报告:', report);
    
    if (report.performance === 'critical') {
      console.error('🚨 检测到性能问题，可能存在无限循环！');
      emergencyStop();
    }
    
    return report;
  }, duration);
}

// 导出测试函数
window.testInfiniteLoopFix = testInfiniteLoopFix;
window.emergencyStop = emergencyStop;
window.checkRenderState = checkRenderState;
window.monitorPerformance = monitorPerformance;

console.log('🔧 无限循环测试工具已加载！');
console.log('💡 使用方法:');
console.log('  - testInfiniteLoopFix() // 测试循环修复');
console.log('  - emergencyStop() // 紧急停止');
console.log('  - checkRenderState() // 检查状态');
console.log('  - monitorPerformance() // 性能监控');

// 自动运行基础状态检查
setTimeout(() => {
  console.log('🔍 自动状态检查:');
  checkRenderState();
}, 2000);