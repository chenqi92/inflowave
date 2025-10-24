/**
 * Dialect Selector Component
 * 
 * Displays connection information and allows switching between query language dialects
 * Supports: SQL (InfluxDB 3/FlightSQL, PostgreSQL), InfluxQL (InfluxDB 1.x), Flux (InfluxDB 2.x), IoTDB SQL
 */

import React, { useMemo } from 'react';
import { Database, Code2 } from 'lucide-react';
import { Badge } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import type { DatabaseType, ConnectionConfig } from '@/types';
import { editorEvents } from './eventBus';

export type QueryDialect = 'sql' | 'influxql' | 'flux' | 'iotdb-sql' | 'promql';

export interface DialectInfo {
  id: QueryDialect;
  label: string;
  description: string;
  icon?: React.ReactNode;
  color: string;
  bgColor: string;
}

/**
 * Dialect definitions
 */
const DIALECTS: Record<QueryDialect, DialectInfo> = {
  sql: {
    id: 'sql',
    label: 'SQL',
    description: 'Standard SQL (InfluxDB 3.x, PostgreSQL)',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  influxql: {
    id: 'influxql',
    label: 'InfluxQL',
    description: 'InfluxDB 1.x Query Language',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
  },
  flux: {
    id: 'flux',
    label: 'Flux',
    description: 'InfluxDB 2.x Functional Query Language',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950',
  },
  'iotdb-sql': {
    id: 'iotdb-sql',
    label: 'IoTDB SQL',
    description: 'IoTDB SQL (Tree/Table Model)',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950',
  },
  promql: {
    id: 'promql',
    label: 'PromQL',
    description: 'Prometheus Query Language',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
  },
};

/**
 * Get available dialects for a database type and version
 */
function getAvailableDialects(
  databaseType: DatabaseType,
  version?: string
): QueryDialect[] {
  switch (databaseType) {
    case 'influxdb':
      if (version?.startsWith('1.')) {
        return ['influxql'];
      } else if (version?.startsWith('2.')) {
        return ['flux', 'influxql'];
      } else if (version?.startsWith('3.')) {
        return ['sql'];
      }
      // Default to all InfluxDB dialects if version is unknown
      return ['sql', 'flux', 'influxql'];
    
    case 'iotdb':
      return ['iotdb-sql'];
    
    case 'prometheus':
      return ['promql'];
    
    case 'elasticsearch':
      return ['sql'];
    
    default:
      return ['sql'];
  }
}

/**
 * Get default dialect for a database type and version
 */
function getDefaultDialect(
  databaseType: DatabaseType,
  version?: string
): QueryDialect {
  const available = getAvailableDialects(databaseType, version);
  return available[0] || 'sql';
}

/**
 * Get database type display name
 */
function getDatabaseTypeLabel(databaseType: DatabaseType): string {
  const labels: Record<DatabaseType, string> = {
    influxdb: 'InfluxDB',
    iotdb: 'IoTDB',
    prometheus: 'Prometheus',
    elasticsearch: 'Elasticsearch',
  };
  return labels[databaseType] || databaseType;
}

export interface DialectSelectorProps {
  /** Current connection */
  connection?: ConnectionConfig;
  /** Current selected dialect */
  dialect?: QueryDialect;
  /** Callback when dialect changes */
  onDialectChange?: (dialect: QueryDialect) => void;
  /** Additional CSS class */
  className?: string;
  /** Show connection info */
  showConnectionInfo?: boolean;
  /** Compact mode */
  compact?: boolean;
}

/**
 * Dialect Selector Component
 */
export const DialectSelector: React.FC<DialectSelectorProps> = ({
  connection,
  dialect,
  onDialectChange,
  className,
  showConnectionInfo = true,
  compact = false,
}) => {
  // Get available dialects for current connection
  const availableDialects = useMemo(() => {
    if (!connection) return ['sql'] as QueryDialect[];
    return getAvailableDialects(
      connection.dbType,
      connection.version || connection.detectedVersion
    );
  }, [connection]);

  // Get current dialect or default
  const currentDialect = useMemo(() => {
    if (dialect && availableDialects.includes(dialect)) {
      return dialect;
    }
    if (!connection) return 'sql';
    return getDefaultDialect(
      connection.dbType,
      connection.version || connection.detectedVersion
    );
  }, [dialect, connection, availableDialects]);

  const currentDialectInfo = DIALECTS[currentDialect];

  // Handle dialect change
  const handleDialectChange = (newDialect: string) => {
    const dialectValue = newDialect as QueryDialect;
    if (dialectValue !== currentDialect) {
      editorEvents.dialectChange(currentDialect, dialectValue);
      onDialectChange?.(dialectValue);
    }
  };

  // If no connection, show placeholder
  if (!connection) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Database className="w-4 h-4" />
        <span className="text-sm">未选择连接</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Connection Info - Only show in non-compact mode */}
      {showConnectionInfo && !compact && connection && (
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{connection.name}</span>
            <span className="text-xs text-muted-foreground">
              {getDatabaseTypeLabel(connection.dbType)}
              {connection.version && ` ${connection.version}`}
            </span>
          </div>
        </div>
      )}

      {/* Dialect Selector */}
      {availableDialects.length > 1 ? (
        <Select value={currentDialect} onValueChange={handleDialectChange}>
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue>
              <div className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5" />
                <span className="text-sm">{currentDialectInfo.label}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableDialects.map((dialectId) => {
              const dialectInfo = DIALECTS[dialectId];
              return (
                <SelectItem key={dialectId} value={dialectId}>
                  <div className="flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{dialectInfo.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {dialectInfo.description}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      ) : (
        <Badge
          variant="outline"
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1',
            currentDialectInfo.bgColor,
            currentDialectInfo.color
          )}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span className="text-sm font-medium">{currentDialectInfo.label}</span>
        </Badge>
      )}
    </div>
  );
};

export default DialectSelector;

