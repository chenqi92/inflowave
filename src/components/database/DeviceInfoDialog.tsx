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
import { Cpu, Database, Clock } from 'lucide-react';
import { useMenuTranslation } from '@/hooks/useTranslation';

interface DeviceInfo {
  device: string;
  timeseriesCount: number;
}

interface DeviceInfoDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  devicePath: string;
  info: DeviceInfo | null;
}

export default function DeviceInfoDialog({
  open,
  onClose,
  connectionId,
  devicePath,
  info,
}: DeviceInfoDialogProps) {
  const { t } = useMenuTranslation();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500" />
            {t('device_info.iotdb_device_info')}
          </DialogTitle>
          <DialogDescription>
            {t('device_info.view_device_details')}
          </DialogDescription>
        </DialogHeader>

        {info ? (
          <div className="space-y-4">
            {/* 基本信息 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-500" />
                  {t('device_info.basic_info')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('device_info.device_path')}</span>
                  <Badge variant="outline" className="font-mono text-xs max-w-[200px] truncate">
                    {info.device}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('device_info.timeseries_count')}</span>
                  <Badge variant="secondary">
                    {info.timeseriesCount}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 连接信息 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  {t('device_info.connection_info')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('device_info.connection_id')}</span>
                  <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
                    {connectionId}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Cpu className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('device_info.no_device_info')}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
