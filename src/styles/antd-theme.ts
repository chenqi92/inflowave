// TODO: Replace antd types: ThemeConfig 

// Ant Design主题配置
export const antdTheme: ThemeConfig = {
  token: {
    // 主色调
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    
    // 边框半径
    borderRadius: 6,
    
    // 字体
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 15,

    // 间距
    padding: 20,
    margin: 20,
    
    // 阴影
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    
    // 动画
    motionDurationMid: '0.2s'},
  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 32,
      fontWeight: 500,
      paddingInline: 12},
    Table: {
      borderRadius: 8,
      headerBg: '#fafafa',
      headerSplitColor: '#f0f0f0',
      cellPaddingBlock: 8,
      cellPaddingInline: 12},
    Card: {
      borderRadius: 8,
      paddingLG: 20,
      headerHeight: 48},
    Input: {
      borderRadius: 6,
      controlHeight: 32,
      paddingBlock: 6,
      paddingInline: 10},
    Select: {
      borderRadius: 6,
      controlHeight: 32,
      optionPadding: '6px 10px'},
    Tree: {
      borderRadius: 6,
      nodeSelectedBg: '#e6f7ff',
      nodeHoverBg: '#f5f5f5',
      titleHeight: 28},
    Modal: {
      borderRadius: 8,
      contentBg: '#ffffff',
      headerBg: '#ffffff'},
    Space: {
      size: 8}}};