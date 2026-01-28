import { ChapterData } from '../types/index.js';

/**
 * EPUB章节数据类
 */
export default class Chapter implements ChapterData {
  id: string;
  href: string;
  title: string;
  order: number;
  content: string = '';
  mediaType: string = 'application/xhtml+xml';
  size: number = 0;
  isLoaded: boolean = false;

  constructor(id: string, href: string, title: string = '', order: number = 0) {
    this.id = id;
    this.href = href;
    this.title = title;
    this.order = order;
  }

  /**
   * 设置章节内容
   * @param content 章节内容
   * @param mediaType 媒体类型
   * @returns 当前章节实例（支持链式调用）
   */
  setContent(content: string, mediaType: string = 'application/xhtml+xml'): Chapter {
    this.content = content;
    this.mediaType = mediaType;
    this.size = content ? content.length : 0;
    this.isLoaded = true;
    return this;
  }

  /**
   * 获取纯文本内容（去除HTML标签）
   * @returns 纯文本内容
   */
  getPlainText(): string {
    if (!this.content) return '';
    
    // 简单的HTML标签移除
    return this.content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 获取字数统计
   * @returns 字数
   */
  getWordCount(): number {
    const text = this.getPlainText();
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * 从OPF Spine项创建Chapter实例
   * @param spineItem Spine项
   * @param manifest Manifest对象
   * @param order 章节顺序
   * @returns Chapter实例
   */
  static fromOPFSpineItem(spineItem: any, manifest: Record<string, any>, order: number): Chapter {
    const manifestItem = manifest[spineItem.idref];
    if (!manifestItem) {
      throw new Error(`Manifest item not found for spine item: ${spineItem.idref}`);
    }

    const chapter = new Chapter(
      spineItem.idref,
      manifestItem.href,
      manifestItem.href.split('/').pop().replace(/\.[^/.]+$/, ''),
      order
    );

    // 设置媒体类型
    if (manifestItem.mediaType) {
      chapter.mediaType = manifestItem.mediaType;
    }

    return chapter;
  }
}