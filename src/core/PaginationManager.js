/**
 * EPUBReader 翻页管理器
 * 使用CSS columns布局实现分栏，CSS transform实现翻页动画
 */

class PaginationManager {
  constructor(options = {}) {
    // DOM元素
    this.container = options.container || null;
    this.contentArea = options.contentArea || null;
    
    // 配置选项
    this.options = {
      mode: options.mode || 'scroll', // 'scroll' | 'pagination'
      columnWidth: options.columnWidth || null, // 单列宽度，null则自动计算
      columnGap: options.columnGap || 40,
      padding: options.padding || { top: 20, right: 40, bottom: 20, left: 40 },
      animate: options.animate !== false,
      animationDuration: options.animationDuration || 300,
      showControls: options.showControls !== false,
      showProgress: options.showProgress !== false,
      clickToNavigate: options.clickToNavigate !== false,
      continuousPagination: options.continuousPagination !== false,
      ...options
    };
    
    // 状态
    this.state = {
      currentPage: 0,
      totalPages: 0,
      isAnimating: false,
      chapterContent: null,
      content: null // 内容元素
    };
    
    // 事件回调
    this.onPageChange = options.onPageChange || null;
    this.onPaginationReady = options.onPaginationReady || null;
    this.onChapterChangeRequest = options.onChapterChangeRequest || null;
    
    // 绑定方法
    this.handleResize = this.handleResize.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    
    // 初始化
    if (this.options.mode === 'pagination') {
      this.init();
    }
  }
  
  /**
   * 初始化翻页模式
   */
  init() {
    if (!this.contentArea) return;
    
    this.setupContainer();
    this.bindEvents();
    this.injectStyles();
  }
  
  /**
   * 设置翻页容器结构
   */
  setupContainer() {
    // 保存原始内容
    const originalContent = this.contentArea.innerHTML;
    
    // 清空并创建翻页结构
    this.contentArea.innerHTML = '';
    this.contentArea.classList.add('epub-pagination-container');
    
    // 创建内容区域（使用columns布局）
    this.state.content = document.createElement('div');
    this.state.content.className = 'epub-pagination-content';
    this.state.content.innerHTML = originalContent;
    
    // 添加到内容区域
    this.contentArea.appendChild(this.state.content);
    
    // 添加控制按钮
    if (this.options.showControls) {
      this.createControls();
    }
    
    // 添加进度条
    if (this.options.showProgress) {
      this.createProgressBar();
    }
    
    // 添加点击区域
    if (this.options.clickToNavigate) {
      this.createClickAreas();
    }
    
    // 应用columns样式
    this.applyColumnStyles();
    
    // 计算页数
    requestAnimationFrame(() => {
      this.calculatePages();
    });
  }
  
  /**
   * 应用columns样式
   */
  applyColumnStyles() {
    if (!this.state.content) return;
    
    const { padding, columnGap, columnWidth } = this.options;
    const containerWidth = this.contentArea.clientWidth;
    
    // 计算单列宽度
    // 可用宽度 = 容器宽度 - 左右padding
    const availableWidth = containerWidth - padding.left - padding.right;
    
    // 如果指定了列宽，使用指定值，否则根据容器宽度计算
    let colWidth = columnWidth;
    if (!colWidth) {
      // 默认单列宽度约为容器宽度的 45%（两栏布局）
      colWidth = Math.floor((availableWidth - columnGap) / 2);
      // 但最小不小于300px，最大不超过500px
      colWidth = Math.max(300, Math.min(500, colWidth));
    }
    
    // 计算内容总宽度：需要足够宽以容纳所有列
    // 先设置临时样式获取实际列数
    this.state.content.style.cssText = `
      height: 100%;
      column-fill: auto;
      column-gap: ${columnGap}px;
      column-width: ${colWidth}px;
      padding: ${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;
      box-sizing: border-box;
      overflow: visible;
      position: relative;
    `;
    
    // 保存计算后的列宽
    this.state.columnWidth = colWidth;
    this.state.containerWidth = containerWidth;
  }
  
