import EPUBReader from './EPUBParser.js';
import { CFIParser } from './CFIParser.js';
import { CFIManager } from './CFIManager.js';

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
      readingMode: options.readingMode || 'scroll', // 'scroll' or 'page'
      columnLayout: options.columnLayout || 'single', // 'single' or 'double'
      textFlow: options.textFlow !== false, // true: 启用文本流动, false: 按元素分页
      ...options.settings
    };
    
    // 状态
    this.currentChapter = null;
    this.isLoaded = false;
    this.book = null;
    this.currentPage = 0;
    this.totalPages = 1;
    this.isPagingMode = false;
    this.horizontalPages = null;
    
    // 事件回调
    this.onChapterChange = options.onChapterChange || null;
    this.onLoad = options.onLoad || null;
    this.onError = options.onError || null;
    
    // 设置全局引用，供CFIManager使用
    if (typeof window !== 'undefined') {
      window.viewer = this;
    }
    
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
    
    // 保存原始内容
    this.originalContent = chapter.content;
    
    if (this.settings.readingMode === 'page') {
      this.renderChapterInPagingMode(chapter);
    } else {
      this.renderChapterInScrollMode(chapter);
    }
  }
  
  // 滚动模式渲染
  renderChapterInScrollMode(chapter) {
    // 清理之前的内容
    this.contentArea.innerHTML = '';
    this.contentArea.classList.remove('paging-mode');
    
    // 创建章节容器
    const chapterContainer = document.createElement('div');
    chapterContainer.className = 'epub-chapter reading-content';
    
    // 添加章节标题
    if (chapter.title) {
      const titleElement = document.createElement('h1');
      titleElement.className = 'chapter-title';
      titleElement.textContent = chapter.title;
      chapterContainer.appendChild(titleElement);
    }
    
    // 添加章节内容
    const contentElement = document.createElement('div');
    contentElement.className = 'chapter-content';
    contentElement.innerHTML = chapter.content;
    
    // 处理内容中的图片和链接
    this.processContent(contentElement);
    
    chapterContainer.appendChild(contentElement);
    
    // 添加到内容区域
    this.contentArea.appendChild(chapterContainer);
    
    // 滚动到顶部
    this.contentArea.scrollTop = 0;
  }
  
  // 翻页模式渲染
  renderChapterInPagingMode(chapter) {
    this.isPagingMode = true;
    this.totalPages = 1;
    this.currentPage = 0;
    
    // 清理之前的内容
    this.contentArea.innerHTML = '';
    this.contentArea.classList.add('paging-mode');
    
    // 创建翻页容器
    const pagingContainer = document.createElement('div');
    pagingContainer.className = 'paging-container';
    
    // 创建内容容器
    const pagingContent = document.createElement('div');
    pagingContent.className = 'paging-content';
    
    // 创建页面内容（用于分页计算）
    const tempPageContent = document.createElement('div');
    tempPageContent.className = 'page-content';
    
    // 根据分栏设置计算宽度
    let pageWidth = this.contentArea.clientWidth - 80;
    if (this.settings.columnLayout === 'double') {
      // 双栏模式：减去栏间距，每栏宽度约为页面的一半
      pageWidth = Math.floor((this.contentArea.clientWidth - 80 - 20) / 2); // 20px是栏间距
    }
    
    tempPageContent.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: ${pageWidth}px;
      padding: 40px;
      font-size: ${this.settings.fontSize};
      line-height: ${this.settings.lineHeight};
      font-family: ${this.settings.fontFamily};
      visibility: hidden;
      ${this.settings.columnLayout === 'double' ? 'column-count: 1;' : ''}
    `;
    
    // 添加章节标题
    if (chapter.title) {
      const titleElement = document.createElement('h1');
      titleElement.className = 'chapter-title';
      titleElement.textContent = chapter.title;
      tempPageContent.appendChild(titleElement);
    }
    
    // 添加章节内容
    const contentElement = document.createElement('div');
    contentElement.className = 'chapter-content';
    contentElement.innerHTML = chapter.content;
    
    // 处理内容中的图片和链接
    this.processContent(contentElement);
    tempPageContent.appendChild(contentElement);
    
    document.body.appendChild(tempPageContent);
    
    // 分割内容
    const containerHeight = this.contentArea.clientHeight - 120;
    const pages = this.splitContentByHeight(contentElement, containerHeight);
    
    // 清理临时元素
    document.body.removeChild(tempPageContent);
    
    // 创建横向页面容器
    const horizontalPages = document.createElement('div');
    horizontalPages.className = 'horizontal-pages';
    this.horizontalPages = horizontalPages;
    
    // 为每个页面创建页面元素
    pages.forEach((pageContent, index) => {
      const page = document.createElement('div');
      page.className = `page ${this.settings.columnLayout}-column`;
      
      const pageContentDiv = document.createElement('div');
      pageContentDiv.className = 'page-content';
      
      // 如果是第一页且有标题，添加标题
      if (index === 0 && chapter.title) {
        const titleElement = document.createElement('h1');
        titleElement.className = 'chapter-title';
        titleElement.textContent = chapter.title;
        pageContentDiv.appendChild(titleElement);
      }
      
       const pageContentElement = document.createElement('div');
       pageContentElement.className = 'chapter-content';
       pageContentElement.innerHTML = pageContent;
       pageContentDiv.appendChild(pageContentElement);
       
       // 根据设置添加分栏类
       if (this.settings.columnLayout === 'double') {
         pageContentDiv.classList.add('double-column');
         if (this.settings.textFlow !== false) {
           pageContentDiv.classList.add('text-flow');
         } else {
           pageContentDiv.classList.add('no-text-flow');
         }
       } else {
         pageContentDiv.classList.add('single-column');
       }
       
       page.appendChild(pageContentDiv);
       horizontalPages.appendChild(page);
    });
    
    // 创建导航覆盖层（用于点击翻页）
    const navOverlay = document.createElement('div');
    navOverlay.className = 'paging-nav-overlay';
    navOverlay.innerHTML = `
      <div class="paging-nav-area prev" onclick="viewer.previousPage()"></div>
      <div class="paging-nav-area next" onclick="viewer.nextPage()"></div>
    `;
    
    pagingContent.appendChild(horizontalPages);
    pagingContent.appendChild(navOverlay);
    
    pagingContainer.appendChild(pagingContent);
    
    // 添加翻页控制
    const pagingControls = this.createPagingControls();
    pagingContainer.appendChild(pagingControls);
    
    // 添加到内容区域
    this.contentArea.appendChild(pagingContainer);
    
    // 更新总页数
    this.totalPages = pages.length;
    this.currentPage = 0;
    
    // 调试信息
    console.log(`Chapter "${chapter.title}": ${pages.length} pages generated`);
    if (this.settings.columnLayout === 'double') {
      console.log(`Double column mode with text flow: ${this.settings.textFlow !== false ? 'enabled' : 'disabled'}`);
    }
    
// 设置初始位置
    this.updatePagePosition();
    
    // 添加触摸支持
    this.setupTouchSupport();
    
    // 添加键盘支持
    this.setupKeyboardSupport();
  }
  
  // 创建翻页控制
  createPagingControls() {
    const controls = document.createElement('div');
    controls.className = 'paging-controls';
    controls.innerHTML = `
      <button onclick="viewer.previousPage()" id="prevPageBtn">⬅️ 上一页</button>
      <span class="page-info" id="pageInfo">1 / 1</span>
      <button onclick="viewer.nextPage()" id="nextPageBtn">下一页 ➡️</button>
    `;
    return controls;
  }
  
  // 更新页面位置
  updatePagePosition() {
    if (!this.horizontalPages) return;
    
    const translateX = -this.currentPage * 100;
    this.horizontalPages.style.transform = `translateX(${translateX}%)`;
    this.updatePagingControls();
  }

  // 在翻页模式下导航到指定位置
  async navigateToPositionInPagingMode(cfi) {
    if (!this.isPagingMode || !this.currentChapter) {
      return false;
    }

    try {
      // 查找目标元素
      const targetElement = CFIParser.findElement(cfi, this.contentArea);
      if (!targetElement) {
        console.warn('Target element not found for CFI:', cfi);
        return false;
      }

      // 获取所有页面元素
      const pages = this.horizontalPages.querySelectorAll('.page');
      if (pages.length === 0) {
        return false;
      }

      // 找到目标元素所在的页面
      let targetPageIndex = 0;
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (page.contains(targetElement)) {
          targetPageIndex = i;
          break;
        }
      }

      // 导航到目标页面
      this.currentPage = targetPageIndex;
      this.updatePagePosition();
      this.addTransitionEffect();

      // 高亮目标元素（可选）
      this.highlightTargetElement(targetElement);

      return true;
    } catch (error) {
      console.error('Failed to navigate to position in paging mode:', error);
      return false;
    }
  }

  // 高亮目标元素
  highlightTargetElement(element) {
    if (!element) return;

    // 添加临时高亮样式
    const originalStyle = element.style.cssText;
    element.style.cssText += `
      background-color: yellow !important;
      transition: background-color 2s ease;
    `;

    // 2秒后移除高亮
    setTimeout(() => {
      element.style.cssText = originalStyle;
    }, 2000);
  }

  // 从笔记列表导航到指定位置
  async navigateToNote(note) {
    if (!note || !note.cfi) {
      console.warn('Invalid note data:', note);
      return false;
    }

    // 如果当前章节与笔记章节不同，先切换章节
    if (note.chapterId && this.currentChapter && note.chapterId !== this.currentChapter.id) {
      await this.loadChapter(note.chapterId);
    }

    // 根据阅读模式导航
    if (this.settings.readingMode === 'page') {
      return await this.navigateToPositionInPagingMode(note.cfi);
    } else {
      // 滚动模式使用CFIManager
      const cfiManager = new CFIManager(this.contentArea, this.currentChapter.id);
      cfiManager.initialize();
      const result = cfiManager.navigateToBookID(note.cfi);
      cfiManager.destroy();
      return result;
    }
  }
  
  // 下一页
  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.updatePagePosition();
      this.addTransitionEffect();
    } else {
      // 如果是最后一页，尝试跳转到下一章
      console.log('End of chapter, moving to next chapter');
      this.nextChapter();
    }
  }
  
  // 上一页
  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updatePagePosition();
      this.addTransitionEffect();
    } else {
      // 如果是第一页，尝试跳转到上一章
      console.log('Start of chapter, moving to previous chapter');
      this.previousChapter();
    }
  }
  
  // 添加页面过渡效果
  addTransitionEffect() {
    if (this.horizontalPages) {
      this.horizontalPages.classList.add('page-transition');
      setTimeout(() => {
        this.horizontalPages.classList.remove('page-transition');
      }, 500);
    }
  }
  
  // 设置触摸支持
  setupTouchSupport() {
    if (!this.contentArea) return;
    
    let startX = 0;
    let startY = 0;
    let isScrolling = false;
    
    this.contentArea.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isScrolling = undefined;
    }, { passive: true });
    
    this.contentArea.addEventListener('touchmove', (e) => {
      if (isScrolling === undefined) {
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;
        isScrolling = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }, { passive: true });
    
    this.contentArea.addEventListener('touchend', (e) => {
      if (isScrolling) {
        const endX = e.changedTouches[0].clientX;
        const deltaX = endX - startX;
        
        if (Math.abs(deltaX) > 50) { // 最小滑动距离
          if (deltaX > 0) {
            this.previousPage();
          } else {
            this.nextPage();
          }
        }
      }
    }, { passive: true });
  }
  
  // 设置键盘支持
  setupKeyboardSupport() {
    // 键盘支持已在HTML文件中实现
  }
  
  
  
  
  
  // 更新翻页控制
  updatePagingControls() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    if (prevBtn) prevBtn.disabled = this.currentPage <= 0 && !this.hasPreviousChapter();
    if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages - 1 && !this.hasNextChapter();
    if (pageInfo) pageInfo.textContent = `${this.currentPage + 1} / ${this.totalPages}`;
  }
  
  // 检查是否有上一章
  hasPreviousChapter() {
    if (!this.currentChapter) return false;
    const chapters = this.reader.getChapters();
    const currentIndex = chapters.findIndex(ch => ch.id === this.currentChapter.id);
    return currentIndex > 0;
  }
  
  // 检查是否有下一章
  hasNextChapter() {
    if (!this.currentChapter) return false;
    const chapters = this.reader.getChapters();
    const currentIndex = chapters.findIndex(ch => ch.id === this.currentChapter.id);
    return currentIndex < chapters.length - 1;
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
      
      /* 翻页模式分栏样式 */
      .paging-mode .double-column {
        column-count: 2;
        column-gap: 20px;
        column-fill: auto;
        column-rule: 1px solid #ddd;
      }
      
      .paging-mode .single-column {
        column-count: 1;
      }
      
      .paging-mode .page-content {
        break-inside: auto;
      }
      
      .paging-mode .double-column p {
        break-inside: auto;
        margin-bottom: ${this.settings.paragraphSpacing};
        text-align: ${this.settings.textAlign};
        orphans: 2;
        widows: 2;
      }
      
      .paging-mode .double-column h1,
      .paging-mode .double-column h2,
      .paging-mode .double-column h3,
      .paging-mode .double-column h4,
      .paging-mode .double-column h5,
      .paging-mode .double-column h6 {
        break-after: avoid-column;
        break-inside: avoid;
        margin-top: 1.5em;
        margin-bottom: 1em;
      }
      
      /* 文本流动模式 */
      .paging-mode .text-flow .double-column p {
        break-inside: auto;
      }
      
      .paging-mode .no-text-flow .double-column p {
        break-inside: avoid;
      }
      
      /* 增强的分栏控制 */
      .paging-mode .double-column.text-flow {
        column-fill: auto; /* 文字自动流动 */
      }
      
      .paging-mode .double-column.no-text-flow {
        column-fill: balance; /* 平衡填充 */
      }
      
      /* 确保段落正确跨栏 */
      .paging-mode .text-flow .double-column * {
        break-inside: auto;
      }
      
      .paging-mode .no-text-flow .double-column p,
      .paging-mode .no-text-flow .double-column div {
        break-inside: avoid;
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
  
  // 阅读模式设置
  setReadingMode(mode) {
    if (['scroll', 'page'].includes(mode)) {
      const oldMode = this.settings.readingMode;
      const oldScrollPosition = this.getCurrentScrollPosition();
      const oldPageProgress = this.getCurrentPageProgress();
      
      this.updateStyles({ readingMode: mode });
      
      // 重新渲染当前章节
      if (this.currentChapter) {
        this.renderChapter(this.currentChapter);
        
        // 恢复阅读位置
        setTimeout(() => {
          if (oldMode === 'scroll' && mode === 'page') {
            // 从滚动模式切换到翻页模式：估算对应的页数
            this.restorePositionFromScroll(oldScrollPosition);
          } else if (oldMode === 'page' && mode === 'scroll') {
            // 从翻页模式切换到滚动模式：估算对应的滚动位置
            this.restorePositionFromPage(oldPageProgress);
          }
        }, 100); // 等待DOM更新完成
      }
    }
  }
  
  // 列布局设置
  setColumnLayout(layout) {
    if (['single', 'double'].includes(layout)) {
      const oldLayout = this.settings.columnLayout;
      const currentPosition = this.settings.readingMode === 'scroll' ? 
        this.getCurrentScrollPosition() : this.getCurrentPageProgress();
      
      this.updateStyles({ columnLayout: layout });
      
      // 重新渲染当前章节
      if (this.currentChapter) {
        this.renderChapter(this.currentChapter);
        
        // 恢复阅读位置
        setTimeout(() => {
          if (this.settings.readingMode === 'scroll') {
            this.contentArea.scrollTop = currentPosition;
          } else {
            // 翻页模式下重新计算页数并跳转
            const targetPage = Math.floor(currentPosition * this.totalPages);
            this.currentPage = Math.max(0, Math.min(targetPage, this.totalPages - 1));
            this.updatePagePosition();
          }
        }, 100);
      }
    }
  }

  // 文本流动模式设置
  setTextFlow(enabled) {
    const currentPosition = this.settings.readingMode === 'scroll' ? 
      this.getCurrentScrollPosition() : this.getCurrentPageProgress();
    
    this.updateStyles({ textFlow: enabled });
    
    // 重新渲染当前章节
    if (this.currentChapter) {
      this.renderChapter(this.currentChapter);
      
      // 恢复阅读位置
      setTimeout(() => {
        if (this.settings.readingMode === 'scroll') {
          this.contentArea.scrollTop = currentPosition;
        } else {
          // 翻页模式下重新计算页数并跳转
          const targetPage = Math.floor(currentPosition * this.totalPages);
          this.currentPage = Math.max(0, Math.min(targetPage, this.totalPages - 1));
          this.updatePagePosition();
        }
      }, 100);
    }
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
  
// 获取当前滚动位置
  getCurrentScrollPosition() {
    if (!this.contentArea) return 0;
    
    if (this.settings.readingMode === 'scroll') {
      return this.contentArea.scrollTop;
    } else {
      // 翻页模式下，返回估算的滚动位置
      const progress = this.getCurrentPageProgress();
      const maxScroll = this.contentArea.scrollHeight - this.contentArea.clientHeight;
      return Math.floor(progress * maxScroll);
    }
  }
  
  // 获取当前页面进度
  getCurrentPageProgress() {
    if (this.settings.readingMode === 'page' && this.totalPages > 0) {
      return (this.currentPage + 1) / this.totalPages;
    } else if (this.settings.readingMode === 'scroll' && this.contentArea) {
      const maxScroll = this.contentArea.scrollHeight - this.contentArea.clientHeight;
      if (maxScroll > 0) {
        return this.contentArea.scrollTop / maxScroll;
      }
    }
    return 0;
  }
  
  // 从滚动位置恢复到翻页模式
  restorePositionFromScroll(scrollPosition) {
    if (!this.contentArea || this.totalPages <= 0) return;
    
    // 计算滚动进度
    const maxScroll = this.contentArea.scrollHeight - this.contentArea.clientHeight;
    const progress = maxScroll > 0 ? scrollPosition / maxScroll : 0;
    
    // 估算对应的页数
    const targetPage = Math.floor(progress * this.totalPages);
    const clampedPage = Math.max(0, Math.min(targetPage, this.totalPages - 1));
    
    // 跳转到目标页
    this.currentPage = clampedPage;
    this.updatePagePosition();
    this.addTransitionEffect();
    
    console.log(`Restored to page ${clampedPage + 1}/${this.totalPages} from scroll position`);
  }
  
  // 从翻页位置恢复到滚动模式
  restorePositionFromPage(pageProgress) {
    if (!this.contentArea) return;
    
    // 等待内容完全渲染后再计算
    setTimeout(() => {
      const maxScroll = this.contentArea.scrollHeight - this.contentArea.clientHeight;
      const targetScroll = Math.floor(pageProgress * maxScroll);
      
      // 滚动到目标位置
      this.contentArea.scrollTop = targetScroll;
      
      console.log(`Restored to scroll position ${targetScroll} from page progress ${pageProgress.toFixed(2)}`);
    }, 200);
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
    if (!this.currentChapter) return;
    
    const chapters = this.reader.getChapters();
    const currentIndex = chapters.findIndex(ch => ch.id === this.currentChapter.id);
    
    if (currentIndex < chapters.length - 1) {
      return await this.loadChapter(chapters[currentIndex + 1].id);
    }
  }
  
  async previousChapter() {
    if (!this.currentChapter) return;
    
    const chapters = this.reader.getChapters();
    const currentIndex = chapters.findIndex(ch => ch.id === this.currentChapter.id);
    
    if (currentIndex > 0) {
      return await this.loadChapter(chapters[currentIndex - 1].id);
    }
  }
  
  // 章节切换时的翻页处理
  async loadChapter(chapterId) {
    if (!this.isLoaded) {
      throw new Error('EPUB not loaded');
    }
    
    try {
      this.showChapterLoading();
      
      // 获取章节数据
      this.currentChapter = await this.reader.getChapter(chapterId);
      
      // 根据阅读模式渲染章节内容
      this.renderChapter(this.currentChapter);
      
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
  
  // 按高度分割内容为多个页面（支持文本流动）
  splitContentByHeight(contentElement, containerHeight) {
    if (!contentElement) return [''];
    
    // 检查是否启用文本流动模式
    const enableTextFlow = this.settings.textFlow !== false; // 默认启用
    
    if (enableTextFlow) {
      return this.splitContentWithTextFlow(contentElement, containerHeight);
    } else {
      return this.splitContentByElement(contentElement, containerHeight);
    }
  }

  // 支持文本流动的分页方法
  splitContentWithTextFlow(contentElement, containerHeight) {
    // 无论单栏还是双栏，都需要进行正常的分页
    // 双栏模式下，每页内部使用CSS分栏实现文字流动
    return this.splitContentByElement(contentElement, containerHeight);
  }

  // 流式处理文本节点
  flowTextNode(textNode, targetPage, tempContainer, maxHeight, pages) {
    const text = textNode.textContent.trim();
    if (!text) return targetPage;
    
    // 按字符分割，支持更精细的控制
    const chars = text.split('');
    let currentText = '';
    let charIndex = 0;
    
    while (charIndex < chars.length) {
      // 尝试添加更多字符
      let testText = currentText;
      let testIndex = charIndex;
      
      while (testIndex < chars.length && testIndex < charIndex + 50) { // 每次测试最多50个字符
        testText += chars[testIndex];
        testIndex++;
        
        // 测量当前文本高度
        tempContainer.innerHTML = targetPage.innerHTML + '<span>' + testText + '</span>';
        const testHeight = tempContainer.scrollHeight;
        
        if (testHeight > maxHeight) {
          // 超出高度，回退
          testText = testText.slice(0, -1);
          testIndex--;
          break;
        }
      }
      
      if (testText.length > currentText.length) {
        // 可以添加这些字符
        currentText = testText;
        charIndex = testIndex;
      } else {
        // 即使一个字符都加不进去，也需要强制添加
        if (currentText.length === 0 && charIndex < chars.length) {
          currentText = chars[charIndex];
          charIndex++;
        }
        break;
      }
    }
    
    // 添加处理后的文本
    if (currentText) {
      const textSpan = document.createElement('span');
      textSpan.textContent = currentText;
      targetPage.appendChild(textSpan);
      
      // 检查是否需要分页
      tempContainer.innerHTML = targetPage.innerHTML;
      if (tempContainer.scrollHeight > maxHeight) {
        // 移除刚添加的文本，开始新页面
        targetPage.removeChild(textSpan);
        pages.push(targetPage.innerHTML);
        
        // 在新页面添加文本
        targetPage = document.createElement('div');
        targetPage.appendChild(textSpan);
      }
    }
    
    // 处理剩余字符
    if (charIndex < chars.length) {
      const remainingText = chars.slice(charIndex).join('');
      const remainingNode = document.createTextNode(remainingText);
      return this.flowTextNode(remainingNode, targetPage, tempContainer, maxHeight, pages);
    }
    
    return targetPage;
  }

  // 流式处理元素节点
  flowElementNode(elementNode, targetPage, tempContainer, maxHeight, pages) {
    const tagName = elementNode.tagName.toLowerCase();
    const isBlockElement = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'pre'].includes(tagName);
    
    if (!isBlockElement) {
      // 内联元素，直接添加
      targetPage.appendChild(elementNode.cloneNode(true));
      return targetPage;
    }
    
    // 创建元素副本
    const elementCopy = elementNode.cloneNode(false);
    
    // 测量当前页面高度
    tempContainer.innerHTML = targetPage.innerHTML;
    tempContainer.appendChild(elementCopy);
    const currentHeight = tempContainer.scrollHeight;
    
    // 处理元素内容
    const contentResult = this.flowElementContent(elementNode, elementCopy, tempContainer, maxHeight - currentHeight, pages);
    
    // 检查是否超出页面高度
    tempContainer.innerHTML = targetPage.innerHTML;
    tempContainer.appendChild(elementCopy);
    const finalHeight = tempContainer.scrollHeight;
    
    if (finalHeight > maxHeight && targetPage.children.length > 0) {
      // 需要分页
      pages.push(targetPage.innerHTML);
      
      // 在新页面添加元素
      targetPage = document.createElement('div');
      targetPage.appendChild(elementCopy);
    }
    
    return targetPage;
  }

  // 流式处理元素内容
  flowElementContent(sourceElement, targetElement, tempContainer, remainingHeight, pages) {
    const childNodes = Array.from(sourceElement.childNodes);
    
    for (let i = 0; i < childNodes.length; i++) {
      const child = childNodes[i];
      
      if (child.nodeType === Node.TEXT_NODE) {
        this.flowTextNode(child, targetElement, tempContainer, remainingHeight, pages);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        this.flowElementNode(child, targetElement, tempContainer, remainingHeight, pages);
      }
      
      // 重新计算剩余高度
      tempContainer.innerHTML = targetElement.innerHTML;
      const usedHeight = tempContainer.scrollHeight;
      remainingHeight = Math.max(0, remainingHeight - usedHeight);
    }
    
    return { height: tempContainer.scrollHeight };
  }

  // 处理文本节点（支持分割）
  processTextNode(textNode, targetPage, tempContainer, maxHeight, pages) {
    if (!textNode.textContent.trim()) {
      return targetPage;
    }
    
    const text = textNode.textContent;
    const words = text.split(/\s+/);
    let currentText = '';
    let remainingWords = [...words];
    
    while (remainingWords.length > 0) {
      // 尝试添加下一个词
      const testText = currentText + (currentText ? ' ' : '') + remainingWords[0];
      
      // 测量当前文本高度
      tempContainer.innerHTML = targetPage.innerHTML + '<span>' + testText + '</span>';
      const testHeight = tempContainer.scrollHeight;
      
      if (testHeight <= maxHeight) {
        // 可以添加这个词
        currentText = testText;
        remainingWords.shift();
      } else {
        // 不能添加这个词，需要分页
        if (currentText.trim()) {
          // 保存当前页面的文本
          const textSpan = document.createElement('span');
          textSpan.textContent = currentText;
          targetPage.appendChild(textSpan);
          
          // 开始新页面
          pages.push(targetPage.innerHTML);
          targetPage = document.createElement('div');
          currentText = '';
        }
        
        // 如果单个词就超出页面高度，强制添加
        if (remainingWords.length === 1) {
          const textSpan = document.createElement('span');
          textSpan.textContent = remainingWords[0];
          targetPage.appendChild(textSpan);
          remainingWords.shift();
        }
      }
    }
    
    // 添加剩余的文本
    if (currentText.trim()) {
      const textSpan = document.createElement('span');
      textSpan.textContent = currentText;
      targetPage.appendChild(textSpan);
    }
    
    return targetPage;
  }

  // 处理元素节点
  processElementNode(elementNode, targetPage, tempContainer, maxHeight, pages) {
    const tagName = elementNode.tagName.toLowerCase();
    
    // 检查是否是块级元素
    const isBlockElement = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'pre'].includes(tagName);
    
    if (isBlockElement) {
      // 创建元素副本
      const elementCopy = elementNode.cloneNode(false);
      
      // 测量空元素的高度
      tempContainer.innerHTML = targetPage.innerHTML;
      tempContainer.appendChild(elementCopy);
      const emptyHeight = tempContainer.scrollHeight;
      
      // 处理元素内容
      let contentHeight = 0;
      const childNodes = Array.from(elementNode.childNodes);
      
      for (let i = 0; i < childNodes.length; i++) {
        const child = childNodes[i];
        
        if (child.nodeType === Node.TEXT_NODE) {
          // 处理文本内容
          const textResult = this.processTextInElement(child, elementCopy, tempContainer, maxHeight - emptyHeight, pages);
          contentHeight += textResult.height;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          // 处理子元素
          const childResult = this.processElementNode(child, elementCopy, tempContainer, maxHeight - emptyHeight, pages);
          contentHeight += childResult.height;
        }
        
        // 检查是否超出页面高度
        tempContainer.innerHTML = targetPage.innerHTML;
        tempContainer.appendChild(elementCopy);
        const currentHeight = tempContainer.scrollHeight;
        
        if (currentHeight > maxHeight) {
          // 保存当前页面（不包括当前元素）
          pages.push(targetPage.innerHTML);
          
          // 开始新页面，添加当前元素
          targetPage = document.createElement('div');
          targetPage.appendChild(elementCopy);
          
          // 重置测量
          emptyHeight = 0;
          contentHeight = 0;
        }
      }
      
      // 添加元素到目标页面
      if (elementCopy.childNodes.length > 0) {
        targetPage.appendChild(elementCopy);
      }
      
      return { height: contentHeight + emptyHeight };
    } else {
      // 内联元素，直接添加
      targetPage.appendChild(elementNode.cloneNode(true));
      return { height: 0 };
    }
  }

  // 在元素中处理文本
  processTextInElement(textNode, parentElement, tempContainer, remainingHeight, pages) {
    if (!textNode.textContent.trim()) {
      return { height: 0 };
    }
    
    const text = textNode.textContent;
    const words = text.split(/\s+/);
    let currentText = '';
    let processedHeight = 0;
    
    for (let i = 0; i < words.length; i++) {
      const testText = currentText + (currentText ? ' ' : '') + words[i];
      
      // 创建测试文本节点
      const testSpan = document.createElement('span');
      testSpan.textContent = testText;
      
      // 测量高度
      tempContainer.innerHTML = parentElement.innerHTML;
      tempContainer.appendChild(testSpan);
      const testHeight = tempContainer.scrollHeight;
      
      if (testHeight <= remainingHeight) {
        // 可以添加这个词
        currentText = testText;
      } else {
        // 不能添加，需要分页
        if (currentText.trim()) {
          const textSpan = document.createElement('span');
          textSpan.textContent = currentText;
          parentElement.appendChild(textSpan);
          processedHeight += testSpan.offsetHeight;
        }
        
        // 开始新页面
        pages.push(parentElement.innerHTML);
        parentElement.innerHTML = '';
        remainingHeight = tempContainer.clientHeight;
        
        // 重置并继续处理剩余词汇
        currentText = words[i];
      }
    }
    
    // 添加剩余文本
    if (currentText.trim()) {
      const textSpan = document.createElement('span');
      textSpan.textContent = currentText;
      parentElement.appendChild(textSpan);
      processedHeight += textSpan.offsetHeight;
    }
    
    return { height: processedHeight };
  }

  // 按元素分割内容（原有方法，作为备选）
  splitContentByElement(contentElement, containerHeight) {
    if (!contentElement) return [''];
    
    const pages = [];
    const clonedContent = contentElement.cloneNode(true);
    
    // 创建临时容器来测量内容
    const tempContainer = document.createElement('div');
    
    // 根据分栏设置计算宽度
    let containerWidth = this.contentArea.clientWidth - 80;
    if (this.settings.columnLayout === 'double') {
      // 双栏模式：减去栏间距，每栏宽度约为页面的一半
      containerWidth = Math.floor((this.contentArea.clientWidth - 80 - 20) / 2); // 20px是栏间距
    }
    
    tempContainer.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: ${containerWidth}px;
      padding: 40px;
      font-size: ${this.settings.fontSize};
      line-height: ${this.settings.lineHeight};
      font-family: ${this.settings.fontFamily};
      visibility: hidden;
      ${this.settings.columnLayout === 'double' ? 'column-count: 1;' : ''}
    `;
    document.body.appendChild(tempContainer);
    
    try {
      let currentPage = document.createElement('div');
      let currentHeight = 0;
      const maxHeight = containerHeight;
      
      // 递归处理元素
      const processElements = (elements, targetPage) => {
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const clonedElement = element.cloneNode(true);
          
          // 测量元素高度
          tempContainer.innerHTML = '';
          tempContainer.appendChild(clonedElement);
          const elementHeight = tempContainer.scrollHeight;
          
          // 如果添加这个元素会超出页面高度
          if (currentHeight + elementHeight > maxHeight && targetPage.children.length > 0) {
            // 开始新页面
            pages.push(targetPage.innerHTML);
            targetPage = document.createElement('div');
            currentHeight = 0;
          }
          
          // 处理块级元素（如p, div, h1-h6等）
          if (element.offsetHeight > 0 || ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'UL', 'OL', 'LI'].includes(element.tagName)) {
            targetPage.appendChild(clonedElement);
            currentHeight += elementHeight;
          } else {
            // 处理内联元素，尝试在当前段落中分割
            targetPage.appendChild(clonedElement);
          }
        }
        
        return targetPage;
      };
      
      // 处理所有子元素
      currentPage = processElements(Array.from(clonedContent.childNodes), currentPage);
      
      // 添加最后一页
      if (currentPage.innerHTML.trim()) {
        pages.push(currentPage.innerHTML);
      }
      
      // 如果没有分页成功，返回整个内容
      if (pages.length === 0) {
        pages.push(contentElement.innerHTML);
      }
      
    } finally {
      // 清理临时容器
      document.body.removeChild(tempContainer);
    }
    
    return pages.length > 0 ? pages : [''];
  }
  
// 销毁
  destroy() {
    if (this.reader) {
      this.reader.destroy();
    }
    
    // 清理全局引用
    if (typeof window !== 'undefined' && window.viewer === this) {
      delete window.viewer;
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
    this.currentPage = 0;
    this.totalPages = 1;
    this.isPagingMode = false;
    this.horizontalPages = null;
  }
}

export default EPUBViewer;