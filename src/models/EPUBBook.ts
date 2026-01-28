import Metadata from './Metadata.js';
import Chapter from './Chapter.js';
import TOCItem from './TOCItem.js';
import { BookData, ChapterData, SearchOptions, SearchResult } from '../types/index.js';

/**
 * EPUB书籍数据模型类
 */
export default class EPUBBook implements BookData {
  metadata: Metadata = new Metadata();
  chapters: Chapter[] = [];
  toc: TOCItem | null = null;
  manifest: Record<string, any> = {};
  spine: any[] = [];
  version: string = '';
  rootPath: string = '';

  /**
   * 添加章节
   * @param chapter 章节实例
   * @returns 当前书籍实例（支持链式调用）
   */
  addChapter(chapter: Chapter): EPUBBook {
    this.chapters.push(chapter);
    this.chapters.sort((a, b) => a.order - b.order);
    return this;
  }

  /**
   * 根据ID获取章节
   * @param id 章节ID
   * @returns 章节实例，未找到返回undefined
   */
  getChapterById(id: string): Chapter | undefined {
    return this.chapters.find(chapter => chapter.id === id);
  }

  /**
   * 根据href获取章节
   * @param href 章节href
   * @returns 章节实例，未找到返回undefined
   */
  getChapterByHref(href: string): Chapter | undefined {
    return this.chapters.find(chapter => chapter.href === href);
  }

  /**
   * 设置目录结构
   * @param tocRoot 目录根节点
   * @returns 当前书籍实例（支持链式调用）
   */
  setTableOfContents(tocRoot: TOCItem): EPUBBook {
    this.toc = tocRoot;
    return this;
  }

  /**
   * 获取扁平化目录
   * @returns 扁平化的目录项数组
   */
  getFlatTOC(): TOCItem[] {
    return this.toc ? this.toc.toArray() as any : [];
  }

  /**
   * 获取目录深度
   * @returns 目录深度（0表示无目录）
   */
  getTOCDepth(): number {
    if (!this.toc) return 0;
    
    let maxDepth = 0;
    
    function calculateDepth(item: TOCItem, currentDepth: number): void {
      maxDepth = Math.max(maxDepth, currentDepth);
      item.children.forEach(child => calculateDepth(child, currentDepth + 1));
    }
    
    this.toc.children.forEach(child => calculateDepth(child, 1));
    return maxDepth;
  }

  /**
   * 获取总字数
   * @returns 已加载章节的总字数
   */
  getTotalWordCount(): number {
    return this.chapters
      .filter(chapter => chapter.isLoaded)
      .reduce((total, chapter) => total + chapter.getWordCount(), 0);
  }

  /**
   * 获取书籍大小
   * @returns 已加载章节的总大小（字节数）
   */
  getSize(): number {
    return this.chapters
      .reduce((total, chapter) => total + chapter.size, 0);
  }

  /**
   * 搜索书籍内容
   * @param query 搜索关键词
   * @param options 搜索选项
   * @returns 搜索结果数组
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { caseSensitive = false, wholeWord = false, regex = false } = options;
    const results: SearchResult[] = [];
    
    // 确保所有章节都已加载
    for (const chapter of this.chapters) {
      if (!chapter.isLoaded) {
        console.warn(`Chapter ${chapter.id} is not loaded, skipping search`);
        continue;
      }
      
      const text = chapter.getPlainText();
      const matches = this.findMatches(text, query, caseSensitive, wholeWord, regex);
      
      if (matches.length > 0) {
        results.push({
          chapter: chapter as ChapterData,
          matches: matches
        });
      }
    }
    
    return results;
  }

  /**
   * 在文本中查找匹配项
   * @param text 要搜索的文本
   * @param query 查询关键词
   * @param caseSensitive 是否区分大小写
   * @param wholeWord 是否全词匹配
   * @param regex 是否使用正则表达式
   * @returns 匹配项数组
   */
  private findMatches(
    text: string, 
    query: string, 
    caseSensitive: boolean, 
    wholeWord: boolean, 
    regex: boolean
  ): Array<{text: string, index: number, context: string}> {
    const searchRegex = regex 
      ? new RegExp(query, caseSensitive ? 'g' : 'gi')
      : new RegExp(
          wholeWord ? `\\b${query}\\b` : query,
          caseSensitive ? 'g' : 'gi'
        );

    const matches: Array<{text: string, index: number, context: string}> = [];
    let match: RegExpExecArray | null;
    
    while ((match = searchRegex.exec(text)) !== null) {
      matches.push({
        text: match[0],
        index: match.index,
        context: this.getContext(text, match.index, 50)
      });
    }
    
    return matches;
  }

  /**
   * 获取匹配项的上下文
   * @param text 完整文本
   * @param index 匹配位置
   * @param radius 上下文半径
   * @returns 上下文文本
   */
  getContext(text: string, index: number, radius: number): string {
    const start = Math.max(0, index - radius);
    const end = Math.min(text.length, index + radius);
    return text.substring(start, end).trim();
  }

  /**
   * 销毁书籍实例，释放资源
   */
  destroy(): void {
    this.chapters = [];
    this.toc = null;
    this.manifest = {};
    this.spine = [];
  }
}