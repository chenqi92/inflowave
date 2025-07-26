/**
 * 数据库版本检测确认对话框
 * 
 * 在保存连接时显示检测到的数据库版本信息，让用户确认
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle, AlertTriangle, Info, Clock } from 'lucide-react';
import type { VersionDetectionResult, DatabaseVersionInfo } from '@/types';
import { DatabaseVersionDetectionService } from '@/services/databaseVersionDetection';

interface VersionDetectionDialogProps {
  visible: boolean;
  detectionResult: VersionDetectionResult | null;
  connectionName: string;
  onConfirm: (versionInfo: DatabaseVersionInfo) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const VersionDetectionDialog: React.FC<VersionDetectionDialogProps> = ({
  visible,
  detectionResult,
  connectionName,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const handleConfirm = () => {
    if (detectionResult?.success && detectionResult.version_info) {
      onConfirm(detectionResult.version_info);
    }
  };

  const renderDetectionResult = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-muted-foreground">正在检测数据库版本...</span>
          </div>
        </div>
      );
    }

    if (!detectionResult) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            无法获取版本检测结果，请重试。
          </AlertDescription>
        </Alert>
      );
    }

    if (!detectionResult.success || !detectionResult.version_info) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">版本检测失败</p>
              <p className="text-sm">
                {detectionResult.error_message || '无法检测数据库版本，请检查连接信息'}
              </p>
              {detectionResult.tried_methods.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  尝试的检测方法: {detectionResult.tried_methods.join(', ')}
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    const { version_info } = detectionResult;
    const displayName = DatabaseVersionDetectionService.getDatabaseTypeDisplayName(version_info.detected_type);
    const icon = DatabaseVersionDetectionService.getDatabaseTypeIcon(version_info.detected_type);
    const color = DatabaseVersionDetectionService.getDatabaseTypeColor(version_info.detected_type);

    return (
      <div className="space-y-4">
        {/* 检测成功提示 */}
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="flex items-center gap-2">
              <span className="font-medium text-green-800">版本检测成功</span>
              <Badge variant="secondary" className="text-xs">
                {DatabaseVersionDetectionService.formatDetectionTime(detectionResult.detection_time_ms)}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>

        {/* 版本信息卡片 */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-start gap-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {icon}
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{displayName}</h3>
                <p className="text-sm text-muted-foreground">
                  版本 {version_info.version}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">数据库类型:</span>
                  <span className="ml-2 font-medium">{version_info.database_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">检测类型:</span>
                  <span className="ml-2 font-medium">{version_info.detected_type}</span>
                </div>
              </div>

              {version_info.supported_features.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">支持的功能:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {version_info.supported_features.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {version_info.api_endpoints.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">API 端点:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {version_info.api_endpoints.map((endpoint, index) => (
                      <code key={index} className="text-xs bg-muted px-2 py-1 rounded">
                        {endpoint}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 版本兼容性检查 */}
        {(() => {
          const compatibility = DatabaseVersionDetectionService.checkVersionCompatibility(version_info);
          if (!compatibility.compatible || compatibility.warnings.length > 0 || compatibility.recommendations.length > 0) {
            return (
              <Alert variant={compatibility.compatible ? "default" : "destructive"}>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    {!compatibility.compatible && (
                      <p className="font-medium text-destructive">版本兼容性警告</p>
                    )}
                    
                    {compatibility.warnings.map((warning, index) => (
                      <p key={index} className="text-sm text-orange-600">
                        ⚠️ {warning}
                      </p>
                    ))}
                    
                    {compatibility.recommendations.map((recommendation, index) => (
                      <p key={index} className="text-sm text-blue-600">
                        💡 {recommendation}
                      </p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            );
          }
          return null;
        })()}

        {/* 检测详情 */}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            检测详情
          </summary>
          <div className="mt-2 p-3 bg-muted rounded text-xs space-y-1">
            <div>检测时间: {detectionResult.detection_time_ms}ms</div>
            <div>尝试方法: {detectionResult.tried_methods.join(', ')}</div>
            <div>主版本: {version_info.major_version}</div>
            <div>次版本: {version_info.minor_version}</div>
            <div>补丁版本: {version_info.patch_version}</div>
          </div>
        </details>
      </div>
    );
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            数据库版本检测结果
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            连接名称: <span className="font-medium text-foreground">{connectionName}</span>
          </div>

          {renderDetectionResult()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={loading || !detectionResult?.success || !detectionResult.version_info}
          >
            {loading ? '检测中...' : '确认并保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