  /**
   * 计算总页数
   */
  calculatePages() {
    if (!this.state.content) return;
    
    // 获取内容的scrollWidth（columns展开后的总宽度）
    const scrollWidth = this.state.content.scrollWidth;
    const clientWidth = this.contentArea.clientWidth;
    
    // 计算页数 = 内容总宽度 / 容器宽度
    this.state.totalPages = Math.max(1, Math.ceil(scrollWidth / clientWidth));
    
    // 确保当前页有效
    if (this.state.currentPage >= this.state.totalPages) {
      this.state.currentPage = Math.max(0, this.state.totalPages - 1);
    }
    
    // 更新UI
    this.updatePageDisplay();
    this.updateProgressBar();
    this.updateControls();
    
    // 触发就绪事件
    if (this.onPaginationReady) {
      this.onPaginationReady({
        totalPages: this.state.totalPages,
        currentPage: this.state.currentPage
      });
    }
  }
  
  /**
   * 创建控制按钮
   */
  createControls() {
    const controls = document.createElement('div');
    controls.className = 'epub-pagination-controls';
    controls.innerHTML = `
      <button class="epub-pagination-btn prev" title="上一页">◀</button>
      <span class="epub-pagination-info">
        <span class="current-page">1</span> / <span class="total-pages">1</span>
      </span>
      <button class="epub-pagination-btn next" title="下一页">▶</button>
    `;
    
    this.contentArea.appendChild(controls);
    
    // 绑定按钮事件
    const prevBtn = controls.querySelector('.prev');
    const nextBtn = controls.querySelector('.next');
    
    prevBtn.addEventListener('click', () => this.previousPage());
    nextBtn.addEventListener('click', () => this.nextPage());
  }
  
  /**
   * 创建进度条
   */
  createProgressBar() {
    const progress = document.createElement('div');
    progress.className = 'epub-pagination-progress';
    progress.innerHTML = '<div class="epub-pagination-progress-bar"></div>';
    this.contentArea.appendChild(progress);
  }
  
  /**
   * 创建点击区域
   */
  createClickAreas() {
    const prevArea = document.createElement('div');
    prevArea.className = 'epub-pagination-click-area prev';
    prevArea.title = '点击翻到上一页';
    
    const nextArea = document.createElement('div');
    nextArea.className = 'epub-pagination-click-area next';
    nextArea.title = '点击翻到下一页';
    
    prevArea.addEventListener('click', () => this.previousPage());
    nextArea.addEventListener('click', () => this.nextPage());
    
    this.contentArea.appendChild(prevArea);
    this.contentArea.appendChild(nextArea);
  }
  
  /**
   * 注入必要样式
   */
  injectStyles() {
    if (document.getElementById('epub-pagination-styles')) return;
    
    const link = document.createElement('link');
    link.id = 'epub-pagination-styles';
    link.rel = 'stylesheet';
    link.href = './src/styles/pagination.css';
    document.head.appendChild(link);
  }
  
  /**
   * 绑定事件
   */
  bindEvents() {
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('keydown', this.handleKeyDown);
  }
  
  /**
   * 解绑事件
   */
  unbindEvents() {
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('keydown', this.handleKeyDown);
  }
  
