import EPUBReader from './EPUBParser.js';
import PaginationManager from './PaginationManager.js';

class EPUBViewer {
  constructor(options = {}) {
    // 核心解析器
    this.reader = new EPUBReader();
    
    // DOM相关
    this.container = options.container || null;
    this.contentArea = options.contentArea || null;
    this.tocArea = options.tocArea || null;
    this.metadataArea = options.metadataArea || null;
    
    // 阅读设置
    this.settings = {
      fontSize: options.fontSize || '16px',
      fontFamily: options.fontFamily || "'Microsoft YaHei', 'PingFang SC', sans-serif",
      fontColor: options.fontColor || '#333333',
      backgroundColor: options.backgroundColor || '#ffffff',
      lineHeight: options.lineHeight || '1.8',
      letterSpacing: options.letterSpacing || '0px',
      paragraphSpacing: options.paragraphSpacing || '1em',
      textAlign: options.textAlign || 'left',
      maxWidth: options.maxWidth || '800px',
      padding: options.padding || '20px',
      ...options.settings
    };
    
    // 翻页模式设置
    this.pagination = {
      enabled: options.pagination?.enabled || false,
      mode: options.pagination?.mode || 'scroll', // 'scroll' | 'pagination'
      columns: options.pagination?.columns || 1,
      columnGap: options.pagination?.columnGap || 40,
      animate: options.pagination?.animate !== false,
      animationDuration: options.pagination?.animationDuration || 300,
      showControls: options.pagination?.showControls !== false,
      showProgress: options.pagination?.showProgress !== false,
      clickToNavigate: options.pagination?.clickToNavigate !== false,
      continuousPagination: options.pagination?.continuousPagination !== false // 启用连续翻页
    };
    
    // 翻页管理器
    this.paginationManager = null;
    
    // 状态
    this.currentChapter = null;
    this.isLoaded = false;
    this.book = null;
    
    // 事件回调
    this.onChapterChange = options.onChapterChange || null;
    this.onLoad = options.onLoad || null;
    this.onError = options.onError || null;
    this.onPageChange = options.onPageChange || null;
    
    // 初始化
    this.init();
  }
  
  init() {
    if (this.container) {
      this.setupContainer();
    }
    
    if (this.contentArea) {
      this.setupContentArea();
    }
    
    if (this.tocArea) {
      this.setupTOCArea();
    }
    
    if (this.metadataArea) {
      this.setupMetadataArea();
    }
  }
  
  setupContainer() {
    // 为容器添加基础样式
    this.container.classList.add('epub-viewer-container');
    this.applyContainerStyles();
  }
  
  setupContentArea() {
    this.contentArea.classList.add('epub-content-area');
    this.applyContentStyles();
  }
  
  setupTOCArea() {
    this.tocArea.classList.add('epub-toc-area');
  }
  
  setupMetadataArea() {
    this.metadataArea.classList.add('epub-metadata-area');
  }
  
  // 加载EPUB文件
  async load(source) {
    try {
      this.showLoading();
      
      // 使用核心解析器加载EPUB
      this.book = await this.reader.load(source);
      this.isLoaded = true;
      
      // 渲染元数据
      this.renderMetadata();
      
      // 渲染目录
      this.renderTOC();
      
      // 加载第一章
      await this.loadFirstChapter();
      
      // 触发加载完成事件
      if (this.onLoad) {
        this.onLoad(this.book);
      }
      
      this.hideLoading();
      
    } catch (error) {
      this.hideLoading();
      this.showError(error.message);
      
      if (this.onError) {
        this.onError(error);
      }
      
      throw error;
    }
  }
  
  // 渲染元数据
  renderMetadata() {
    if (!this.metadataArea || !this.book) return;
    
    const metadata = this.reader.getMetadata();
    
    this.metadataArea.innerHTML = `
      <div class="epub-metadata">
        <h2 class="book-title">${metadata.title || '未知标题'}</h2>
        <p class="book-author">作者: ${metadata.creator || '未知作者'}</p>
        <p class="book-language">语言: ${metadata.language || '未知'}</p>
        <p class="book-publisher">出版商: ${metadata.publisher || '未知'}</p>
        <p class="book-description">${metadata.description || ''}</p>
      </div>
    `;
  }
  
