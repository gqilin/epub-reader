import { ReadingPosition, PositionTrackingConfig, PositionChangeEvent } from '../types/Position';
import { CFI } from '../types/CFI';
import { CFIGenerator } from './CFIGenerator';
import { CFIParser } from './CFIParser';

/**
 * 位置追踪器
 * 紫责追踪用户的阅读位置并自动保存
 */
export class PositionTracker {
  private container: Element;
  private config: PositionTrackingConfig;
  private currentPosition: ReadingPosition | null = null;
  private lastSavePosition: ReadingPosition | null = null;
  private isTracking = false;
  private saveTimer: number | null = null;
  private scrollTimer: number | null = null;
  
  // 事件监听器
  private positionChangeCallbacks: Array<(event: PositionChangeEvent) => void> = [];
  private scrollHandler: ((event: Event) => void) | null = null;
  private selectionChangeHandler: ((event: Event) => void) | null = null;

  constructor(container: Element, config: PositionTrackingConfig = {}) {
    this.container = container;
    this.config = {
      autoSave: true,
      positionThreshold: 100,
      saveInterval: 5000,
      trackScroll: true,
      trackSelection: false,
      ...config
    };

    this.bindEvents();
  }

  /**
   * 开始追踪位置
   */
  startTracking(): void {
    if (this.isTracking) {
      return;
    }

    this.isTracking = true;
    this.lastSavePosition = this.getScrollPosition();
    
    if (this.config.autoSave) {
      this.startAutoSave();
    }
  }

