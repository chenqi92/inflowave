/**
 * Tauri 原生图表导出功能
 * 替代浏览器下载 API 的原生实现
 */

import { safeTauriInvoke } from '@/utils/tauri';

export interface ChartExportOptions {
  format: 'png' | 'svg' | 'pdf';
  chartInstance: any; // ECharts 实例
  filename?: string;
}

/**
 * 导出图表到本地文件
 * 在 Tauri 环境中使用原生文件保存对话框，在浏览器中使用传统下载方式
 */
export const exportChart = async (options: ChartExportOptions): Promise<void> => {
  const { format, chartInstance, filename } = options;
  
  if (!chartInstance) {
    throw new Error('图表实例未找到');
  }

  let dataContent: string;
  let defaultFileName: string;
  let mimeType: string;
  let fileExtension: string;

  // 根据格式生成图表数据
  switch (format) {
    case 'svg': {
      dataContent = chartInstance.renderToSVGString();
      defaultFileName = filename || `chart_${new Date().getTime()}.svg`;
      mimeType = 'image/svg+xml';
      fileExtension = 'svg';
      break;
    }
    case 'pdf':
      // PDF导出需要额外的库支持，这里先使用PNG替代
      dataContent = chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff',
      });
      defaultFileName = filename || `chart_${new Date().getTime()}.png`;
      mimeType = 'image/png';
      fileExtension = 'png';
      break;
    default: // png
      dataContent = chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff',
      });
      defaultFileName = filename || `chart_${new Date().getTime()}.png`;
      mimeType = 'image/png';
      fileExtension = 'png';
  }

  // 检查是否在 Tauri 环境中
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    // Tauri 环境：使用原生文件保存对话框
    const dialogResult = await safeTauriInvoke<{ path?: string; name?: string } | null>(
      'save_file_dialog',
      {
        params: {
          defaultPath: defaultFileName,
          filters: [{
            name: getFilterName(format),
            extensions: [fileExtension]
          }]
        }
      }
    );

    if (!dialogResult?.path) {
      // 用户取消了保存
      return;
    }

    // 保存文件
    if (format === 'svg') {
      // SVG 是文本格式
      await safeTauriInvoke('write_file', {
        path: dialogResult.path,
        content: dataContent
      });
    } else {
      // PNG 是二进制格式，需要从 data URL 转换
      const base64Data = dataContent.split(',')[1]; // 去掉 "data:image/png;base64," 前缀
      await safeTauriInvoke('write_binary_file', {
        path: dialogResult.path,
        data: base64Data
      });
    }

    console.log('图表已保存到:', dialogResult.path);
  } else {
    // 浏览器环境：使用传统下载方法
    if (format === 'svg') {
      const svgBlob = new Blob([dataContent], { type: mimeType });
      const svgUrl = URL.createObjectURL(svgBlob);
      const svgLink = document.createElement('a');
      svgLink.href = svgUrl;
      svgLink.download = defaultFileName;
      document.body.appendChild(svgLink);
      svgLink.click();
      document.body.removeChild(svgLink);
      URL.revokeObjectURL(svgUrl);
    } else {
      // 对于PNG，使用dataURL下载
      const link = document.createElement('a');
      link.href = dataContent;
      link.download = defaultFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};

/**
 * 根据格式获取文件过滤器名称
 */
const getFilterName = (format: string): string => {
  switch (format) {
    case 'svg':
      return 'SVG 图片';
    case 'png':
      return 'PNG 图片';
    case 'pdf':
      return 'PDF 文件';
    default:
      return '图片文件';
  }
};

/**
 * 批量导出多个图表
 */
export const exportMultipleCharts = async (
  charts: Array<{ instance: any; format: 'png' | 'svg' | 'pdf'; filename?: string }>
): Promise<void> => {
  for (const chart of charts) {
    try {
      await exportChart({
        format: chart.format,
        chartInstance: chart.instance,
        filename: chart.filename
      });
    } catch (error) {
      console.error(`导出图表失败 (${chart.filename}):`, error);
    }
  }
};

export default exportChart;