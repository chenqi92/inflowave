# 将 MSI 转换为 MSIX 用于微软商店

## 方法 1: 使用 MSIX Packaging Tool (官方工具)

1. 从微软商店下载 "MSIX Packaging Tool"
2. 选择 "Application package"
3. 选择你的 MSI 文件作为源
4. 按照向导完成转换

**下载链接**: https://www.microsoft.com/store/productId/9N5LW3JBCXKF

## 方法 2: 使用命令行工具

### 安装 Windows SDK
```bash
# 确保安装了 Windows 10/11 SDK
# 包含 MakeAppx.exe 和 SignTool.exe
```

### 转换步骤

1. **提取 MSI 内容**
```bash
msiexec /a InfloWave_0.9.2_x64_zh-CN.msi /qn TARGETDIR="C:\ExtractedApp"
```

2. **创建 AppxManifest.xml**
在提取的目录中创建 `AppxManifest.xml` 文件（需要根据你的应用信息修改）：

```xml
<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities">
  <Identity Name="YourPublisherName.InfloWave"
            Publisher="CN=YourPublisher"
            Version="0.9.2.0" />
  <Properties>
    <DisplayName>InfloWave</DisplayName>
    <PublisherDisplayName>Kkape Team</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.22621.0" />
  </Dependencies>
  <Resources>
    <Resource Language="zh-CN" />
  </Resources>
  <Applications>
    <Application Id="InfloWave" Executable="InfloWave.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements DisplayName="InfloWave"
                          Description="Modern time-series database management tool"
                          BackgroundColor="transparent"
                          Square150x150Logo="Assets\Square150x150Logo.png"
                          Square44x44Logo="Assets\Square44x44Logo.png">
      </uap:VisualElements>
    </Application>
  </Applications>
  <Capabilities>
    <rescap:Capability Name="runFullTrust" />
  </Capabilities>
</Package>
```

3. **打包为 MSIX**
```bash
"C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\MakeAppx.exe" pack /d "C:\ExtractedApp" /p "InfloWave.msix"
```

4. **签名（必需）**
```bash
"C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\SignTool.exe" sign /fd SHA256 /a /f YourCertificate.pfx /p YourPassword "InfloWave.msix"
```

## 方法 3: 使用 GitHub Action 自动转换

可以在 CI/CD 流程中添加自动转换步骤，但需要配置证书和 manifest 模板。

## 注意事项

1. **证书要求**: MSIX 必须签名才能安装和提交商店
2. **Manifest 配置**: 需要准确配置应用信息、图标资源等
3. **测试**: 转换后务必在干净的 Windows 系统上测试安装
4. **权限**: MSIX 需要 `runFullTrust` 能力（因为 Tauri 应用是完全信任的桌面应用）

## 推荐方案

如果只是为了提交微软商店，建议：
- 使用**方案 1（外部链接）**最简单
- 如果必须使用 MSIX，推荐使用**官方的 MSIX Packaging Tool**
