/**
 * 位置追踪相关类型定义
 */

import { CFI } from './CFI.js';

/**
 * 阅读位置信息
 */
export interface ReadingPosition {
  /** CFI位置 */
  cfi: CFI;
  /** 当前章节ID */
  chapterId: string;
  /** 章节进度(0-1) */
  chapterProgress: number;
  /** 全书进度(0-1) */
  bookProgress: number;
  /** 创建时间戳 */
  timestamp: number;
  /** 视口偏移 */
  viewportOffset?: number;
  /** 页面位置 */
  pageNumber?: number;
  /** 总页数 */
  totalPages?: number;
}

/**
 * 位置追踪配置
 */
export interface PositionTrackingConfig {
  /** 是否自动保存位置 */
  autoSave?: boolean;
  /** 位置变化阈值（像素） */
  positionThreshold?: number;
  /** 保存间隔（毫秒） */
  saveInterval?: number;
  /** 是否追踪滚动位置 */
  trackScroll?: boolean;
  /** 是否追踪选中文本 */
  trackSelection?: boolean;
}

/**
 * 位置变化事件
 */
export interface PositionChangeEvent {
  /** 当前位置 */
  current: ReadingPosition;
  /** 上一个位置 */
  previous?: ReadingPosition;
  /** 变化类型 */
  changeType: 'scroll' | 'selection' | 'chapter' | 'page';
  /** 变化量 */
  delta?: {
    /** 滚动变化量 */
    scroll?: number;
    /** 进度变化量 */
    progress?: number;
  };
}

/**
 * 书签数据
 */
export interface Bookmark {
  /** 唯一ID */
  id: string;
  /** 书籍ID */
  bookId: string;
  /** 位置CFI */
  cfi: CFI;
  /** 章节ID */
  chapterId: string;
  /** 书签标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 缩略图 */
  thumbnail?: string;
  /** 创建时间 */
  created: Date;
  /** 标签 */
  tags?: string[];
}

/**
 * 阅读进度统计
 */
export interface ReadingStats {
  /** 总页数 */
  totalPages: number;
  /** 已读页数 */
  pagesRead: number;
  /** 阅读时长（分钟） */
  timeSpent: number;
  /** 平均阅读速度（页/分钟） */
  averageReadingSpeed: number;
  /** 今日阅读时间 */
  todayTime: number;
  /** 本周阅读时间 */
  weekTime: number;
  /** 本月阅读时间 */
  monthTime: number;
}

/**
 * 阅读目标
 */
export interface ReadingGoal {
  /** 每日目标（分钟） */
  dailyMinutes: number;
  /** 每周目标（分钟） */
  weeklyMinutes: number;
  /** 每月目标（分钟） */
  monthlyMinutes: number;
  /** 当前完成情况 */
  progress: GoalProgress;
}

/**
 * 目标完成情况
 */
export interface GoalProgress {
  /** 日目标完成度 */
  daily: {
    target: number;
    actual: number;
    percentage: number;
  };
  /** 周目标完成度 */
  weekly: {
    target: number;
    actual: number;
    percentage: number;
  };
  /** 月目标完成度 */
  monthly: {
    target: number;
    actual: number;
    percentage: number;
  };
}