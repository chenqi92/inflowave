import { safeTauriInvoke } from './tauri';
import logger from '@/utils/logger';

/**
 * 文件操作工具类
 * 提供文件读写、删除等功能的安全封装
 *
 * 环境感知：
 * - 开发环境：使用项目根目录
 * - 生产环境：使用应用数据目录
 */
export class FileOperations {
  /**
   * 写入文件（环境感知）
   * @param path 文件路径（相对路径会根据环境自动解析）
   * @param content 文件内容
   */
  static async writeFile(path: string, content: string): Promise<void> {
    try {
      await safeTauriInvoke('write_file_env', {
        path,
        content,
      });
    } catch (error) {
      logger.error(`写入文件失败 ${path}:`, error);
      throw error;
    }
  }

  /**
   * 追加内容到文件（环境感知）
   * @param path 文件路径（相对路径会根据环境自动解析）
   * @param content 要追加的内容
   */
  static async appendToFile(path: string, content: string): Promise<void> {
    try {
      // 由于后端没有append命令，我们先检查文件是否存在，然后读取现有内容
      let existingContent = '';

      // 先检查文件是否存在，避免不必要的错误日志
      const fileExists = await this.fileExists(path);
      if (fileExists) {
        try {
          existingContent = await this.readFile(path);
        } catch (error) {
          logger.warn(`读取现有文件内容失败 ${path}:`, error);
          // 如果读取失败，继续使用空字符串
        }
      } else {
        logger.info('文件不存在，将创建新文件:', path);
      }

      // 追加新内容
      const newContent = existingContent + content;

      // 写入完整内容（使用环境感知命令）
      await safeTauriInvoke('write_file_env', {
        path,
        content: newContent,
      });
    } catch (error) {
      logger.error(`追加文件失败 ${path}:`, error);
      throw error;
    }
  }

  /**
   * 读取文件（环境感知）
   * @param path 文件路径（相对路径会根据环境自动解析）
   * @returns 文件内容
   */
  static async readFile(path: string): Promise<string> {
    try {
      const result = await safeTauriInvoke<string>('read_file_env', { path });
      return result || '';
    } catch (error) {
      logger.error(`读取文件失败 ${path}:`, error);
      throw error;
    }
  }

  /**
   * 删除文件（环境感知）
   * @param path 文件路径（相对路径会根据环境自动解析）
   */
  static async deleteFile(path: string): Promise<void> {
    try {
      await safeTauriInvoke('delete_file_env', { path });
    } catch (error) {
      logger.error(`删除文件失败 ${path}:`, error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在（环境感知）
   * @param path 文件路径（相对路径会根据环境自动解析）
   * @returns 是否存在
   */
  static async fileExists(path: string): Promise<boolean> {
    try {
      const result = await safeTauriInvoke<boolean>('file_exists_env', { path });
      return result || false;
    } catch (error) {
      logger.error(`检查文件存在性失败 ${path}:`, error);
      return false;
    }
  }

  /**
   * 创建目录（环境感知）
   * @param path 目录路径（相对路径会根据环境自动解析）
   */
  static async createDir(path: string): Promise<void> {
    try {
      await safeTauriInvoke('create_dir_env', { path });
    } catch (error) {
      logger.error(`创建目录失败 ${path}:`, error);
      throw error;
    }
  }

  /**
   * 获取文件信息（环境感知，安全版本）
   * @param path 文件路径（相对路径会根据环境自动解析）
   * @returns 文件信息
   *
   * 注意：
   * 1. 此方法不使用 logger 来避免循环依赖（logger 会调用此方法检查日志文件大小）
   * 2. 使用 get_file_info_env 命令，文件不存在时返回默认值而非错误
   * 3. 这样可以保证日志系统的稳定性，避免应用启动时因日志文件不存在而报错
   */
  static async getFileInfo(path: string): Promise<{
    size: number;
    modified: string;
    created: string;
    isFile: boolean;
    isDir: boolean;
  }> {
    try {
      // 使用环境感知的安全版本，文件不存在时返回默认值而非错误
      const result = await safeTauriInvoke<{
        size: number;
        modified: string;
        created: string;
        is_file: boolean;
        is_dir: boolean;
      }>('get_file_info_env', { path });

      // 转换 snake_case 到 camelCase
      return {
        size: result?.size || 0,
        modified: result?.modified || new Date().toISOString(),
        created: result?.created || new Date().toISOString(),
        isFile: result?.is_file || false,
        isDir: result?.is_dir || false,
      };
    } catch (error) {
      // 使用 console.warn 而不是 console.error，因为文件不存在是正常情况
      // 不要使用 logger 来避免循环依赖
      console.warn(`获取文件信息失败 ${path}:`, error);
      // 返回默认值而不是抛出错误，保证日志系统的稳定性
      return {
        size: 0,
        modified: new Date().toISOString(),
        created: new Date().toISOString(),
        isFile: false,
        isDir: false,
      };
    }
  }
}