  // 渲染目录
  renderTOC() {
    if (!this.tocArea || !this.book) return;
    
    const toc = this.reader.getTableOfContents();
    
    if (!toc || !toc.children || toc.children.length === 0) {
      this.tocArea.innerHTML = '<p class="no-toc">无目录信息</p>';
      return;
    }
    
    const tocHTML = this.renderTOCItems(toc.children);
    this.tocArea.innerHTML = `<div class="epub-toc">${tocHTML}</div>`;
    
    // 绑定目录点击事件
    this.bindTOCEvents();
  }
  
  renderTOCItems(items, level = 0) {
    return items.map(item => `
      <div class="toc-item toc-level-${level}" data-href="${item.href}" data-id="${item.id}">
        <a href="#" class="toc-link">${item.title}</a>
        ${item.children && item.children.length > 0 ? 
          `<div class="toc-children">${this.renderTOCItems(item.children, level + 1)}</div>` : ''}
      </div>
    `).join('');
  }
  
  // 绑定目录事件
  bindTOCEvents() {
    const tocLinks = this.tocArea.querySelectorAll('.toc-link');
    
    tocLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const tocItem = e.target.closest('.toc-item');
        const href = tocItem.dataset.href;
        const id = tocItem.dataset.id;
        
        this.loadChapterByHref(href);
        
        // 更新活动状态
        this.updateActiveTOCItem(tocItem);
      });
    });
  }
  
  // 更新活动目录项
  updateActiveTOCItem(activeItem) {
    // 移除所有活动状态
    this.tocArea.querySelectorAll('.toc-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // 添加活动状态
    activeItem.classList.add('active');
  }
  
  // 加载第一章
  async loadFirstChapter() {
    const chapters = this.reader.getChapters();
    
    if (chapters.length > 0) {
      await this.loadChapter(chapters[0].id);
    }
  }
  
  // 根据ID加载章节
  async loadChapter(chapterId) {
    if (!this.isLoaded) {
      throw new Error('EPUB not loaded');
    }
    
    try {
      this.showChapterLoading();
      
      // 获取章节数据
      this.currentChapter = await this.reader.getChapter(chapterId);
      
      // 渲染章节内容
      this.renderChapter(this.currentChapter);
      
      // 更新翻页控制按钮状态
      if (this.paginationManager) {
        // 延迟更新以确保DOM已更新
        setTimeout(() => {
          this.updatePaginationControls();
        }, 100);
      }
      
      // 触发章节变化事件
      if (this.onChapterChange) {
        this.onChapterChange(this.currentChapter);
      }
      
      this.hideChapterLoading();
      
    } catch (error) {
      this.hideChapterLoading();
      this.showError(`加载章节失败: ${error.message}`);
      throw error;
    }
  }
  
  // 根据href加载章节
  async loadChapterByHref(href) {
    const chapters = this.reader.getChapters();
    const chapter = chapters.find(ch => ch.href === href);
    
    if (chapter) {
      await this.loadChapter(chapter.id);
    } else {
      throw new Error(`Chapter not found: ${href}`);
    }
  }
  
  // 渲染章节内容
  renderChapter(chapter) {
    if (!this.contentArea) return;
    
    // 清理之前的内容和翻页管理器
    if (this.paginationManager) {
      this.paginationManager.destroy();
      this.paginationManager = null;
    }
    
    // 创建章节容器
    const chapterContainer = document.createElement('div');
    chapterContainer.className = 'epub-chapter';
    
    // 添加章节内容
    const contentElement = document.createElement('div');
    contentElement.className = 'chapter-content';
    contentElement.innerHTML = chapter.content;
    
    // 处理内容中的图片和链接
    this.processContent(contentElement);
    
    chapterContainer.appendChild(contentElement);
    
    // 根据模式决定如何渲染
    if (this.pagination.enabled && this.pagination.mode === 'pagination') {
      // 翻页模式
      this.renderPaginationMode(chapterContainer);
    } else {
      // 滚动模式
      this.contentArea.innerHTML = '';
      this.contentArea.appendChild(chapterContainer);
      this.contentArea.scrollTop = 0;
    }
  }
  
  // 翻页模式渲染
  renderPaginationMode(chapterContainer) {
    // 获取章节内容（不包含标题）
    const chapterContent = chapterContainer.querySelector('.chapter-content');
    const contentHTML = chapterContent ? chapterContent.innerHTML : chapterContainer.innerHTML;
    
    // 清空内容区域
    this.contentArea.innerHTML = '';
    
    // 初始化翻页管理器
    this.paginationManager = new PaginationManager({
      container: this.container,
      contentArea: this.contentArea,
      mode: 'pagination',
      columns: this.pagination.columns,
      columnGap: this.pagination.columnGap,
      animate: this.pagination.animate,
      animationDuration: this.pagination.animationDuration,
      showControls: this.pagination.showControls,
      showProgress: this.pagination.showProgress,
      clickToNavigate: this.pagination.clickToNavigate,
      continuousPagination: this.pagination.continuousPagination,
      onPageChange: (pageInfo) => {
        if (this.onPageChange) {
          this.onPageChange(pageInfo);
        }
        // 更新按钮状态以考虑连续翻页
        this.updatePaginationControls();
      },
      onPaginationReady: (info) => {
        // 翻页准备就绪
        console.log('Pagination ready:', info);
        // 更新控制按钮状态
        this.updatePaginationControls();
      },
      onChapterChangeRequest: async (direction) => {
        // 处理章节切换请求
        if (direction === 'next') {
          const success = await this.nextChapter();
          if (success && this.paginationManager) {
            // 跳转到第一页
            this.paginationManager.goToPage(0, false);
          }
        } else if (direction === 'previous') {
          const success = await this.previousChapter();
          if (success && this.paginationManager) {
            // 跳转到最后一页
            const totalPages = this.paginationManager.state.totalPages;
            if (totalPages > 0) {
              this.paginationManager.goToPage(totalPages - 1, false);
            }
          }
        }
      }
    });
    
    // 设置内容（只设置章节内容，不包含标题）
    this.paginationManager.setContent(contentHTML);
    
    // 重新处理内容中的图片和链接（因为DOM被重新创建了）
    const content = this.contentArea.querySelector('.epub-pagination-content');
    if (content) {
      this.processContent(content);
    }
  }
  
  // 处理内容中的元素
  processContent(contentElement) {
    // 处理图片
    const images = contentElement.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('load', () => {
        // 图片加载完成后可以重新计算布局
        this.adjustLayout();
      });
      
      img.addEventListener('error', () => {
        // 图片加载失败时的处理
        img.style.display = 'none';
      });
    });
    
    // 处理链接
    const links = contentElement.querySelectorAll('a[href]');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        
        // 如果是内部链接，尝试导航到对应章节
        if (href && !href.startsWith('http') && !href.startsWith('#')) {
          e.preventDefault();
          this.loadChapterByHref(href);
        }
      });
    });
  }
  
  // 样式控制方法
  updateStyles(styles = {}) {
    // 合并新样式
    this.settings = { ...this.settings, ...styles };
    
    // 重新应用样式
    this.applyContainerStyles();
    this.applyContentStyles();
  }
  
  applyContainerStyles() {
    if (!this.container) return;
    
    Object.assign(this.container.style, {
      fontFamily: this.settings.fontFamily,
      backgroundColor: this.settings.backgroundColor,
      color: this.settings.fontColor,
      maxWidth: this.settings.maxWidth,
      margin: '0 auto',
      padding: this.settings.padding,
      boxSizing: 'border-box'
    });
  }
  
  applyContentStyles() {
    if (!this.contentArea) return;
    
    // 应用基础样式
    Object.assign(this.contentArea.style, {
      fontSize: this.settings.fontSize,
      fontFamily: this.settings.fontFamily,
      color: this.settings.fontColor,
      lineHeight: this.settings.lineHeight,
      letterSpacing: this.settings.letterSpacing,
      textAlign: this.settings.textAlign
    });
    
    // 应用段落样式
    const style = document.createElement('style');
    style.textContent = `
      .epub-content-area p {
        margin-bottom: ${this.settings.paragraphSpacing};
        text-align: ${this.settings.textAlign};
      }
      
      .epub-content-area h1, .epub-content-area h2, .epub-content-area h3,
      .epub-content-area h4, .epub-content-area h5, .epub-content-area h6 {
        margin-top: 1.5em;
        margin-bottom: 1em;
        text-align: ${this.settings.textAlign};
      }
      
      .epub-content-area img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 1em auto;
      }
      
      .epub-toc-area {
        border-right: 1px solid #eee;
        padding-right: 20px;
      }
      
      .toc-item {
        padding: 5px 0;
        cursor: pointer;
      }
      
      .toc-item:hover {
        background-color: #f5f5f5;
      }
      
      .toc-item.active {
        background-color: #e3f2fd;
        font-weight: bold;
      }
      
      .toc-level-1 { margin-left: 0; }
      .toc-level-2 { margin-left: 20px; }
      .toc-level-3 { margin-left: 40px; }
      .toc-level-4 { margin-left: 60px; }
      
      .toc-link {
        text-decoration: none;
        color: #333;
      }
      
      .toc-link:hover {
        color: #1976d2;
      }
      
      .loading {
        text-align: center;
        padding: 20px;
        color: #666;
      }
      
      .error {
        color: #d32f2f;
        background-color: #ffebee;
        padding: 10px;
        border-radius: 4px;
        margin: 10px 0;
      }
    `;
    
    // 添加或更新样式
    let existingStyle = document.querySelector('style[data-epub-viewer]');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    style.setAttribute('data-epub-viewer', 'true');
    document.head.appendChild(style);
  }
  
  // 便捷的样式设置方法
  setFontSize(size) {
    this.updateStyles({ fontSize: size });
  }
  
  setFontFamily(family) {
    this.updateStyles({ fontFamily: family });
  }
  
  setFontColor(color) {
    this.updateStyles({ fontColor: color });
  }
  
  setBackgroundColor(color) {
    this.updateStyles({ backgroundColor: color });
  }
  
  setLineHeight(height) {
    this.updateStyles({ lineHeight: height });
  }
  
  setLetterSpacing(spacing) {
    this.updateStyles({ letterSpacing: spacing });
  }
  
  setParagraphSpacing(spacing) {
    this.updateStyles({ paragraphSpacing: spacing });
  }
  
  setTextAlign(align) {
    this.updateStyles({ textAlign: align });
  }
  
  // 预设主题
  applyTheme(theme) {
    const themes = {
      light: {
        backgroundColor: '#ffffff',
        fontColor: '#333333',
        fontSize: '16px'
      },
      dark: {
        backgroundColor: '#1e1e1e',
        fontColor: '#e0e0e0',
        fontSize: '16px'
      },
      sepia: {
        backgroundColor: '#f4f1e8',
        fontColor: '#5c4b37',
        fontSize: '16px'
      },
      large: {
        fontSize: '20px',
        lineHeight: '2.0'
      }
    };
    
    if (themes[theme]) {
      this.updateStyles(themes[theme]);
    }
  }
  
  // 获取当前设置
  getSettings() {
    return { ...this.settings };
  }
  
  // 获取当前章节
  getCurrentChapter() {
    return this.currentChapter;
  }
  
  // 获取书籍信息
  getBook() {
    return this.book;
  }
  
  // 导航方法
  async nextChapter() {
    if (!this.currentChapter) return false;
    
    try {
      const chapters = this.reader.getChapters();
      const currentIndex = chapters.findIndex(ch => ch.id === this.currentChapter.id);
      
      if (currentIndex < chapters.length - 1) {
        await this.loadChapter(chapters[currentIndex + 1].id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load next chapter:', error);
      return false;
    }
  }
  
  async previousChapter() {
    if (!this.currentChapter) return false;
    
    try {
      const chapters = this.reader.getChapters();
      const currentIndex = chapters.findIndex(ch => ch.id === this.currentChapter.id);
      
      if (currentIndex > 0) {
        await this.loadChapter(chapters[currentIndex - 1].id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load previous chapter:', error);
      return false;
    }
  }
  
  // UI辅助方法
  showLoading() {
    if (this.container) {
      this.container.classList.add('loading');
    }
  }
  
  hideLoading() {
    if (this.container) {
      this.container.classList.remove('loading');
    }
  }
  
  showChapterLoading() {
    if (this.contentArea) {
      this.contentArea.innerHTML = '<div class="loading">正在加载章节...</div>';
    }
  }
  
  hideChapterLoading() {
    // 内容渲染时会自动清除加载状态
  }
  
  showError(message) {
    if (this.contentArea) {
      this.contentArea.innerHTML = `<div class="error">${message}</div>`;
    }
  }
  
  adjustLayout() {
    // 重新计算布局，可以由外部调用
    if (this.contentArea) {
      // 触发布局重计算
      this.contentArea.style.display = 'none';
      this.contentArea.offsetHeight; // 强制重排
      this.contentArea.style.display = '';
    }
  }
  
  // 销毁
  destroy() {
    if (this.reader) {
      this.reader.destroy();
    }
    
    // 销毁翻页管理器
    if (this.paginationManager) {
      this.paginationManager.destroy();
      this.paginationManager = null;
    }
    
    // 清理样式
    const style = document.querySelector('style[data-epub-viewer]');
    if (style) {
      style.remove();
    }
    
    // 清理DOM
    if (this.contentArea) {
      this.contentArea.innerHTML = '';
    }
    
    if (this.tocArea) {
      this.tocArea.innerHTML = '';
    }
    
    if (this.metadataArea) {
      this.metadataArea.innerHTML = '';
    }
    
    // 重置状态
    this.currentChapter = null;
    this.isLoaded = false;
    this.book = null;
  }
  
  // ==================== 翻页模式方法 ====================
  
  /**
   * 设置翻页模式
   * @param {boolean} enabled - 是否启用翻页模式
   */
  setPaginationMode(enabled) {
    this.pagination.enabled = enabled;
    this.pagination.mode = enabled ? 'pagination' : 'scroll';
    
    // 重新渲染当前章节
    if (this.currentChapter) {
      this.renderChapter(this.currentChapter);
    }
  }
  
  /**
   * 切换阅读模式
   */
  toggleReadingMode() {
    this.setPaginationMode(!this.pagination.enabled);
    return this.pagination.enabled;
  }
  
  /**
   * 获取当前阅读模式
   */
  getReadingMode() {
    return this.pagination.enabled ? 'pagination' : 'scroll';
  }
  
  /**
   * 翻到下一页
   */
  nextPage() {
    if (this.paginationManager && this.pagination.enabled) {
      const result = this.paginationManager.nextPage();
      return result === true || result === 'chapter-request';
    }
    return false;
  }
  
  /**
   * 翻到上一页
   */
  previousPage() {
    if (this.paginationManager && this.pagination.enabled) {
      const result = this.paginationManager.previousPage();
      return result === true || result === 'chapter-request';
    }
    return false;
  }
  
  /**
   * 跳转到指定页
   */
  goToPage(pageIndex) {
    if (this.paginationManager && this.pagination.enabled) {
      return this.paginationManager.goToPage(pageIndex);
    }
    return false;
  }
  
  /**
   * 获取当前页码信息
   */
  getPageInfo() {
    if (this.paginationManager && this.pagination.enabled) {
      return this.paginationManager.getPageInfo();
    }
    return { currentPage: 0, totalPages: 0, progress: 0 };
  }
  
  /**
   * 更新翻页设置
   */
  updatePaginationOptions(options) {
    this.pagination = { ...this.pagination, ...options };
    
    if (this.paginationManager) {
      this.paginationManager.updateOptions(options);
    }
  }

  /**
   * 启用/禁用连续翻页
   * @param {boolean} enabled - 是否启用连续翻页
   */
  setContinuousPagination(enabled) {
    this.pagination.continuousPagination = enabled;
    if (this.paginationManager) {
      this.paginationManager.options.continuousPagination = enabled;
    }
  }

  /**
   * 获取连续翻页状态
   */
  isContinuousPaginationEnabled() {
    return this.pagination.continuousPagination;
  }

  /**
   * 更新翻页控制按钮状态（考虑连续翻页）
   */
  updatePaginationControls() {
    if (!this.paginationManager || !this.contentArea) return;

    const prevBtn = this.contentArea.querySelector('.epub-pagination-btn.prev');
    const nextBtn = this.contentArea.querySelector('.epub-pagination-btn.next');

    if (!this.pagination.enabled) return;

    // 获取当前章节信息
    const chapters = this.reader ? this.reader.getChapters() : [];
    const currentChapterIndex = this.currentChapter ? 
      chapters.findIndex(ch => ch.id === this.currentChapter.id) : -1;

    // 更新上一页按钮状态
    if (prevBtn) {
      const atChapterStart = this.paginationManager.state.currentPage === 0;
      const isFirstChapter = currentChapterIndex <= 0;
      const canGoToPreviousChapter = this.pagination.continuousPagination && !isFirstChapter;
      prevBtn.disabled = atChapterStart && !canGoToPreviousChapter;
    }

    // 更新下一页按钮状态
    if (nextBtn) {
      const atChapterEnd = this.paginationManager.state.currentPage >= this.paginationManager.state.totalPages - 1;
      const isLastChapter = currentChapterIndex >= chapters.length - 1;
      const canGoToNextChapter = this.pagination.continuousPagination && !isLastChapter;
      nextBtn.disabled = atChapterEnd && !canGoToNextChapter;
    }
  }
}

export default EPUBViewer;