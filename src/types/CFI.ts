/**
 * CFI（Canonical Fragment Identifier）相关类型定义
 */

/**
 * CFI基础结构
 * 表示EPUB内容中的精确位置
 */
export interface CFI {
  /** 章节ID */
  chapterId: string;
  /** DOM路径数组 */
  path: CFIPath[];
  /** 文本偏移量 */
  textOffset?: number;
  /** 字符偏移量 */
  characterOffset?: number;
  /** 内容哈希（用于验证） */
  hash?: string;
}

/**
 * CFI路径节点
 * 表示DOM树中的一个位置
 */
export interface CFIPath {
  /** 节点类型 */
  type: 'element' | 'text' | 'offset';
  /** 索引位置 */
  index: number;
  /** 元素ID（可选） */
  elementId?: string;
  /** 元素类名（可选） */
  elementClass?: string;
  /** 标签名 */
  tagName?: string;
  /** 文本内容（用于定位） */
  textContent?: string;
  /** 属性信息 */
  attributes?: Record<string, string>;
}

/**
 * CFI解析选项
 */
export interface CFIParseOptions {
  /** 是否严格模式 */
  strict?: boolean;
  /** 是否验证路径有效性 */
  validate?: boolean;
  /** 容器元素 */
  container?: Element;
}

/**
 * CFI生成选项
 */
export interface CFIGenerationOptions {
  /** 是否包含元素ID */
  includeElementId?: boolean;
  /** 是否包含类名 */
  includeClass?: boolean;
  /** 是否包含文本片段 */
  includeTextSnippet?: boolean;
  /** 最大文本片段长度 */
  maxTextLength?: number;
}