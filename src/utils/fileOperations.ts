import { safeTauriInvoke } from './tauri';

/**
 * 文件操作工具类
 * 提供文件读写、删除等功能的安全封装
 */
export class FileOperations {
  /**
   * 写入文件
   * @param path 文件路径
   * @param content 文件内容
   */
  static async writeFile(path: string, content: string): Promise<void> {
    try {
      await safeTauriInvoke('write_file', {
        path,
        content,
      });
    } catch (error) {
      console.error(`写入文件失败 ${path}:`, error);
      throw error;
    }
  }

  /**
   * 追加内容到文件
   * @param path 文件路径
   * @param content 要追加的内容
   */
  static async appendToFile(path: string, content: string): Promise<void> {
    try {
      // 由于后端没有append命令，我们先读取现有内容，然后追加
      let existingContent = '';
      try {
        existingContent = await this.readFile(path);
      } catch (error) {
        // 如果文件不存在，existingContent保持为空字符串
        console.log('文件不存在，将创建新文件:', path);
      }

      // 追加新内容
      const newContent = existingContent + content;

      // 写入完整内容
      await safeTauriInvoke('write_file', {
        path,
        content: newContent,
      });
    } catch (error) {
      console.error(`追加文件失败 ${path}:`, error);
      throw error;
    }
  }

  /**
   * 读取文件
   * @param path 文件路径
   * @returns 文件内容
   */
  static async readFile(path: string): Promise<string> {
    try {
      const result = await safeTauriInvoke<string>('read_file', { path });
      return result || '';
    } catch (error) {
      console.error(`读取文件失败 ${path}:`, error);
      throw error;
    }
  }

  /**
   * 删除文件
   * @param path 文件路径
   */
  static async deleteFile(path: string): Promise<void> {
    try {
      await safeTauriInvoke('delete_file', { path });
    } catch (error) {
      console.error(`删除文件失败 ${path}:`, error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   * @param path 文件路径
   * @returns 是否存在
   */
  static async fileExists(path: string): Promise<boolean> {
    try {
      const result = await safeTauriInvoke<boolean>('file_exists', { path });
      return result || false;
    } catch (error) {
      console.error(`检查文件存在性失败 ${path}:`, error);
      return false;
    }
  }

  /**
   * 创建目录
   * @param path 目录路径
   */
  static async createDir(path: string): Promise<void> {
    try {
      await safeTauriInvoke('create_dir', { path });
    } catch (error) {
      console.error(`创建目录失败 ${path}:`, error);
      throw error;
    }
  }

  /**
   * 获取文件信息
   * @param path 文件路径
   * @returns 文件信息
   */
  static async getFileInfo(path: string): Promise<{
    size: number;
    modified: string;
    created: string;
    isFile: boolean;
    isDir: boolean;
  }> {


    try {
      const result = await safeTauriInvoke<{
        size: number;
        modified: string;
        created: string;
        isFile: boolean;
        isDir: boolean;
      }>('get_file_info', { path });
      return (
        result || {
          size: 0,
          modified: new Date().toISOString(),
          created: new Date().toISOString(),
          isFile: true,
          isDir: false,
        }
      );
    } catch (error) {
      console.error(`获取文件信息失败 ${path}:`, error);
      throw error;
    }
  }
}
