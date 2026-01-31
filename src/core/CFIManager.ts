/**
 * Book ID（Book Identifier）系统主入口
 * 提供位置追踪、文本选择和注释功能的核心API
 */

// 导入类型定义
import type { ReadingPosition, PositionChangeEvent } from '../types/Position';
import type { CFI } from '../types/CFI';

// 导入核心类
import { CFIGenerator } from './CFIGenerator';
import { CFIParser } from './CFIParser';
import { PositionTracker } from './PositionTracker';

// 导出类型定义
export * from '../types/CFI';
export * from '../types/Position';
export * from '../types/Selection';
export * from '../types/Annotation';

// 导出核心类
export { CFIGenerator } from './CFIGenerator';
export { CFIParser } from './CFIParser';
export { PositionTracker } from './PositionTracker';

/**
 * Book ID管理器 - 统一的Book ID操作接口
 */
export class CFIManager {
  private container: Element;
  private positionTracker: PositionTracker;
  private chapterId: string;

  constructor(container: Element, chapterId: string) {
    this.container = container;
    this.chapterId = chapterId;
    this.positionTracker = new PositionTracker(container);
  }

  /**
   * 初始化CFI系统
   */
  initialize(): void {
    this.positionTracker.startTracking();
  }

  /**
   * 销毁CFI系统
   */
  destroy(): void {
    this.positionTracker.destroy();
  }

  /**
   * 获取当前位置Book ID
   */
  getCurrentBookID(): CFI | null {
    return this.positionTracker.getCurrentCFI();
  }

  /**
   * 获取完整的位置信息
   */
  getCurrentPosition(): ReadingPosition | null {
    return this.positionTracker.getScrollPosition();
  }

/**
   * 恢复到指定Book ID位置
   */
  navigateToBookID(cfi: CFI | string, options?: { align?: 'start' | 'center' | 'end' }): boolean {
    // 检查是否在翻页模式，如果是，则使用特殊的翻页模式导航
    const viewer = (window as any).viewer;
    if (viewer && viewer.settings && viewer.settings.readingMode === 'page' && viewer.isPagingMode) {
      return viewer.navigateToPositionInPagingMode(cfi);
    }
    
    // 默认使用滚动模式导航
    return this.positionTracker.restorePosition(cfi, options);
  }

  /**
   * 从DOM元素生成Book ID
   */
  createBookIDFromElement(element: Element): CFI {
    return CFIGenerator.fromElement(element, this.chapterId);
  }

  /**
   * 从文本选择生成Book ID
   */
  createBookIDFromSelection(range: Range): any {
    return CFIGenerator.fromSelection(range, this.chapterId);
  }

  /**
   * 从滚动位置生成Book ID
   */
  createBookIDFromScrollPosition(scrollTop: number): CFI {
    return CFIGenerator.fromScrollPosition(scrollTop, this.chapterId, this.container);
  }

  /**
   * 解析Book ID字符串
   */
  parseBookID(bookString: string): CFI {
    return CFIParser.parse(bookString, { container: this.container, validate: true });
  }

  /**
   * 验证Book ID有效性
   */
  validateBookID(cfi: CFI): boolean {
    return CFIParser.validateBookID(cfi, this.container);
  }

  /**
   * 保存当前位置
   */
  savePosition(): void {
    this.positionTracker.savePosition();
  }

  /**
   * 恢复保存的位置
   */
restorePosition(): boolean {
    const savedPosition = this.positionTracker.getSavedPosition();
    return savedPosition ? this.navigateToBookID(savedPosition.cfi) : false;
  }

  /**
   * 监听位置变化
   */
  onPositionChange(callback: (event: PositionChangeEvent) => void): void {
    this.positionTracker.onPositionChange(callback);
  }

  /**
   * 移除位置变化监听器
   */
  offPositionChange(callback: (event: PositionChangeEvent) => void): void {
    this.positionTracker.offPositionChange(callback);
  }

  /**
   * 获取CFI对应的文本内容
   */
  getTextContent(cfi: CFI, contextLength?: number): string | null {
    return CFIParser.getTextContent(cfi, this.container, contextLength);
  }

  /**
   * 将Book ID转换为字符串
   */
  toString(cfi: CFI): string {
    return CFIGenerator.toString(cfi);
  }
}

// 默认导出CFIManager
export default CFIManager;