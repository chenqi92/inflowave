import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QueryResult } from '@/types';

export type ChartType =
  | 'line'
  | 'bar'
  | 'pie'
  | 'scatter'
  | 'area'
  | 'gauge'
  | 'heatmap';

export interface ChartDataSeries {
  name: string;
  data: Array<{ x: any; y: any; [key: string]: any }>;
  type?: ChartType;
  color?: string;
  yAxisIndex?: number;
}

export interface ChartAxis {
  name?: string;
  type?: 'value' | 'category' | 'time' | 'log';
  position?: 'left' | 'right' | 'top' | 'bottom';
  min?: number | string;
  max?: number | string;
  interval?: number | string;
  formatter?: string;
  scale?: boolean;
}

export interface ChartLegend {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  orient: 'horizontal' | 'vertical';
  align: 'auto' | 'left' | 'center' | 'right';
}

export interface ChartTooltip {
  show: boolean;
  trigger: 'item' | 'axis' | 'none';
  axisPointer?: {
    type: 'line' | 'shadow' | 'cross';
    animation: boolean;
  };
  formatter?: string;
}

export interface ChartGrid {
  show: boolean;
  left: string | number;
  top: string | number;
  right: string | number;
  bottom: string | number;
  containLabel: boolean;
}

export interface ChartAnimation {
  enabled: boolean;
  duration: number;
  easing:
    | 'linear'
    | 'quadraticIn'
    | 'quadraticOut'
    | 'quadraticInOut'
    | 'cubicIn'
    | 'cubicOut'
    | 'cubicInOut';
  delay: number;
  threshold: number;
}

export interface ChartConfiguration {
  id: string;
  title: string;
  type: ChartType;
  series: ChartDataSeries[];
  xAxis: ChartAxis;
  yAxis: ChartAxis[];
  legend: ChartLegend;
  tooltip: ChartTooltip;
  grid: ChartGrid;
  animation: ChartAnimation;
  theme: string;
  backgroundColor?: string;
  textStyle?: {
    color?: string;
    fontSize?: number;
    fontFamily?: string;
  };
  // 时间序列特有配置
  timeRange?: {
    start: string | Date;
    end: string | Date;
    interval: string;
  };
  // 实时更新配置
  realTime?: {
    enabled: boolean;
    interval: number; // 秒
    maxDataPoints: number;
  };
  // 数据筛选配置
  filters?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
    value: any;
  }>;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  charts: ChartConfiguration[];
  layout: Array<{
    chartId: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  refreshInterval?: number; // 秒，0 表示不自动刷新
  createdAt: Date;
  updatedAt: Date;
}

interface VisualizationState {
  // 图表配置
  charts: ChartConfiguration[];
  activeChartId: string | null;

  // 仪表板
  dashboards: Dashboard[];
  activeDashboardId: string | null;

  // 数据源
  dataSources: Record<string, QueryResult>; // chartId -> QueryResult

  // 加载状态
  loadingCharts: Record<string, boolean>;

  // 实时更新
  realTimeEnabled: boolean;
  realTimeCharts: Set<string>;

  // 主题和样式
  currentTheme: string;
  availableThemes: string[];

  // 错误状态
  errors: Record<string, string>;

  // 图表管理
  createChart: (config: Omit<ChartConfiguration, 'id'>) => string;
  updateChart: (id: string, updates: Partial<ChartConfiguration>) => void;
  deleteChart: (id: string) => void;
  duplicateChart: (id: string) => string;
  getChart: (id: string) => ChartConfiguration | undefined;
  setActiveChart: (id: string | null) => void;

  // 数据管理
  setChartData: (chartId: string, data: QueryResult) => void;
  refreshChartData: (chartId: string, queryResult: QueryResult) => void;
  clearChartData: (chartId: string) => void;

  // 仪表板管理
  createDashboard: (
    dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>
  ) => string;
  updateDashboard: (id: string, updates: Partial<Dashboard>) => void;
  deleteDashboard: (id: string) => void;
  duplicateDashboard: (id: string) => string;
  getDashboard: (id: string) => Dashboard | undefined;
  setActiveDashboard: (id: string | null) => void;
  addChartToDashboard: (
    dashboardId: string,
    chartId: string,
    layout: { x: number; y: number; w: number; h: number }
  ) => void;
  removeChartFromDashboard: (dashboardId: string, chartId: string) => void;
  updateDashboardLayout: (
    dashboardId: string,
    layout: Array<{
      chartId: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }>
  ) => void;

  // 实时更新
  enableRealTime: (chartId: string) => void;
  disableRealTime: (chartId: string) => void;
  setRealTimeEnabled: (enabled: boolean) => void;

