/**
 * 注释系统相关类型定义
 */

import { CFI } from './CFI.js';
import { TextSelection } from './Selection.js';

/**
 * 基础注释接口
 */
export interface Annotation {
  /** 唯一ID */
  id: string;
  /** 注释类型 */
  type: 'highlight' | 'note' | 'bookmark';
  /** 位置信息 */
  cfi: CFI;
  /** 注释内容 */
  content: string;
  /** 创建时间 */
  created: Date;
  /** 修改时间 */
  modified?: Date;
  /** 书籍ID */
  bookId: string;
  /** 章节ID */
  chapterId: string;
  /** 是否可见 */
  visible?: boolean;
  /** 标签 */
  tags?: string[];
  /** 权限级别 */
  privacy?: 'public' | 'private' | 'shared';
}

/**
 * 高亮样式定义
 */
export interface HighlightStyle {
  /** 背景颜色 */
  backgroundColor?: string;
  /** 背景样式（支持渐变） */
  background?: string;
  /** 边框样式 */
  border?: string;
  /** 底部边框样式 */
  borderBottom?: string;
  /** 文字颜色 */
  color?: string;
  /** 透明度 */
  opacity?: number;
  /** 圆角 */
  borderRadius?: string;
  /** 自定义CSS类 */
  className?: string;
  /** 文本装饰 */
  textDecoration?: string;
  /** 盒子阴影 */
  boxShadow?: string;
}

/**
 * 高亮注释
 */
export interface HighlightAnnotation extends Annotation {
  type: 'highlight';
  /** 高亮颜色 */
  color: string;
  /** 高亮样式 */
  style: HighlightStyle;
  /** 选中文本 */
  selectedText: string;
  /** 文本范围 */
  textRange: TextSelection;
  /** 高亮ID（DOM元素标识） */
  highlightId?: string;
  /** 是否激活 */
  active?: boolean;
}

/**
 * 笔记注释
 */
export interface NoteAnnotation extends Annotation {
  type: 'note';
  /** 笔记标题 */
  title: string;
  /** 笔记内容 */
  content: string;
  /** 关联的文本选择 */
  selection?: TextSelection;
  /** 笔记类型 */
  noteType?: 'comment' | 'summary' | 'question' | 'idea';
  /** 优先级 */
  priority?: 'low' | 'medium' | 'high';
  /** 是否置顶 */
  pinned?: boolean;
}

/**
 * 书签注释
 */
export interface BookmarkAnnotation extends Annotation {
  type: 'bookmark';
  /** 书签标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 缩略图 */
  thumbnail?: string;
  /** 书签类型 */
  bookmarkType?: 'manual' | 'auto' | 'last-read';
}

/**
 * 注释过滤器
 */
export interface AnnotationFilter {
  /** 类型过滤 */
  types?: Annotation['type'][];
  /** 标签过滤 */
  tags?: string[];
  /** 章节过滤 */
  chapterIds?: string[];
  /** 时间范围 */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** 搜索关键词 */
  keyword?: string;
  /** 排序方式 */
  sortBy?: 'created' | 'modified' | 'type' | 'chapter';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 注释导出选项
 */
export interface ExportOptions {
  /** 导出格式 */
  format: 'json' | 'csv' | 'markdown' | 'html';
  /** 是否包含位置信息 */
  includeLocation?: boolean;
  /** 是否包含时间戳 */
  includeTimestamp?: boolean;
  /** 是否包含标签 */
  includeTags?: boolean;
  /** 自定义模板 */
  template?: string;
  /** 是否按章节分组 */
  groupByChapter?: boolean;
}

/**
 * 注释统计
 */
export interface AnnotationStats {
  /** 总数 */
  total: number;
  /** 按类型统计 */
  byType: Record<Annotation['type'], number>;
  /** 按章节统计 */
  byChapter: Record<string, number>;
  /** 按标签统计 */
  byTag: Record<string, number>;
  /** 最近创建 */
  recent: Annotation[];
  /** 最常使用的标签 */
  popularTags: Array<{
    tag: string;
    count: number;
  }>;
}

/**
 * 注释事件
 */
export interface AnnotationEvent {
  /** 事件类型 */
  type: 'create' | 'update' | 'delete' | 'click' | 'hover';
  /** 注释对象 */
  annotation: Annotation;
  /** 触发方式 */
  trigger: 'user' | 'system' | 'sync';
  /** 事件数据 */
  data?: any;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 注释管理配置
 */
export interface AnnotationConfig {
  /** 高亮样式预设 */
  highlightPresets?: Record<string, HighlightStyle>;
  /** 默认高亮颜色 */
  defaultHighlightColor?: string;
  /** 是否自动保存 */
  autoSave?: boolean;
  /** 保存间隔（毫秒） */
  saveInterval?: number;
  /** 最大注释数量 */
  maxAnnotations?: number;
  /** 是否启用标签 */
  enableTags?: boolean;
  /** 是否启用搜索 */
  enableSearch?: boolean;
  /** 是否启用自定义样式 */
  enableCustomStyles?: boolean;
  /** 最大自定义样式数量 */
  maxCustomStyles?: number;
}