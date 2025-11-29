import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Activity, Database, Settings, Tag } from 'lucide-react';
import { useMenuTranslation } from '@/hooks/useTranslation';

interface TimeseriesInfo {
  name: string;
  alias?: string | null;
  storage_group: string;
  data_type: string;
  encoding: string;
  compression: string;
  tags?: Record<string, any> | null;
  attributes?: Record<string, any> | null;
}

interface TimeseriesInfoDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  timeseriesPath: string;
  info: TimeseriesInfo | null;
}

export default function TimeseriesInfoDialog({
  open,
  onClose,
  connectionId,
  timeseriesPath,
  info,
}: TimeseriesInfoDialogProps) {
  const { t } = useMenuTranslation();

  // 安全地获取时间序列路径
  const getTimeseriesPath = (): string => {
    if (!info) return timeseriesPath || '';
    if (typeof info.name === 'string') return info.name;
    return String(info.name || timeseriesPath || '');
  };

  // 安全地渲染标签或属性
  const renderMetadata = (data: Record<string, any> | null | undefined): React.ReactNode => {
    if (!data || typeof data !== 'object') return <span className="text-muted-foreground text-xs">无</span>;

    const entries = Object.entries(data);
    if (entries.length === 0) return <span className="text-muted-foreground text-xs">无</span>;

    return (
      <div className="flex flex-wrap gap-1">
        {entries.map(([key, value]) => (
          <Badge key={key} variant="outline" className="text-xs">
            {key}: {String(value)}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            {t('timeseries_info.iotdb_timeseries_info')}
          </DialogTitle>
          <DialogDescription>
            {t('timeseries_info.view_timeseries_details')}
          </DialogDescription>
        </DialogHeader>

        {info ? (
          <div className="space-y-4">
            {/* 基本信息 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-500" />
                  {t('timeseries_info.basic_info')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {t('timeseries_info.timeseries_path')}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs max-w-full break-all text-right">
                    {getTimeseriesPath()}
                  </Badge>
                </div>

                {info.alias && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t('timeseries_info.alias')}</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {info.alias}
                      </Badge>
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('timeseries_info.storage_group')}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {info.storage_group || 'N/A'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 数据类型与编码 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-500" />
                  {t('timeseries_info.data_settings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('timeseries_info.data_type')}</span>
                  <Badge variant="default">
                    {info.data_type}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('timeseries_info.encoding')}</span>
                  <Badge variant="secondary">
                    {info.encoding}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('timeseries_info.compression')}</span>
                  <Badge variant="secondary">
                    {info.compression}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 标签 */}
            {info.tags && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-500" />
                    {t('timeseries_info.tags')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderMetadata(info.tags)}
                </CardContent>
              </Card>
            )}

            {/* 属性 */}
            {info.attributes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Tag className="w-4 h-4 text-purple-500" />
                    {t('timeseries_info.attributes')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderMetadata(info.attributes)}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('timeseries_info.no_timeseries_info')}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
