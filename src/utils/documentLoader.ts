// 文档加载器 - 用于加载用户文档
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
  filename: string
): Promise<string> => {
  try {
    // 在 Vite 中使用动态导入加载文本文件
    const response = await fetch(`/user-docs/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.warn(`Failed to load document: ${filename}`, error);

    // 返回错误提示内容
    return `# 文档加载失败

抱歉，无法加载文档 "${filename}"。

## 可能的原因

- 文件不存在或路径错误
- 网络连接问题
- 权限不足

## 解决方案

1. 请检查文件是否存在于 user-docs 目录中
2. 刷新页面重试
3. 如果问题持续存在，请联系技术支持

---

**文件名**: ${filename}  
**错误信息**: ${error instanceof Error ? error.message : String(error)}`;
  }
};

/**
 * 加载所有用户文档
 * @returns 文档列表
 */
export const loadAllDocuments = async () => {
  const documents = [];

  for (const docInfo of DOCUMENT_ORDER) {
    try {
      const content = await loadDocumentContent(docInfo.filename);
      documents.push({
        id: docInfo.filename,
        title: docInfo.title,
        filename: docInfo.filename,
        content,
        order: docInfo.order,
        description: docInfo.description,
      });
    } catch (error) {
      console.error(`Failed to load document: ${docInfo.filename}`, error);
      // 即使加载失败也添加一个占位符
      documents.push({
        id: docInfo.filename,
        title: docInfo.title,
        filename: docInfo.filename,
        content: `# ${docInfo.title}\n\n文档加载失败，请稍后重试。`,
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
