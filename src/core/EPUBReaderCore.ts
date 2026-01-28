/**
 * EPUB阅读器核心类
 * 整合CFI管理和高亮功能
 */

import { CFIManager } from './CFIManager.js';
import { HighlightManager } from './HighlightManager.js';
import { AnnotationConfig } from '../types/Annotation.js';
import { CFI } from '../types/CFI.js';

/**
 * EPUB阅读器配置
 */
export interface EPUBReaderConfig {
  /** 注释配置 */
  annotation?: AnnotationConfig;
  /** 是否启用位置追踪 */
  enablePositionTracking?: boolean;
  /** 是否启用高亮 */
  enableHighlight?: boolean;
  /** 章节ID */
  chapterId?: string;
}

/**
 * EPUB阅读器核心类
 */
export class EPUBReaderCore {
  private container: Element;
  private config: EPUBReaderConfig;
  private cfiManager?: CFIManager;
  private highlightManager?: HighlightManager;
  private chapterId: string;
  private isInitialized: boolean = false;

  constructor(container: Element, config: EPUBReaderConfig = {}) {
    this.container = container;
    this.config = {
      enablePositionTracking: true,
      enableHighlight: true,
      chapterId: 'chapter-1',
      ...config
    };
    this.chapterId = this.config.chapterId || 'chapter-1';
  }

  /**
   * 初始化阅读器
   */
  initialize(): void {
    if (this.isInitialized) {
      console.warn('EPUBReaderCore is already initialized');
      return;
    }

    try {
      // 初始化CFI管理器
      if (this.config.enablePositionTracking) {
        this.cfiManager = new CFIManager(this.container, this.chapterId);
        this.cfiManager.initialize();
      }

      // 初始化高亮管理器
      if (this.config.enableHighlight) {
        this.highlightManager = new HighlightManager(this.container, this.config.annotation);
      }

      this.isInitialized = true;
      console.log('EPUBReaderCore initialized successfully');
    } catch (error) {
      console.error('Failed to initialize EPUBReaderCore:', error);
      throw error;
    }
  }

