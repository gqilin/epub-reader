import { TOCItemData } from '../types/index.js';

/**
 * EPUB目录项类
 */
export default class TOCItem implements TOCItemData {
  id: string;
  title: string;
  href: string;
  order: number;
  level: number;
  children: TOCItem[];
  parent: TOCItem | null;

  constructor(id: string, title: string, href: string, order: number = 0, level: number = 0, children: TOCItem[] = []) {
    this.id = id;
    this.title = title;
    this.href = href;
    this.order = order;
    this.level = level;
    this.children = children;
    this.parent = null;
  }

  /**
   * 添加子目录项
   * @param child 子目录项
   * @returns 当前目录项（支持链式调用）
   */
  addChild(child: TOCItem): TOCItem {
    child.parent = this;
    this.children.push(child);
    return this;
  }

  /**
   * 根据ID查找子目录项
   * @param id 目录项ID
   * @returns 找到的目录项，未找到返回null
   */
  findChildById(id: string): TOCItem | null {
    if (this.id === id) return this;
    
    for (const child of this.children) {
      const found = child.findChildById(id);
      if (found) return found;
    }
    
    return null;
  }

  /**
   * 转换为扁平化数组
   * @returns 扁平化的目录项数组
   */
  toArray(): TOCItemData[] {
    const result: TOCItemData[] = [{ 
      id: this.id, 
      title: this.title, 
      href: this.href, 
      order: this.order, 
      level: this.level, 
      children: [] as TOCItemData[], 
      parent: null 
    }];
    
    this.children.forEach(child => {
      result.push(...child.toArray());
    });
    
    return result;
  }

  /**
   * 从NCX navItem创建TOCItem
   * @param navItem NCX导航项
   * @param order 排序
   * @param level 层级
   * @returns TOCItem实例
   */
  static fromNCXNavItem(navItem: any, order: number = 0, level: number = 0): TOCItem {
    const item = new TOCItem(
      navItem.id || '',
      navLabelContent(navItem),
      navItem.content?.src || '',
      order,
      level
    );

    if (navItem.navPoint) {
      const children = Array.isArray(navItem.navPoint) 
        ? navItem.navPoint 
        : [navItem.navPoint];
      
      children.forEach((child: any, index: number) => {
        item.addChild(TOCItem.fromNCXNavItem(child, index, level + 1));
      });
    }

    return item;
  }

  /**
   * 从NAV listItem创建TOCItem
   * @param listItem 导航列表项
   * @param order 排序
   * @param level 层级
   * @returns TOCItem实例
   */
  static fromNAVListItem(listItem: any, order: number = 0, level: number = 0): TOCItem {
    const item = new TOCItem(
      listItem.id || '',
      listItem.label?.text || '',
      listItem.href || '',
      order,
      level
    );

    if (listItem.sublist) {
      listItem.sublist.forEach((child: any, index: number) => {
        item.addChild(TOCItem.fromNAVListItem(child, index, level + 1));
      });
    }

    return item;
  }
}

/**
 * 获取导航标签内容
 * @param navPoint 导航点
 * @returns 标签文本
 */
function navLabelContent(navPoint: any): string {
  if (navPoint.navLabel?.text) {
    return navPoint.navLabel.text;
  }
  if (navPoint.text) {
    return navPoint.text;
  }
  return '';
}