  // 主题管理
  setTheme: (theme: string) => void;
  addTheme: (theme: string) => void;

  // 错误处理
  setError: (chartId: string, error: string) => void;
  clearError: (chartId: string) => void;
  clearAllErrors: () => void;

  // 导入导出
  exportChart: (chartId: string) => ChartConfiguration | null;
  importChart: (config: ChartConfiguration) => string;
  exportDashboard: (dashboardId: string) => Dashboard | null;
  importDashboard: (dashboard: Dashboard) => string;
}

// 默认图表配置
const createDefaultChart = (
  type: ChartType
): Omit<ChartConfiguration, 'id'> => ({
  title: `新 ${type} 图表`,
  type,
  series: [],
  xAxis: {
    type: 'category',
    name: 'X轴',
  },
  yAxis: [
    {
      type: 'value',
      name: 'Y轴',
      position: 'left',
    },
  ],
  legend: {
    show: true,
    position: 'top',
    orient: 'horizontal',
    align: 'center',
  },
  tooltip: {
    show: true,
    trigger: 'axis',
    axisPointer: {
      type: 'line',
      animation: true,
    },
  },
  grid: {
    show: true,
    left: '10%',
    top: '15%',
    right: '10%',
    bottom: '15%',
    containLabel: true,
  },
  animation: {
    enabled: true,
    duration: 1000,
    easing: 'quadraticOut',
    delay: 0,
    threshold: 2000,
  },
  theme: 'default',
});

