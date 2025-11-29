import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchInput } from '@/components/ui/search-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Cpu } from 'lucide-react';
import { useDatabaseExplorerTranslation } from '@/hooks/useTranslation';

interface DeviceListDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  storageGroup: string;
  devices: string[];
}

/**
 * IoTDB 设备列表对话框
 *
 * 显示指定存储组下的所有设备列表
 */
export const DeviceListDialog: React.FC<DeviceListDialogProps> = ({
  open,
  onClose,
  connectionId,
  storageGroup,
  devices,
}) => {
  const { t: tExplorer } = useDatabaseExplorerTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  // 过滤设备列表
  const filteredDevices = useMemo(() => {
    if (!searchTerm.trim()) {
      return devices;
    }
    const lowerSearch = searchTerm.toLowerCase();
    return devices.filter(device => device.toLowerCase().includes(lowerSearch));
  }, [devices, searchTerm]);

  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-green-500" />
            {tExplorer('deviceList.title')}
          </DialogTitle>
          <DialogDescription>
            {tExplorer('deviceList.description', { storageGroup, count: devices.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索框 */}
          <SearchInput
            placeholder={tExplorer('deviceList.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
          />

          {/* 设备列表 */}
          <ScrollArea className="h-[400px] rounded-md border">
            <div className="p-4 space-y-2">
              {filteredDevices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? tExplorer('deviceList.noMatch') : tExplorer('deviceList.noDevices')}
                </div>
              ) : (
                filteredDevices.map((device, index) => (
                  <div
                    key={device}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Cpu className="w-4 h-4 text-primary" />
                      <span className="font-medium font-mono text-sm">{device}</span>
                    </div>
                    <Badge variant="secondary">{index + 1}</Badge>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* 统计信息 */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {tExplorer('deviceList.showing', { shown: filteredDevices.length, total: devices.length })}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceListDialog;
