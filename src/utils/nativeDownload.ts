/**
 * 原生下载工具
 * 提供桌面应用专用的文件保存功能，避免浏览器下载提示
 */

import { safeTauriInvoke } from '@/utils/tauri';

export interface NativeDownloadOptions {
  filename?: string;
  defaultDirectory?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

/**
 * 保存文本内容到文件
 */
export const saveTextFile = async (
  content: string,
  options: NativeDownloadOptions = {}
): Promise<boolean> => {
  try {
    const { filename = 'download.txt', defaultDirectory, filters } = options;
    
    // 显示原生文件保存对话框
    const dialogResult = await safeTauriInvoke<{ path?: string } | null>(
      'save_file_dialog',
      {
        default_path: defaultDirectory ? `${defaultDirectory}/${filename}` : filename,
        filters: filters || [
          { name: '文本文件', extensions: ['txt'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      }
    );

    if (!dialogResult || !dialogResult.path) {
      return false;
    }

    // 写入文件
    await safeTauriInvoke('write_file', {
      path: dialogResult.path,
      content
    });

    return true;
  } catch (error) {
    console.error('保存文本文件失败:', error);
    throw new Error(`保存失败: ${error}`);
  }
};

/**
 * 保存JSON数据到文件
 */
export const saveJsonFile = async (
  data: any,
  options: NativeDownloadOptions = {}
): Promise<boolean> => {
  const jsonContent = JSON.stringify(data, null, 2);
  return saveTextFile(jsonContent, {
    ...options,
    filename: options.filename || 'data.json',
    filters: [
      { name: 'JSON 文件', extensions: ['json'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });
};

/**
 * 保存二进制数据到文件
 */
export const saveBinaryFile = async (
  data: ArrayBuffer | Uint8Array,
  options: NativeDownloadOptions = {}
): Promise<boolean> => {
  try {
    const { filename = 'download.bin', defaultDirectory, filters } = options;
    
    // 显示原生文件保存对话框
    const dialogResult = await safeTauriInvoke<{ path?: string } | null>(
      'save_file_dialog',
      {
        params: {
          default_path: defaultDirectory ? `${defaultDirectory}/${filename}` : filename,
          filters: filters || [
            { name: '所有文件', extensions: ['*'] }
          ]
        }
      }
    );

    if (!dialogResult || !dialogResult.path) {
      return false;
    }

    // 转换为base64
    const uint8Array = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const binaryString = Array.from(uint8Array).map(byte => String.fromCharCode(byte)).join('');
    const base64Data = btoa(binaryString);

    // 写入二进制文件
    await safeTauriInvoke('write_binary_file', {
      path: dialogResult.path,
      data: base64Data
    });

    return true;
  } catch (error) {
    console.error('保存二进制文件失败:', error);
    throw new Error(`保存失败: ${error}`);
  }
};

/**
 * 保存图片文件
 */
export const saveImageFile = async (
  imageData: string, // base64 or data URL
  options: NativeDownloadOptions = {}
): Promise<boolean> => {
  // 如果是data URL，提取base64部分
  let base64Data = imageData;
  if (imageData.startsWith('data:')) {
    base64Data = imageData.split(',')[1];
  }

  try {
    const { filename = 'image.png', defaultDirectory, filters } = options;
    
    const dialogResult = await safeTauriInvoke<{ path?: string } | null>(
      'save_file_dialog',
      {
        default_path: defaultDirectory ? `${defaultDirectory}/${filename}` : filename,
        filters: filters || [
          { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp'] },
          { name: 'PNG 文件', extensions: ['png'] },
          { name: 'JPEG 文件', extensions: ['jpg', 'jpeg'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      }
    );

    if (!dialogResult || !dialogResult.path) {
      return false;
    }

    await safeTauriInvoke('write_binary_file', {
      path: dialogResult.path,
      data: base64Data
    });

    return true;
  } catch (error) {
    console.error('保存图片文件失败:', error);
    throw new Error(`保存失败: ${error}`);
  }
};

/**
 * 快速保存到下载目录（不显示对话框）
 */
export const quickSave = async (
  content: string | ArrayBuffer | Uint8Array,
  filename: string
): Promise<string> => {
  try {
    // 获取下载目录
    const downloadsDir = await safeTauriInvoke<string>('get_downloads_dir').catch(() => '');
    const fullPath = downloadsDir ? `${downloadsDir}/${filename}` : filename;

    if (typeof content === 'string') {
      await safeTauriInvoke('write_file', {
        path: fullPath,
        content
      });
    } else {
      const uint8Array = content instanceof ArrayBuffer ? new Uint8Array(content) : content;
      const binaryString = Array.from(uint8Array).map(byte => String.fromCharCode(byte)).join('');
      const base64Data = btoa(binaryString);
      
      await safeTauriInvoke('write_binary_file', {
        path: fullPath,
        data: base64Data
      });
    }

    return fullPath;
  } catch (error) {
    console.error('快速保存失败:', error);
    throw new Error(`保存失败: ${error}`);
  }
};

/**
 * 检测是否支持原生下载
 */
export const isNativeDownloadSupported = async (): Promise<boolean> => {
  try {
    await safeTauriInvoke('get_app_config');
    return true;
  } catch {
    return false;
  }
};