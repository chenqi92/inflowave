import React, { useEffect, useRef } from 'react';
import { Modal, message } from '@/components/ui';
// TODO: Replace these Ant Design components: Menu
import { EyeOutlined, BarChartOutlined, DeleteOutlined, InfoCircleOutlined, TableOutlined, DownloadOutlined, LineChartOutlined, PieChartOutlined, SettingOutlined, CopyOutlined, SearchOutlined } from '@/components/ui';
// TODO: Replace these icons: ExportOutlined, TagsOutlined, FunctionOutlined, AreaChartOutlined, NumberOutlined
// You may need to find alternatives or create custom icons
import { safeTauriInvoke } from '@/utils/tauri';
import type { MenuProps } from 'antd';
import type { SqlGenerationRequest } from '@/types';

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  target: {
    type: 'database' | 'measurement' | 'field' | 'tag';
    name: string;
    database?: string;
    measurement?: string;
    fieldType?: string;
  };
  onClose: () => void;
  onAction: (action: string, params?: any) => void;
  onExecuteQuery?: (query: string, description: string) => void;
  connectionId?: string;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  x,
  y,
  target,
  onClose,
  onAction,
  onExecuteQuery,
  connectionId,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // 生成智能 SQL
  const generateSmartSQL = async (sqlType: string, params: any = {}) => {
    if (!connectionId || !onExecuteQuery) return;

    const request: SqlGenerationRequest = {
      type: sqlType,
      database: target.database || target.name,
      measurement: target.measurement || (target.type === 'measurement' ? target.name : undefined),
      fields: params.fields,
      tags: params.tags,
      timeRange: params.timeRange,
      limit: params.limit || 100,
      groupBy: params.groupBy,
    };

    try {
      const result = await safeTauriInvoke('generate_smart_sql', { request }) as { sql: string; description: string };
      onExecuteQuery(result.sql, result.description);
      onClose();
      message.success('SQL 已生成并执行');
    } catch (error) {
      console.error('SQL 生成失败:', error);
      message.error('SQL 生成失败');
    }
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  // 数据库级别菜单项
  const getDatabaseMenuItems = (): MenuProps['items'] => [
    {
      key: 'show-measurements',
      icon: <TableOutlined />,
      label: '显示所有测量',
      onClick: () => generateSmartSQL('show_measurements'),
    },
    {
      key: 'db-info',
      icon: <InfoCircleOutlined />,
      label: '数据库信息',
      onClick: () => onAction('showDatabaseInfo', { database: target.name }),
    },
    {
      key: 'show-retention-policies',
      icon: <SettingOutlined />,
      label: '显示保留策略',
      onClick: () => onAction('showRetentionPolicies', { database: target.name }),
    },
    { type: 'divider' },
    {
      key: 'export-structure',
      icon: <ExportOutlined />,
      label: '导出数据库结构',
      onClick: () => onAction('exportDatabaseStructure', { database: target.name }),
    },
    {
      key: 'db-stats',
      icon: <BarChartOutlined />,
      label: '数据库统计',
      onClick: () => onAction('showDatabaseStats', { database: target.name }),
    },
    { type: 'divider' },
    {
      key: 'delete-database',
      icon: <DeleteOutlined />,
      label: '删除数据库',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确认删除数据库',
          content: `确定要删除数据库 "${target.name}" 吗？此操作不可撤销！`,
          okText: '删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => onAction('deleteDatabase', { database: target.name }),
        });
      },
    },
  ];

  // 测量级别菜单项
  const getMeasurementMenuItems = (): MenuProps['items'] => [
    {
      key: 'select-all',
      icon: <SearchOutlined />,
      label: '查询所有数据',
      onClick: () => generateSmartSQL('select_all'),
    },
    {
      key: 'data-preview',
      icon: <EyeOutlined />,
      label: '数据预览',
      children: [
        {
          key: 'recent-1h',
          label: '最近 1 小时数据',
          onClick: () => generateSmartSQL('time_series', {
            timeRange: { start: 'now() - 1h', end: 'now()' }
          }),
        },
        {
          key: 'recent-24h',
          label: '最近 24 小时数据',
          onClick: () => generateSmartSQL('time_series', {
            timeRange: { start: 'now() - 24h', end: 'now()' }
          }),
        },
        {
          key: 'recent-7d',
          label: '最近 7 天数据',
          onClick: () => generateSmartSQL('time_series', {
            timeRange: { start: 'now() - 7d', end: 'now()' }
          }),
        },
        {
          key: 'custom-range',
          label: '自定义时间范围...',
          onClick: () => onAction('customTimeRange', {
            database: target.database,
            measurement: target.name
          }),
        },
      ],
    },
    {
      key: 'count-records',
      icon: <NumberOutlined />,
      label: '统计记录数',
      onClick: () => generateSmartSQL('count_records'),
    },
    {
      key: 'data-structure',
      icon: <TableOutlined />,
      label: '数据结构',
      children: [
        {
          key: 'show-field-keys',
          label: '显示字段键',
          onClick: () => generateSmartSQL('show_field_keys'),
        },
        {
          key: 'show-tag-keys',
          label: '显示标签键',
          onClick: () => generateSmartSQL('show_tag_keys'),
        },
        {
          key: 'describe-measurement',
          label: '描述测量结构',
          onClick: () => generateSmartSQL('describe_measurement'),
        },
      ],
    },
    {
      key: 'data-stats',
      icon: <FunctionOutlined />,
      label: '数据统计',
      children: [
        {
          key: 'record-count',
          label: '记录总数',
          onClick: () => onAction('getRecordCount', {
            database: target.database,
            measurement: target.name
          }),
        },
        {
          key: 'time-range',
          label: '时间范围',
          onClick: () => onAction('getTimeRange', {
            database: target.database,
            measurement: target.name
          }),
        },
        {
          key: 'field-stats',
          label: '字段统计',
          onClick: () => onAction('getFieldStats', {
            database: target.database,
            measurement: target.name
          }),
        },
        {
          key: 'tag-distribution',
          label: '标签分布',
          onClick: () => onAction('getTagDistribution', {
            database: target.database,
            measurement: target.name
          }),
        },
      ],
    },
    {
      key: 'quick-charts',
      icon: <LineChartOutlined />,
      label: '快速图表',
      children: [
        {
          key: 'time-series',
          icon: <LineChartOutlined />,
          label: '时序趋势图',
          onClick: () => onAction('createChart', {
            database: target.database,
            measurement: target.name,
            chartType: 'timeSeries'
          }),
        },
        {
          key: 'field-distribution',
          icon: <BarChartOutlined />,
          label: '字段分布图',
          onClick: () => onAction('createChart', {
            database: target.database,
            measurement: target.name,
            chartType: 'fieldDistribution'
          }),
        },
        {
          key: 'tag-stats',
          icon: <PieChartOutlined />,
          label: '标签统计图',
          onClick: () => onAction('createChart', {
            database: target.database,
            measurement: target.name,
            chartType: 'tagStats'
          }),
        },
        {
          key: 'custom-chart',
          icon: <AreaChartOutlined />,
          label: '自定义图表...',
          onClick: () => onAction('customChart', {
            database: target.database,
            measurement: target.name
          }),
        },
      ],
    },
    {
      key: 'data-export',
      icon: <DownloadOutlined />,
      label: '数据导出',
      children: [
        {
          key: 'export-csv',
          label: '导出为 CSV',
          onClick: () => onAction('exportData', {
            database: target.database,
            measurement: target.name,
            format: 'csv'
          }),
        },
        {
          key: 'export-json',
          label: '导出为 JSON',
          onClick: () => onAction('exportData', {
            database: target.database,
            measurement: target.name,
            format: 'json'
          }),
        },
        {
          key: 'export-excel',
          label: '导出为 Excel',
          onClick: () => onAction('exportData', {
            database: target.database,
            measurement: target.name,
            format: 'excel'
          }),
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'copy-name',
      icon: <CopyOutlined />,
      label: '复制测量名称',
      onClick: () => {
        navigator.clipboard.writeText(target.name);
        message.success('测量名称已复制到剪贴板');
      },
    },
    {
      key: 'delete-measurement',
      icon: <DeleteOutlined />,
      label: '删除测量',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确认删除测量',
          content: `确定要删除测量 "${target.name}" 吗？此操作将删除所有相关数据！`,
          okText: '删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => onAction('deleteMeasurement', {
            database: target.database,
            measurement: target.name
          }),
        });
      },
    },
  ];

  // 字段级别菜单项
  const getFieldMenuItems = (): MenuProps['items'] => [
    {
      key: 'field-preview',
      icon: <EyeOutlined />,
      label: '字段数据预览',
      children: [
        {
          key: 'latest-values',
          label: '最新 100 个值',
          onClick: () => onAction('previewFieldData', {
            database: target.database,
            measurement: target.measurement,
            field: target.name,
            limit: 100
          }),
        },
        {
          key: 'non-null-values',
          label: '非空值预览',
          onClick: () => onAction('previewFieldData', {
            database: target.database,
            measurement: target.measurement,
            field: target.name,
            nonNull: true
          }),
        },
        {
          key: 'unique-values',
          label: '唯一值预览',
          onClick: () => onAction('previewFieldData', {
            database: target.database,
            measurement: target.measurement,
            field: target.name,
            unique: true
          }),
        },
      ],
    },
    {
      key: 'field-stats',
      icon: <FunctionOutlined />,
      label: '字段统计',
      children: [
        {
          key: 'basic-stats',
          label: '基础统计 (MIN, MAX, MEAN)',
          onClick: () => onAction('getFieldBasicStats', {
            database: target.database,
            measurement: target.measurement,
            field: target.name
          }),
        },
        {
          key: 'percentile-stats',
          label: '分位数统计',
          onClick: () => onAction('getFieldPercentileStats', {
            database: target.database,
            measurement: target.measurement,
            field: target.name
          }),
        },
        {
          key: 'distribution',
          label: '数据分布',
          onClick: () => onAction('getFieldDistribution', {
            database: target.database,
            measurement: target.measurement,
            field: target.name
          }),
        },
      ],
    },
    {
      key: 'field-charts',
      icon: <LineChartOutlined />,
      label: '字段图表',
      children: [
        {
          key: 'time-series-chart',
          label: '时序折线图',
          onClick: () => onAction('createFieldChart', {
            database: target.database,
            measurement: target.measurement,
            field: target.name,
            chartType: 'timeSeries'
          }),
        },
        {
          key: 'histogram',
          label: '分布直方图',
          onClick: () => onAction('createFieldChart', {
            database: target.database,
            measurement: target.measurement,
            field: target.name,
            chartType: 'histogram'
          }),
        },
        {
          key: 'boxplot',
          label: '箱线图',
          onClick: () => onAction('createFieldChart', {
            database: target.database,
            measurement: target.measurement,
            field: target.name,
            chartType: 'boxplot'
          }),
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'copy-field-name',
      icon: <CopyOutlined />,
      label: '复制字段名称',
      onClick: () => {
        navigator.clipboard.writeText(target.name);
        message.success('字段名称已复制到剪贴板');
      },
    },
  ];

  // 标签级别菜单项
  const getTagMenuItems = (): MenuProps['items'] => [
    {
      key: 'tag-values',
      icon: <TagsOutlined />,
      label: '标签值列表',
      onClick: () => onAction('showTagValues', {
        database: target.database,
        measurement: target.measurement,
        tagKey: target.name
      }),
    },
    {
      key: 'tag-query',
      icon: <EyeOutlined />,
      label: '按标签查询',
      children: [
        {
          key: 'select-tag-value',
          label: '选择标签值查询',
          onClick: () => onAction('queryByTagValue', {
            database: target.database,
            measurement: target.measurement,
            tagKey: target.name
          }),
        },
        {
          key: 'multi-tag-query',
          label: '多标签组合查询',
          onClick: () => onAction('multiTagQuery', {
            database: target.database,
            measurement: target.measurement,
            tagKey: target.name
          }),
        },
      ],
    },
    {
      key: 'tag-stats',
      icon: <BarChartOutlined />,
      label: '标签统计',
      children: [
        {
          key: 'tag-distribution',
          label: '标签值分布图',
          onClick: () => onAction('createTagChart', {
            database: target.database,
            measurement: target.measurement,
            tagKey: target.name,
            chartType: 'distribution'
          }),
        },
        {
          key: 'tag-usage',
          label: '标签使用频率',
          onClick: () => onAction('getTagUsageStats', {
            database: target.database,
            measurement: target.measurement,
            tagKey: target.name
          }),
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'copy-tag-name',
      icon: <CopyOutlined />,
      label: '复制标签名称',
      onClick: () => {
        navigator.clipboard.writeText(target.name);
        message.success('标签名称已复制到剪贴板');
      },
    },
  ];

  // 根据目标类型获取菜单项
  const getMenuItems = (): MenuProps['items'] => {
    switch (target.type) {
      case 'database':
        return getDatabaseMenuItems();
      case 'measurement':
        return getMeasurementMenuItems();
      case 'field':
        return getFieldMenuItems();
      case 'tag':
        return getTagMenuItems();
      default:
        return [];
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg"
      style={{
        left: x,
        top: y,
        minWidth: 200,
        maxWidth: 300,
      }}
    >
      <Menu
        mode="vertical"
        items={getMenuItems()}
        className="border-none"
        style={{ boxShadow: 'none' }}
      />
    </div>
  );
};

export default ContextMenu;