export const useVisualizationStore = create<VisualizationState>()(
  persist(
    (set, get) => ({
      // 初始状态
      charts: [],
      activeChartId: null,
      dashboards: [],
      activeDashboardId: null,
      dataSources: {},
      loadingCharts: {},
      realTimeEnabled: false,
      realTimeCharts: new Set(),
      currentTheme: 'default',
      availableThemes: ['default', 'dark', 'light', 'colorful', 'minimal'],
      errors: {},

      // 图表管理
      createChart: config => {
        const id = `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newChart: ChartConfiguration = {
          ...createDefaultChart(config.type),
          ...config,
          id,
        };

        set(state => ({
          charts: [...state.charts, newChart],
          activeChartId: id,
        }));

        return id;
      },

      updateChart: (id, updates) => {
        set(state => ({
          charts: state.charts.map(chart =>
            chart.id === id ? { ...chart, ...updates } : chart
          ),
        }));
      },

      deleteChart: id => {
        set(state => {
          const newRealTimeCharts = new Set(state.realTimeCharts);
          newRealTimeCharts.delete(id);

          const newDataSources = { ...state.dataSources };
          delete newDataSources[id];

          const newLoadingCharts = { ...state.loadingCharts };
          delete newLoadingCharts[id];

          const newErrors = { ...state.errors };
          delete newErrors[id];

          return {
            charts: state.charts.filter(chart => chart.id !== id),
            activeChartId:
              state.activeChartId === id ? null : state.activeChartId,
            dataSources: newDataSources,
            loadingCharts: newLoadingCharts,
            realTimeCharts: newRealTimeCharts,
            errors: newErrors,
          };
        });
      },

      duplicateChart: id => {
        const chart = get().getChart(id);
        if (!chart) return '';

        const newId = `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const duplicatedChart: ChartConfiguration = {
          ...chart,
          id: newId,
          title: `${chart.title} (副本)`,
        };

        set(state => ({
          charts: [...state.charts, duplicatedChart],
          activeChartId: newId,
        }));

        return newId;
      },

      getChart: id => {
        return get().charts.find(chart => chart.id === id);
      },

      setActiveChart: id => {
        set({ activeChartId: id });
      },

      // 数据管理
      setChartData: (chartId, data) => {
        set(state => ({
          dataSources: {
            ...state.dataSources,
            [chartId]: data,
          },
          loadingCharts: {
            ...state.loadingCharts,
            [chartId]: false,
          },
        }));
      },

      refreshChartData: (chartId, queryResult) => {
        set(state => ({
          dataSources: {
            ...state.dataSources,
            [chartId]: queryResult,
          },
        }));
      },

      clearChartData: chartId => {
        set(state => {
          const newDataSources = { ...state.dataSources };
          delete newDataSources[chartId];
          return { dataSources: newDataSources };
        });
      },

      // 仪表板管理
      createDashboard: dashboard => {
        const id = `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const newDashboard: Dashboard = {
          ...dashboard,
          id,
          createdAt: now,
          updatedAt: now,
        };

        set(state => ({
          dashboards: [...state.dashboards, newDashboard],
          activeDashboardId: id,
        }));

        return id;
      },

      updateDashboard: (id, updates) => {
        set(state => ({
          dashboards: state.dashboards.map(dashboard =>
            dashboard.id === id
              ? { ...dashboard, ...updates, updatedAt: new Date() }
              : dashboard
          ),
        }));
      },

      deleteDashboard: id => {
        set(state => ({
          dashboards: state.dashboards.filter(dashboard => dashboard.id !== id),
          activeDashboardId:
            state.activeDashboardId === id ? null : state.activeDashboardId,
        }));
      },

      duplicateDashboard: id => {
        const dashboard = get().getDashboard(id);
        if (!dashboard) return '';

        const newId = `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const duplicatedDashboard: Dashboard = {
          ...dashboard,
          id: newId,
          name: `${dashboard.name} (副本)`,
          createdAt: now,
          updatedAt: now,
        };

        set(state => ({
          dashboards: [...state.dashboards, duplicatedDashboard],
          activeDashboardId: newId,
        }));

        return newId;
      },

      getDashboard: id => {
        return get().dashboards.find(dashboard => dashboard.id === id);
      },

      setActiveDashboard: id => {
        set({ activeDashboardId: id });
      },

      addChartToDashboard: (dashboardId, chartId, layout) => {
        set(state => ({
          dashboards: state.dashboards.map(dashboard =>
            dashboard.id === dashboardId
              ? {
                  ...dashboard,
                  charts: [
                    ...dashboard.charts.filter(c => c.id !== chartId),
                    get().getChart(chartId)!,
                  ].filter(Boolean),
                  layout: [
                    ...dashboard.layout.filter(l => l.chartId !== chartId),
                    { chartId, ...layout },
                  ],
                  updatedAt: new Date(),
                }
              : dashboard
          ),
        }));
      },

      removeChartFromDashboard: (dashboardId, chartId) => {
        set(state => ({
          dashboards: state.dashboards.map(dashboard =>
            dashboard.id === dashboardId
              ? {
                  ...dashboard,
                  charts: dashboard.charts.filter(c => c.id !== chartId),
                  layout: dashboard.layout.filter(l => l.chartId !== chartId),
                  updatedAt: new Date(),
                }
              : dashboard
          ),
        }));
      },

      updateDashboardLayout: (dashboardId, layout) => {
        set(state => ({
          dashboards: state.dashboards.map(dashboard =>
            dashboard.id === dashboardId
              ? { ...dashboard, layout, updatedAt: new Date() }
              : dashboard
          ),
        }));
      },

      // 实时更新
      enableRealTime: chartId => {
        set(state => ({
          realTimeCharts: new Set([...state.realTimeCharts, chartId]),
        }));
      },

      disableRealTime: chartId => {
        set(state => {
          const newRealTimeCharts = new Set(state.realTimeCharts);
          newRealTimeCharts.delete(chartId);
          return { realTimeCharts: newRealTimeCharts };
        });
      },

      setRealTimeEnabled: enabled => {
        set({ realTimeEnabled: enabled });
      },

      // 主题管理
      setTheme: theme => {
        set({ currentTheme: theme });
      },

      addTheme: theme => {
        set(state => ({
          availableThemes: [...new Set([...state.availableThemes, theme])],
        }));
      },

      // 错误处理
      setError: (chartId, error) => {
        set(state => ({
          errors: {
            ...state.errors,
            [chartId]: error,
          },
        }));
      },

      clearError: chartId => {
        set(state => {
          const newErrors = { ...state.errors };
          delete newErrors[chartId];
          return { errors: newErrors };
        });
      },

      clearAllErrors: () => {
        set({ errors: {} });
      },

      // 导入导出
      exportChart: chartId => {
        return get().getChart(chartId) || null;
      },

      importChart: config => {
        const id = `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const importedChart: ChartConfiguration = {
          ...config,
          id,
        };

        set(state => ({
          charts: [...state.charts, importedChart],
          activeChartId: id,
        }));

        return id;
      },

      exportDashboard: dashboardId => {
        return get().getDashboard(dashboardId) || null;
      },

      importDashboard: dashboard => {
        const id = `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const importedDashboard: Dashboard = {
          ...dashboard,
          id,
          createdAt: now,
          updatedAt: now,
        };

        set(state => ({
          dashboards: [...state.dashboards, importedDashboard],
          activeDashboardId: id,
        }));

        return id;
      },
    }),
    {
      name: 'visualization-store',
      partialize: state => ({
        charts: state.charts,
        dashboards: state.dashboards,
        currentTheme: state.currentTheme,
        availableThemes: state.availableThemes,
        activeChartId: state.activeChartId,
        activeDashboardId: state.activeDashboardId,
        realTimeEnabled: state.realTimeEnabled,
      }),
    }
  )
);