  /**
   * 处理窗口大小变化
   */
  handleResize() {
    // 防抖处理
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.applyColumnStyles();
      this.calculatePages();
      // 窗口大小变化后重新定位到当前页
      this.goToPage(this.state.currentPage, false);
    }, 250);
  }
  
  /**
   * 处理键盘事件
   */
  handleKeyDown(e) {
    if (this.options.mode !== 'pagination') return;
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        this.previousPage();
        break;
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        this.nextPage();
        break;
      case 'Home':
        e.preventDefault();
        this.goToPage(0);
        break;
      case 'End':
        e.preventDefault();
        this.goToPage(this.state.totalPages - 1);
        break;
    }
  }
  
  /**
   * 翻到下一页
   */
  nextPage() {
    if (this.state.currentPage < this.state.totalPages - 1) {
      this.goToPage(this.state.currentPage + 1);
      return true;
    } else if (this.options.continuousPagination && this.onChapterChangeRequest) {
      // 请求加载下一章
      this.onChapterChangeRequest('next');
      return 'chapter-request';
    }
    return false;
  }

  /**
   * 检查是否还有下一页
   */
  hasNextPage() {
    return this.state.currentPage < this.state.totalPages - 1;
  }

  /**
   * 检查是否还有上一页
   */
  hasPreviousPage() {
    return this.state.currentPage > 0;
  }
  
  /**
   * 翻到上一页
   */
  previousPage() {
    if (this.state.currentPage > 0) {
      this.goToPage(this.state.currentPage - 1);
      return true;
    } else if (this.options.continuousPagination && this.onChapterChangeRequest) {
      // 请求加载上一章
      this.onChapterChangeRequest('previous');
      return 'chapter-request';
    }
    return false;
  }
  
  /**
   * 跳转到指定页
   */
  goToPage(pageIndex, animate = true) {
    if (pageIndex < 0 || pageIndex >= this.state.totalPages) return false;
    if (this.state.isAnimating && animate) return false;
    
    const oldPage = this.state.currentPage;
    this.state.currentPage = pageIndex;
    
    // 计算移动距离
    // 每页移动距离 = 容器宽度
    const containerWidth = this.contentArea.clientWidth;
    const translateX = -(pageIndex * containerWidth);
    
    // 确保内容宽度足够
    const totalWidth = this.state.totalPages * containerWidth;
    if (this.state.content.scrollWidth < totalWidth) {
      // 如果内容宽度不够，设置最小宽度
      this.state.content.style.minWidth = `${totalWidth}px`;
    }
    
    if (animate && this.options.animate) {
      this.state.isAnimating = true;
      this.state.content.style.transition = `transform ${this.options.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    } else {
      this.state.content.style.transition = 'none';
    }
    
    this.state.content.style.transform = `translateX(${translateX}px)`;
    
    // 更新UI
    this.updatePageDisplay();
    this.updateProgressBar();
    this.updateControls();
    
    // 动画结束处理
    if (animate && this.options.animate) {
      setTimeout(() => {
        this.state.isAnimating = false;
        this.state.content.style.transition = '';
      }, this.options.animationDuration);
    }
    
    // 触发页码变化事件
    if (this.onPageChange && oldPage !== pageIndex) {
      this.onPageChange({
        currentPage: this.state.currentPage,
        totalPages: this.state.totalPages,
        progress: (this.state.currentPage + 1) / this.state.totalPages
      });
    }
    
    return true;
  }
  
  /**
   * 更新页码显示
   */
  updatePageDisplay() {
    const currentEl = this.contentArea.querySelector('.current-page');
    const totalEl = this.contentArea.querySelector('.total-pages');
    
    if (currentEl) currentEl.textContent = this.state.currentPage + 1;
    if (totalEl) totalEl.textContent = this.state.totalPages;
  }
  
  /**
   * 更新进度条
   */
  updateProgressBar() {
    const progressBar = this.contentArea.querySelector('.epub-pagination-progress-bar');
    if (progressBar) {
      const progress = ((this.state.currentPage + 1) / this.state.totalPages) * 100;
      progressBar.style.width = `${progress}%`;
    }
  }
  
  /**
   * 更新控制按钮状态
   */
  updateControls() {
    const prevBtn = this.contentArea.querySelector('.epub-pagination-btn.prev');
    const nextBtn = this.contentArea.querySelector('.epub-pagination-btn.next');
    
    if (prevBtn) {
      prevBtn.disabled = this.state.currentPage === 0 && !this.options.continuousPagination;
    }
    if (nextBtn) {
      nextBtn.disabled = this.state.currentPage >= this.state.totalPages - 1 && !this.options.continuousPagination;
    }
  }
  
  /**
   * 设置内容
   */
  setContent(html) {
    if (this.state.content) {
      this.state.content.innerHTML = html;
      this.state.currentPage = 0;
      
      // 等待内容渲染完成后计算页数
      requestAnimationFrame(() => {
        this.calculatePages();
        this.goToPage(0, false);
      });
    }
  }
  
  /**
   * 获取当前页码信息
   */
  getPageInfo() {
    return {
      currentPage: this.state.currentPage,
      totalPages: this.state.totalPages,
      progress: this.state.totalPages > 0 ? (this.state.currentPage + 1) / this.state.totalPages : 0
    };
  }
  
  /**
   * 切换阅读模式
   */
  setMode(mode) {
    if (mode === this.options.mode) return;
    
    this.options.mode = mode;
    
    if (mode === 'pagination') {
      this.init();
    } else {
      this.destroy();
    }
  }
  
  /**
   * 更新配置
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    
    if (this.options.mode === 'pagination') {
      this.applyColumnStyles();
      this.calculatePages();
    }
  }
  
  /**
   * 销毁翻页管理器
   */
  destroy() {
    this.unbindEvents();
    
    if (this.contentArea) {
      // 恢复原始内容
      if (this.state.content) {
        this.contentArea.innerHTML = this.state.content.innerHTML;
      }
      
      this.contentArea.classList.remove('epub-pagination-container');
    }
    
    this.state.content = null;
    this.state.currentPage = 0;
    this.state.totalPages = 0;
  }
}

export default PaginationManager;
