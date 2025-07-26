/**
 * 发布说明服务
 * 管理版本更新说明的加载和渲染
 */

import { safeTauriInvoke } from '@/utils/tauri';
import { getAppVersion } from '@/utils/version';

export interface ReleaseNote {
  version: string;
  title: string;
  content: string;
  date?: string;
  highlights?: string[];
}

export interface VersionFeatures {
  newFeatures: string[];
  improvements: string[];
  bugFixes: string[];
  technicalChanges: string[];
}

class ReleaseNotesService {
  private cache = new Map<string, ReleaseNote>();

  /**
   * 获取指定版本的发布说明
   */
  async getReleaseNotes(version: string): Promise<ReleaseNote | null> {
    try {
      // 先检查缓存
      if (this.cache.has(version)) {
        return this.cache.get(version)!;
      }

      // 优先从 GitHub 获取发布说明
      const remoteNote = await this.fetchRemoteReleaseNotes(version);
      if (remoteNote) {
        this.cache.set(version, remoteNote);
        return remoteNote;
      }

      // 如果 GitHub 获取失败，尝试读取本地发布说明文件作为备选
      const noteContent = await this.loadLocalReleaseNotes(version);
      if (noteContent) {
        const releaseNote = this.parseMarkdown(version, noteContent);
        this.cache.set(version, releaseNote);
        return releaseNote;
      }

      // 如果都失败了，为当前版本提供默认内容
      if (version === getAppVersion()) {
        const defaultNote = this.getDefaultReleaseNote(version);
        this.cache.set(version, defaultNote);
        return defaultNote;
      }

      return null;
    } catch (error) {
      console.error(`Failed to get release notes for version ${version}:`, error);
      return null;
    }
  }

  /**
   * 获取默认发布说明（当GitHub和本地都获取失败时使用）
   */
  private getDefaultReleaseNote(version: string): ReleaseNote {
    return {
      version,
      title: `InfloWave v${version}`,
      content: `# InfloWave v${version}

这是当前版本的发布说明。

## 主要功能

- 数据库连接管理
- 数据查询和可视化  
- 实时监控和分析
- 性能优化工具

---

*注意：无法从GitHub获取详细的发布说明，显示默认内容。请检查网络连接或稍后重试。*`,
      date: new Date().toLocaleDateString('zh-CN')
    };
  }

  /**
   * 读取本地发布说明文件
   */
  private async loadLocalReleaseNotes(version: string): Promise<string | null> {
    try {
      // 尝试读取 docs/release-notes/{version}.md
      const filePath = `docs/release-notes/${version}.md`;
      const content = await safeTauriInvoke<string>('read_release_notes_file', { 
        path: filePath 
      });
      return content;
    } catch (error) {
      // 版本文件不存在，尝试读取 default.md
      try {
        const defaultFilePath = `docs/release-notes/default.md`;
        const defaultContent = await safeTauriInvoke<string>('read_release_notes_file', { 
          path: defaultFilePath 
        });
        console.log(`未找到版本 ${version} 的发布说明，使用默认发布说明`);
        return defaultContent;
      } catch (defaultError) {
        console.warn('未找到版本发布说明文件或默认文件:', error);
        return null;
      }
    }
  }

