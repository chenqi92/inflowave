import logger from '@/utils/logger';
import i18n from 'i18next';

const translateGuide = (language: string, key: string, filename?: string): string =>
  (i18n.t as (key: string, options: Record<string, unknown>) => string)(key, {
    lng: language, ns: 'userGuide', filename,
  });
// 文档加载器 - 用于加载用户文档、
export interface DocumentInfo {
  filename: string;
  title: string;
  order: number;
  description?: string;
}

// 定义文档顺序和元信息
export const DOCUMENT_ORDER: DocumentInfo[] = [
  {
    filename: 'README.md',
    title: '📖 欢迎使用 InfloWave',
    order: 1,
    description: '软件介绍和功能概览',
  },
  {
    filename: 'installation.md',
    title: '🔧 安装指南',
    order: 2,
    description: '详细的安装步骤和系统要求',
  },
  {
    filename: 'quick-start.md',
    title: '🚀 快速开始',
    order: 3,
    description: '5分钟快速上手指南',
  },
  {
    filename: 'connection-management.md',
    title: '🔗 连接管理',
    order: 4,
    description: '数据库连接配置和管理',
  },
  {
    filename: 'database-operations.md',
    title: '🗄️ 数据库操作',
    order: 5,
    description: '数据库和保留策略管理',
  },
  {
    filename: 'query-features.md',
    title: '🔍 查询功能',
    order: 6,
    description: 'InfluxQL 查询编辑和执行',
  },
  {
    filename: 'data-visualization.md',
    title: '📊 数据可视化',
    order: 7,
    description: '图表创建和仪表板配置',
  },
  {
    filename: 'data-import.md',
    title: '📥 数据写入',
    order: 8,
    description: '数据导入和写入操作',
  },
  {
    filename: 'shortcuts.md',
    title: '⚡ 快捷操作',
    order: 9,
    description: '键盘快捷键和右键菜单',
  },
  {
    filename: 'faq.md',
    title: '❓ 常见问题',
    order: 10,
    description: '常见问题解答',
  },
];

/**
 * 加载单个文档内容
 * @param filename 文件名
 * @returns 文档内容
 */
export const loadDocumentContent = async (
  filename: string,
  language: string = i18n.language || 'en-US'
): Promise<string> => {
  try {
    const directory = language.startsWith('zh') ? '/user-docs' : '/user-docs/en-US';
    const response = await fetch(`${directory}/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    logger.warn(`Failed to load document: ${filename}`, error);

    return `# ${translateGuide(language, 'loadErrorTitle')}\n\n${translateGuide(language, 'loadError', filename)}`;
  }
};

/**
 * 加载所有用户文档
 * @returns 文档列表
 */
export const loadAllDocuments = async (language: string = i18n.language || 'en-US') => {
  const documents = [];

  for (const docInfo of DOCUMENT_ORDER) {
    const title = translateGuide(language, `documents.${docInfo.filename.replace(/\.md$/, '')}`);
    try {
      const content = await loadDocumentContent(docInfo.filename, language);
      documents.push({
        id: docInfo.filename,
        title,
        filename: docInfo.filename,
        content,
        order: docInfo.order,
        description: docInfo.description,
      });
    } catch (error) {
      logger.error(`Failed to load document: ${docInfo.filename}`, error);
      // 即使加载失败也添加一个占位符
      documents.push({
        id: docInfo.filename,
        title,
        filename: docInfo.filename,
        content: `# ${title}\n\n${translateGuide(language, 'loadError', docInfo.filename)}`,
        order: docInfo.order,
        description: docInfo.description,
      });
    }
  }

  return documents.sort((a, b) => a.order - b.order);
};

/**
 * 根据文件名获取文档信息
 * @param filename 文件名
 * @returns 文档信息
 */
export const getDocumentInfo = (filename: string): DocumentInfo | undefined => {
  return DOCUMENT_ORDER.find(doc => doc.filename === filename);
};

/**
 * 获取文档总数
 * @returns 文档总数
 */
export const getDocumentCount = (): number => {
  return DOCUMENT_ORDER.length;
};
