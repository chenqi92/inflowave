# Cloudflare R2 配置指南

本文档说明如何配置 GitHub Secrets 以启用 Cloudflare R2 自动上传功能。

## 为什么使用 Cloudflare R2？

由于 GitHub 在某些地区访问受限，我们使用 Cloudflare R2 作为备用下载源，提供更好的国内访问体验。

## 配置步骤

### 1. 创建 Cloudflare R2 存储桶

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **R2** 服务
3. 点击 **Create bucket** 创建新存储桶
4. 记录存储桶名称（例如：`inflowave-releases`）

### 2. 获取 R2 API 凭证

1. 在 R2 页面，点击 **Manage R2 API Tokens**
2. 点击 **Create API Token**
3. 配置权限：
   - **Token name**: `GitHub Actions Upload`
   - **Permissions**: `Object Read & Write`
   - **Bucket**: 选择你创建的存储桶
4. 点击 **Create API Token**
5. 记录以下信息：
   - **Access Key ID**（访问密钥 ID）
   - **Secret Access Key**（密钥）
   - **Endpoint URL**（端点 URL，格式类似：`https://<account-id>.r2.cloudflarestorage.com`）

### 3. 配置公共访问（可选）

如果需要公开访问文件：

1. 在存储桶设置中，找到 **Public Access** 选项
2. 启用 **Allow Access**
3. 可以配置自定义域名，或使用默认的 `r2.dev` 域名
4. 记录公共访问 URL（例如：`https://your-bucket.r2.dev`）

### 4. 配置 GitHub Secrets

在 GitHub 仓库中配置以下 Secrets：

1. 进入仓库的 **Settings** > **Secrets and variables** > **Actions**
2. 点击 **New repository secret** 添加以下密钥：

#### 必需的 Secrets

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `R2_ACCESS_KEY_ID` | R2 访问密钥 ID | `abc123def456...` |
| `R2_SECRET_ACCESS_KEY` | R2 密钥 | `xyz789uvw012...` |
| `R2_ENDPOINT` | R2 S3 API 端点 | `https://1234567890abcdef.r2.cloudflarestorage.com` |
| `R2_BUCKET_NAME` | R2 存储桶名称 | `inflowave-releases` |

#### 可选的 Secrets

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `R2_PUBLIC_URL` | R2 公共访问 URL（如果配置了公共访问） | `https://releases.yourdomain.com` 或 `https://your-bucket.r2.dev` |

### 5. 验证配置

配置完成后，下次触发 release 时，workflow 会自动：

1. 构建 macOS ARM64 和 Windows x64 安装包
2. 上传到 GitHub Release
3. 同时上传到 Cloudflare R2
4. 在 Release 说明中添加 R2 下载链接

## 上传的文件

当前配置会上传以下文件到 R2：

- **macOS ARM64**: `*aarch64*.dmg` - 适用于 Apple Silicon (M1/M2/M3) Mac
- **Windows x64**: `*x64*.msi` - 适用于 64 位 Windows 系统

文件在 R2 中的路径格式：`releases/v{version}/{filename}`

## 自定义域名配置（推荐）

为了更好的访问体验，建议配置自定义域名：

1. 在 Cloudflare R2 存储桶设置中，点击 **Custom Domains**
2. 添加你的域名（例如：`releases.yourdomain.com`）
3. 按照提示配置 DNS 记录
4. 将自定义域名配置到 `R2_PUBLIC_URL` Secret 中

## 故障排查

### 上传失败

如果上传失败，检查：

1. R2 API Token 权限是否正确（需要 Object Read & Write）
2. 存储桶名称是否正确
3. Endpoint URL 格式是否正确（必须包含 `https://`）

### 文件未找到

如果提示文件未找到：

1. 检查构建是否成功完成
2. 确认文件名匹配模式是否正确
3. 查看 GitHub Actions 日志中的文件列表

### 下载链接无法访问

如果生成的下载链接无法访问：

1. 确认存储桶已启用公共访问
2. 检查 `R2_PUBLIC_URL` 配置是否正确
3. 验证文件是否成功上传到 R2

## 成本说明

Cloudflare R2 的定价：

- **存储**: $0.015/GB/月
- **Class A 操作**（写入）: $4.50/百万次请求
- **Class B 操作**（读取）: $0.36/百万次请求
- **出站流量**: 免费（这是 R2 的主要优势）

对于开源项目，成本通常非常低。

## 安全建议

1. **定期轮换 API Token**: 建议每 3-6 个月更换一次 API Token
2. **最小权限原则**: 只授予必要的权限（Object Read & Write）
3. **限制 Token 范围**: 将 Token 限制在特定存储桶
4. **监控使用情况**: 定期检查 R2 使用情况和访问日志

## 参考资料

- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [R2 S3 API 兼容性](https://developers.cloudflare.com/r2/api/s3/)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