  /**
   * 销毁阅读器
   */
  destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      this.cfiManager?.destroy();
      this.highlightManager?.destroy();
      this.isInitialized = false;
      console.log('EPUBReaderCore destroyed successfully');
    } catch (error) {
      console.error('Error during EPUBReaderCore destruction:', error);
    }
  }

  /**
   * 获取当前位置的Book ID
   */
  getCurrentBookID(): CFI | null {
    this.ensureInitialized();
    return this.cfiManager?.getCurrentBookID() || null;
  }

  /**
   * 导航到指定Book ID
   */
  navigateToBookID(cfi: CFI | string, options?: { align?: 'start' | 'center' | 'end' }): boolean {
    this.ensureInitialized();
    return this.cfiManager?.navigateToBookID(cfi, options) || false;
  }

  /**
   * 从DOM元素创建Book ID
   */
  createBookIDFromElement(element: Element): CFI {
    this.ensureInitialized();
    if (!this.cfiManager) {
      throw new Error('CFIManager not initialized');
    }
    return this.cfiManager.createBookIDFromElement(element);
  }

  /**
   * 从文本选择创建Book ID
   */
  createBookIDFromSelection(range: Range): any {
    this.ensureInitialized();
    if (!this.cfiManager) {
      throw new Error('CFIManager not initialized');
    }
    return this.cfiManager.createBookIDFromSelection(range);
  }

  /**
   * 创建高亮
   */
  createHighlight(
    range: Range,
    styleNameOrObject: string | any,
    bookId?: string
  ): any {
    this.ensureInitialized();
    if (!this.highlightManager) {
      throw new Error('HighlightManager not initialized');
    }
    return this.highlightManager.createHighlight(range, styleNameOrObject, bookId || 'default-book', this.chapterId);
  }

  /**
   * 更新高亮
   */
  updateHighlight(highlightId: string, styleNameOrObject: string | any): boolean {
    this.ensureInitialized();
    return this.highlightManager?.updateHighlight(highlightId, styleNameOrObject) || false;
  }

  /**
   * 删除高亮
   */
  removeHighlight(highlightId: string): boolean {
    this.ensureInitialized();
    return this.highlightManager?.removeHighlight(highlightId) || false;
  }

  /**
   * 切换高亮显示状态
   */
  toggleHighlight(highlightId: string): boolean {
    this.ensureInitialized();
    return this.highlightManager?.toggleHighlight(highlightId) || false;
  }

  /**
   * 获取所有高亮
   */
  getAllHighlights(): any[] {
    this.ensureInitialized();
    return this.highlightManager?.getAllHighlights() || [];
  }

  /**
   * 按书籍ID获取高亮
   */
  getHighlightsByBook(bookId: string): any[] {
    this.ensureInitialized();
    return this.highlightManager?.getHighlightsByBook(bookId) || [];
  }

  /**
   * 按章节ID获取高亮
   */
  getHighlightsByChapter(chapterId: string): any[] {
    this.ensureInitialized();
    return this.highlightManager?.getHighlightsByChapter(chapterId) || [];
  }

  /**
   * 获取高亮样式管理器
   */
  getHighlightStyleManager(): any {
    this.ensureInitialized();
    return this.highlightManager?.getStyleManager();
  }

  /**
   * 监听位置变化
   */
  onPositionChange(callback: (event: any) => void): void {
    this.ensureInitialized();
    this.cfiManager?.onPositionChange(callback);
  }

  /**
   * 移除位置变化监听器
   */
  offPositionChange(callback: (event: any) => void): void {
    this.ensureInitialized();
    this.cfiManager?.offPositionChange(callback);
  }

  /**
   * 保存当前位置
   */
  savePosition(): void {
    this.ensureInitialized();
    this.cfiManager?.savePosition();
  }

  /**
   * 恢复保存的位置
   */
  restorePosition(): boolean {
    this.ensureInitialized();
    return this.cfiManager?.restorePosition() || false;
  }

  /**
   * 导出所有数据
   */
  exportData(): {
    highlights: any[];
    currentPosition?: CFI | null;
    timestamp: number;
  } {
    this.ensureInitialized();
    
    return {
      highlights: this.highlightManager?.exportHighlights() || [],
      currentPosition: this.getCurrentBookID(),
      timestamp: Date.now()
    };
  }

  /**
   * 导入数据
   */
  importData(data: {
    highlights?: any[];
    currentPosition?: CFI;
  }): void {
    this.ensureInitialized();
    
    try {
      // 导入高亮
      if (data.highlights && this.highlightManager) {
        this.highlightManager.importHighlights(data.highlights);
      }

      // 恢复位置
      if (data.currentPosition && this.cfiManager) {
        this.navigateToBookID(data.currentPosition);
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    highlights?: any;
    position?: CFI | null;
  } {
    this.ensureInitialized();
    
    return {
      highlights: this.highlightManager?.getStats(),
      position: this.getCurrentBookID()
    };
  }

  /**
   * 设置章节ID
   */
  setChapterId(chapterId: string): void {
    this.chapterId = chapterId;
    // 如果CFI管理器已初始化，需要重新创建
    if (this.cfiManager && this.isInitialized) {
      this.cfiManager.destroy();
      this.cfiManager = new CFIManager(this.container, chapterId);
      this.cfiManager.initialize();
    }
  }

  /**
   * 获取当前章节ID
   */
  getChapterId(): string {
    return this.chapterId;
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取配置
   */
  getConfig(): EPUBReaderConfig {
    return { ...this.config };
  }

  // 私有方法

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('EPUBReaderCore is not initialized. Call initialize() first.');
    }
  }
}

// 默认导出
export default EPUBReaderCore;