  /**
   * 停止追踪位置
   */
  stopTracking(): void {
    this.isTracking = false;
    
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = null;
    }
  }

  /**
   * 获取当前位置CFI
   * @returns CFI对象
   */
  getCurrentCFI(): CFI | null {
    try {
      // 获取当前视口中最可见的元素
      const visibleElement = this.getMostVisibleElement();
      if (!visibleElement) {
        return null;
      }

      // 生成CFI
      return CFIGenerator.fromElement(visibleElement, this.getChapterId());
    } catch (error) {
      console.warn('Failed to get current CFI:', error);
      return null;
    }
  }

  /**
   * 获取滚动位置
   * @returns 阅读位置对象
   */
  getScrollPosition(): ReadingPosition {
    const cfi = this.getCurrentCFI();
    const scrollTop = this.container.scrollTop;
    const scrollHeight = this.container.scrollHeight;
    const clientHeight = this.container.clientHeight;
    
    // 计算进度
    const scrollProgress = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;
    
    // 获取章节ID
    const chapterId = this.getChapterId();
    
    // 计算章节进度
    const chapterProgress = this.calculateChapterProgress(scrollTop);
    
    // 计算全书进度（这里需要外部提供章节信息）
    const bookProgress = this.calculateBookProgress(chapterId, chapterProgress);

    const position: ReadingPosition = {
      cfi: cfi || { chapterId, path: [] },
      chapterId,
      chapterProgress,
      bookProgress,
      timestamp: Date.now(),
      viewportOffset: scrollTop,
      pageNumber: Math.floor(scrollProgress * this.estimateTotalPages()),
      totalPages: this.estimateTotalPages()
    };

    this.currentPosition = position;
    return position;
  }

  /**
   * 监听位置变化
   * @param callback 位置变化回调
   */
  onPositionChange(callback: (event: PositionChangeEvent) => void): void {
    this.positionChangeCallbacks.push(callback);
  }

  /**
   * 移除位置变化监听器
   * @param callback 要移除的回调
   */
  offPositionChange(callback: (event: PositionChangeEvent) => void): void {
    const index = this.positionChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.positionChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * 保存当前位置
   */
  savePosition(): void {
    const position = this.getScrollPosition();
    this.lastSavePosition = position;
    
    // 触发保存事件
    this.triggerPositionChange({
      current: position,
      previous: this.lastSavePosition,
      changeType: 'scroll'
    });

    // 可以添加本地存储逻辑
    if (typeof localStorage !== 'undefined') {
      const bookId = this.getBookId();
      if (bookId) {
        localStorage.setItem(`epub-position-${bookId}`, JSON.stringify(position));
      }
    }
  }

  /**
   * 恢复到指定位置
   * @param cfi CFI对象或CFI字符串
   * @param options 恢复选项
   */
  restorePosition(cfi: CFI | string, options: { align?: 'start' | 'center' | 'end' } = {}): boolean {
    try {
      const cfiObj = typeof cfi === 'string' ? CFIParser.parse(cfi) : cfi;
      
      if (!CFIParser.validateBookID(cfiObj, this.container)) {
        console.warn('CFI validation failed');
        return false;
      }

      CFIParser.restoreScrollPosition(cfiObj, this.container, options);
      
      // 更新当前位置
      this.currentPosition = {
        cfi: cfiObj,
        chapterId: cfiObj.chapterId,
        chapterProgress: 0,
        bookProgress: 0,
        timestamp: Date.now()
      };

      return true;
    } catch (error) {
      console.error('Failed to restore position:', error);
      return false;
    }
  }

  /**
   * 获取保存的位置
   * @param bookId 书籍ID
   * @returns 保存的位置
   */
  getSavedPosition(bookId?: string): ReadingPosition | null {
    try {
      const targetBookId = bookId || this.getBookId();
      if (!targetBookId || typeof localStorage === 'undefined') {
        return null;
      }

      const positionData = localStorage.getItem(`epub-position-${targetBookId}`);
      return positionData ? JSON.parse(positionData) : null;
    } catch (error) {
      console.warn('Failed to get saved position:', error);
      return null;
    }
  }

  /**
   * 清除保存的位置
   * @param bookId 书籍ID
   */
  clearSavedPosition(bookId?: string): void {
    try {
      const targetBookId = bookId || this.getBookId();
      if (!targetBookId || typeof localStorage === 'undefined') {
        return;
      }

      localStorage.removeItem(`epub-position-${targetBookId}`);
    } catch (error) {
      console.warn('Failed to clear saved position:', error);
    }
  }

  /**
   * 销毁追踪器
   */
  destroy(): void {
    this.stopTracking();
    this.unbindEvents();
    this.positionChangeCallbacks = [];
    this.currentPosition = null;
    this.lastSavePosition = null;
  }

  // 私有方法

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (this.config.trackScroll) {
      this.scrollHandler = this.handleScroll.bind(this);
      this.container.addEventListener('scroll', this.scrollHandler, { passive: true });
    }

    if (this.config.trackSelection) {
      this.selectionChangeHandler = this.handleSelectionChange.bind(this);
      document.addEventListener('selectionchange', this.selectionChangeHandler, { passive: true });
    }
  }

  /**
   * 解绑事件
   */
  private unbindEvents(): void {
    if (this.scrollHandler) {
      this.container.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }

    if (this.selectionChangeHandler) {
      document.removeEventListener('selectionchange', this.selectionChangeHandler);
      this.selectionChangeHandler = null;
    }
  }

  /**
   * 处理滚动事件
   */
  private handleScroll(): void {
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }

    this.scrollTimer = window.setTimeout(() => {
      this.handleScrollEnd();
    }, 150); // 防抖延迟
  }

  /**
   * 处理滚动结束
   */
  private handleScrollEnd(): void {
    const currentPosition = this.getScrollPosition();
    
    if (!this.lastSavePosition || this.hasSignificantChange(this.lastSavePosition, currentPosition)) {
      this.savePosition();
    }
  }

  /**
   * 处理选择变化
   */
  private handleSelectionChange(): void {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const cfi = CFIGenerator.fromSelection(range, this.getChapterId());
      
      this.triggerPositionChange({
        current: {
          cfi: cfi.startCFI,
          chapterId: cfi.chapterId,
          chapterProgress: 0,
          bookProgress: 0,
          timestamp: Date.now()
        },
        changeType: 'selection'
      });
    }
  }

  /**
   * 开始自动保存
   */
  private startAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }

    this.saveTimer = window.setInterval(() => {
      this.savePosition();
    }, this.config.saveInterval);
  }

  /**
   * 获取最可见的元素
   */
  private getMostVisibleElement(): Element | null {
const viewportHeight = window.innerHeight;
    const viewportCenter = viewportHeight / 2;

    let bestElement: Element | null = null;
    let maxVisibility = 0;

    const candidates = this.container.querySelectorAll('p, div, section, article, h1, h2, h3, h4, h5, h6');

    for (const element of candidates) {
      const rect = element.getBoundingClientRect();
      
      // 计算元素在视口中的可见程度
      const top = Math.max(0, rect.top);
      const bottom = Math.min(window.innerHeight, rect.bottom);
      const height = Math.max(0, bottom - top);
      
      // 计算与视口中心的距离
      const distanceFromCenter = Math.abs((top + height / 2) - viewportCenter);
      
      // 综合评分（可见程度 + 距离中心）
      const visibility = height / rect.height;
      const centrality = 1 - (distanceFromCenter / viewportHeight);
      const score = visibility * 0.7 + centrality * 0.3;

      if (score > maxVisibility) {
        maxVisibility = score;
        bestElement = element;
      }
    }

    return bestElement;
  }

  /**
   * 获取章节ID
   */
  private getChapterId(): string {
    // 尝试从data属性获取
    const chapterData = this.container.getAttribute('data-chapter');
    if (chapterData) {
      return chapterData;
    }

    // 尝试从URL或其他位置获取
    // 这里可以根据实际项目需求进行调整
    return 'default-chapter';
  }

  /**
   * 获取书籍ID
   */
  private getBookId(): string | null {
    // 尝试从data属性获取
    return this.container.getAttribute('data-book-id');
  }

  /**
   * 计算章节进度
   */
  private calculateChapterProgress(scrollTop: number): number {
    const scrollHeight = this.container.scrollHeight;
    const clientHeight = this.container.clientHeight;
    
    return scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;
  }

  /**
   * 计算全书进度
   */
  private calculateBookProgress(_chapterId: string, chapterProgress: number): number {
    // 这里需要外部提供章节信息来计算全书进度
    // 暂时返回章节进度
    return chapterProgress;
  }

  /**
   * 估计总页数
   */
  private estimateTotalPages(): number {
    const scrollHeight = this.container.scrollHeight;
    const clientHeight = this.container.clientHeight;
    return Math.ceil(scrollHeight / clientHeight);
  }

  /**
   * 检查是否有显著变化
   */
  private hasSignificantChange(oldPosition: ReadingPosition, newPosition: ReadingPosition): boolean {
    if (!oldPosition.viewportOffset || !newPosition.viewportOffset) {
      return true;
    }

    const scrollDiff = Math.abs(oldPosition.viewportOffset - newPosition.viewportOffset);
    return scrollDiff > (this.config.positionThreshold || 100);
  }

  /**
   * 触发位置变化事件
   */
  private triggerPositionChange(event: Partial<PositionChangeEvent>): void {
    const fullEvent: PositionChangeEvent = {
      current: event.current || this.currentPosition!,
      previous: event.previous,
      changeType: event.changeType || 'scroll',
      delta: event.delta
    };

    this.positionChangeCallbacks.forEach(callback => {
      try {
        callback(fullEvent);
      } catch (error) {
        console.warn('Position change callback error:', error);
      }
    });
  }
}