  /**
   * 从 GitHub 获取发布说明
   */
  private async fetchRemoteReleaseNotes(version: string): Promise<ReleaseNote | null> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/chenqi92/inflowave/releases/tags/v${version}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'InfloWave-App/0.1.3',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      );

      if (!response.ok) {
        console.warn(`GitHub API请求失败，状态码: ${response.status}`);
        if (response.status === 403) {
          console.warn('GitHub API访问频率受限，请稍后再试');
        }
        return null;
      }

      const release = await response.json();
      
      return {
        version,
        title: release.name || `v${version}`,
        content: release.body || '暂无发布说明',
        date: release.published_at ? new Date(release.published_at).toLocaleDateString('zh-CN') : undefined
      };
    } catch (error) {
      console.error('Failed to fetch remote release notes:', error);
      return null;
    }
  }

  /**
   * 解析 Markdown 格式的发布说明
   */
  private parseMarkdown(version: string, content: string): ReleaseNote {
    const lines = content.split('\n');
    let title = `v${version}`;
    const highlights: string[] = [];

    // 提取标题
    const titleLine = lines.find(line => line.startsWith('# '));
    if (titleLine) {
      title = titleLine.replace('# ', '');
    }

    // 提取重点功能（### 或 #### 开头的内容）
    const sectionRegex = /^#{2,4}\s+(.+)/;
    for (const line of lines) {
      const match = line.match(sectionRegex);
      if (match) {
        const sectionTitle = match[1];
        if (sectionTitle.includes('🚀') || 
            sectionTitle.includes('✨') || 
            sectionTitle.includes('🎯') ||
            sectionTitle.includes('新功能') ||
            sectionTitle.includes('重点')) {
          highlights.push(sectionTitle);
        }
      }
    }

    return {
      version,
      title,
      content,
      highlights: highlights.slice(0, 3) // 最多显示3个重点
    };
  }

  /**
   * 提取版本特性摘要
   */
  async getVersionFeatures(version: string): Promise<VersionFeatures | null> {
    try {
      const releaseNote = await this.getReleaseNotes(version);
      if (!releaseNote) {
        return null;
      }

      return this.extractFeatures(releaseNote.content);
    } catch (error) {
      console.error('Failed to extract version features:', error);
      return null;
    }
  }

  /**
   * 从发布说明中提取功能分类
   */
  private extractFeatures(content: string): VersionFeatures {
    const features: VersionFeatures = {
      newFeatures: [],
      improvements: [],
      bugFixes: [],
      technicalChanges: []
    };

    const lines = content.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 识别章节
      if (trimmedLine.startsWith('##')) {
        currentSection = trimmedLine.toLowerCase();
        continue;
      }

      // 提取列表项
      if (trimmedLine.startsWith('- ')) {
        const item = trimmedLine.substring(2);
        
        if (currentSection.includes('新功能') || 
            currentSection.includes('new') ||
            currentSection.includes('feature')) {
          features.newFeatures.push(item);
        } else if (currentSection.includes('改进') || 
                   currentSection.includes('优化') ||
                   currentSection.includes('improve') ||
                   currentSection.includes('enhance')) {
          features.improvements.push(item);
        } else if (currentSection.includes('修复') || 
                   currentSection.includes('bug') ||
                   currentSection.includes('fix')) {
          features.bugFixes.push(item);
        } else if (currentSection.includes('技术') || 
                   currentSection.includes('technical') ||
                   currentSection.includes('tech')) {
          features.technicalChanges.push(item);
        }
      }
    }

    return features;
  }

  /**
   * 获取可用的发布说明版本列表
   */
  async getAvailableVersions(): Promise<string[]> {
    try {
      // 优先从GitHub API获取版本列表
      const githubVersions = await this.fetchGitHubVersions();
      if (githubVersions.length > 0) {
        return githubVersions;
      }
      
      // 如果GitHub API失败，尝试列出本地发布说明文件作为备选
      const files = await safeTauriInvoke<string[]>('list_release_notes_files');
      if (files && files.length > 0) {
        return files
          .filter(file => file.endsWith('.md'))
          .map(file => file.replace('.md', ''))
          .sort((a, b) => this.compareVersions(b, a)); // 降序排列
      }
      
      // 如果都失败了，返回当前版本
      return [getAppVersion()];
    } catch (error) {
      console.error('Failed to get available versions:', error);
      // 如果所有方法都失败，返回当前版本作为默认值
      return [getAppVersion()];
    }
  }

  /**
   * 从GitHub API获取可用版本列表
   */
  private async fetchGitHubVersions(): Promise<string[]> {
    try {
      const response = await fetch(
        'https://api.github.com/repos/chenqi92/inflowave/releases',
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'InfloWave-App/0.1.3',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      );

      if (!response.ok) {
        console.warn(`GitHub API请求失败，状态码: ${response.status}`);
        if (response.status === 403) {
          console.warn('GitHub API访问频率受限，请稍后再试');
        }
        return [];
      }

      const releases = await response.json();
      return releases
        .filter((release: any) => !release.prerelease && !release.draft)
        .map((release: any) => release.tag_name.replace(/^v/, ''))
        .sort((a: string, b: string) => this.compareVersions(b, a))
        .slice(0, 10); // 最多返回10个版本
    } catch (error) {
      console.error('Failed to fetch GitHub versions:', error);
      return [];
    }
  }

  /**
   * 比较版本号
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }
    
    return 0;
  }

  /**
   * 渲染 Markdown 为 HTML（简单版本）
   */
  renderMarkdownToHtml(markdown: string): string {
    return markdown
      // 标题
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // 粗体
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      // 斜体
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      // 代码
      .replace(/`([^`]*)`/gim, '<code>$1</code>')
      // 列表
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      // 换行
      .replace(/\n/gim, '<br>');
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// 导出单例实例
export const releaseNotesService = new ReleaseNotesService();

export default releaseNotesService;