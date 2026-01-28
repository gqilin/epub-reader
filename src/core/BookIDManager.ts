/**
 * Book ID（Book Identifier）系统主入口
 * 提供位置追踪、文本选择和注释功能的核心API
 */

// 导入类型定义
import type { ReadingPosition, PositionChangeEvent } from '../types/Position';

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
export class BookIDManager {
  private container: Element;
  private positionTracker: PositionTracker;
  private chapterId: string;

  constructor(container: Element, chapterId: string) {
    this.container = container;
    this.chapterId = chapterId;
    this.positionTracker = new PositionTracker(container);
  }

  /**
   * 初始化Book ID系统
   */
  initialize(): void {
    this.positionTracker.startTracking();
  }

  /**
   * 销毁Book ID系统
   */
  destroy(): void {
    this.positionTracker.destroy();
  }

  /**
   * 获取当前Book ID
   */
getCurrentBookID(): any | null {
    const position = this.positionTracker.getScrollPosition();
    return position?.cfi || null;
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
  navigateToBookID(bookId: any | string, options?: { align?: 'start' | 'center' | 'end' }): boolean {
    return this.positionTracker.restorePosition(bookId, options);
  }

  /**
   * 从DOM元素生成Book ID
   */
  createBookIDFromElement(element: Element): any {
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
  createBookIDFromScrollPosition(scrollTop: number): any {
    return CFIGenerator.fromScrollPosition(scrollTop, this.chapterId, this.container);
  }

  /**
   * 解析Book ID字符串
   */
  parseBookID(bookString: string): any {
    return CFIParser.parse(bookString, { container: this.container, validate: true });
  }

  /**
   * 验证Book ID有效性
   */
  validateBookID(bookId: any): boolean {
    return CFIParser.validateBookID(bookId, this.container);
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
   * 获取Book ID对应的文本内容
   */
  getTextContent(bookId: any, contextLength?: number): string | null {
    return CFIParser.getTextContent(bookId, this.container, contextLength);
  }

  /**
   * 将Book ID转换为字符串
   */
  toString(bookId: any): string {
    return CFIGenerator.toString(bookId);
  }
}

// 默认导出Book IDManager
export default BookIDManager;