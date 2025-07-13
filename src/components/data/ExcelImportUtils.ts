// Excel 导入工具类
// 注意：这需要安装 xlsx 库: npm install xlsx

export interface ExcelWorksheet {
  name: string;
  data: any[][];
  headers: string[];
  rowCount: number;
  columnCount: number;
}

export interface ExcelFile {
  fileName: string;
  fileSize: number;
  worksheets: ExcelWorksheet[];
  activeSheet: string;
}

export interface ExcelImportOptions {
  sheetName?: string;
  range?: string;
  header?: number;
  dateNF?: string;
  cellFormula?: boolean;
  cellHTML?: boolean;
  cellNF?: boolean;
  cellStyles?: boolean;
  cellText?: boolean;
  cellDates?: boolean;
  sheetStubs?: boolean;
  bookDeps?: boolean;
  bookFiles?: boolean;
  bookProps?: boolean;
  bookSheets?: boolean;
  bookVBA?: boolean;
  raw?: boolean;
  codepage?: number;
  type?: 'base64' | 'binary' | 'string' | 'buffer' | 'array' | 'file';
}

export class ExcelImportManager {
  private XLSX: any;

  constructor() {
    // 动态导入 xlsx 库
    this.initializeXLSX();
  }

  /**
   * 初始化 XLSX 库
   */
  private async initializeXLSX() {
    try {
      // 在实际使用中，这里需要先安装 xlsx: npm install xlsx
      // this.XLSX = await import('xlsx');
      
      // 临时模拟，实际使用时需要取消注释上面的行
      this.XLSX = {
        read: this.mockXLSXRead.bind(this),
        utils: {
          sheet_to_json: this.mockSheetToJson.bind(this),
          sheet_to_csv: this.mockSheetToCsv.bind(this),
          decode_range: this.mockDecodeRange.bind(this),
          encode_range: this.mockEncodeRange.bind(this)}};
    } catch (error) {
      console.error('XLSX 库加载失败:', error);
      throw new Error('Excel 导入功能需要 xlsx 库支持');
    }
  }

  /**
   * 解析 Excel 文件
   */
  async parseExcelFile(file: File, options: ExcelImportOptions = {}): Promise<ExcelFile> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = this.XLSX.read(buffer, {
        type: 'array',
        cellText: true,
        cellDates: true,
        dateNF: 'yyyy-mm-dd',
        ...options});

      const worksheets: ExcelWorksheet[] = [];

      // 解析每个工作表
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = this.parseWorksheet(worksheet, sheetName, options);
        worksheets.push(sheetData);
      }

      return {
        fileName: file.name,
        fileSize: file.size,
        worksheets,
        activeSheet: workbook.SheetNames[0] || ''};
    } catch (error) {
      throw new Error(`Excel 文件解析失败: ${error}`);
    }
  }

  /**
   * 解析工作表
   */
  private parseWorksheet(worksheet: any, sheetName: string, options: ExcelImportOptions): ExcelWorksheet {
    const range = worksheet['!ref'];
    if (!range) {
      return {
        name: sheetName,
        data: [],
        headers: [],
        rowCount: 0,
        columnCount: 0};
    }

    // 转换为 JSON 格式
    const jsonData = this.XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      dateNF: options.dateNF || 'yyyy-mm-dd',
      defval: ''});

    if (jsonData.length === 0) {
      return {
        name: sheetName,
        data: [],
        headers: [],
        rowCount: 0,
        columnCount: 0};
    }

    // 提取表头
    const headerRow = options.header !== undefined ? options.header : 0;
    const headers = jsonData[headerRow] || [];
    const data = jsonData.slice(headerRow + 1);

    // 确保所有行都有相同的列数
    const maxCols = Math.max(...jsonData.map(row => row.length));
    const normalizedData = data.map(row => {
      const normalizedRow = [...row];
      while (normalizedRow.length < maxCols) {
        normalizedRow.push('');
      }
      return normalizedRow;
    });

    return {
      name: sheetName,
      data: normalizedData,
      headers: headers.map((header, index) => header || `Column${index + 1}`),
      rowCount: normalizedData.length,
      columnCount: maxCols};
  }

  /**
   * 获取工作表列表
   */
  async getWorksheetNames(file: File): Promise<string[]> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = this.XLSX.read(buffer, { type: 'array', bookSheets: true });
      return workbook.SheetNames || [];
    } catch (error) {
      throw new Error(`读取工作表列表失败: ${error}`);
    }
  }

  /**
   * 解析指定工作表
   */
  async parseSpecificWorksheet(file: File, sheetName: string, options: ExcelImportOptions = {}): Promise<ExcelWorksheet> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = this.XLSX.read(buffer, {
        type: 'array',
        sheets: [sheetName],
        cellText: true,
        cellDates: true,
        ...options});

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        throw new Error(`工作表 "${sheetName}" 不存在`);
      }

      return this.parseWorksheet(worksheet, sheetName, options);
    } catch (error) {
      throw new Error(`解析工作表失败: ${error}`);
    }
  }

  /**
   * 获取工作表范围信息
   */
  async getWorksheetRange(file: File, sheetName: string): Promise<{ start: string; end: string; rows: number; cols: number }> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = this.XLSX.read(buffer, { type: 'array', bookSheets: true });
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet || !worksheet['!ref']) {
        return { start: 'A1', end: 'A1', rows: 0, cols: 0 };
      }

      const range = this.XLSX.utils.decode_range(worksheet['!ref']);
      return {
        start: this.XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c }),
        end: this.XLSX.utils.encode_cell({ r: range.e.r, c: range.e.c }),
        rows: range.e.r - range.s.r + 1,
        cols: range.e.c - range.s.c + 1};
    } catch (error) {
      throw new Error(`获取工作表范围失败: ${error}`);
    }
  }

  /**
   * 检测数据类型
   */
  detectColumnTypes(data: any[][]): string[] {
    if (data.length === 0) return [];

    const columnCount = data[0].length;
    const types: string[] = [];

    for (let col = 0; col < columnCount; col++) {
      const columnData = data.map(row => row[col]).filter(val => val !== null && val !== undefined && val !== '');
      const detectedType = this.detectDataType(columnData);
      types.push(detectedType);
    }

    return types;
  }

  /**
   * 检测数据类型
   */
  private detectDataType(values: any[]): string {
    if (values.length === 0) return 'string';

    const samples = values.slice(0, 100);
    
    // 检查日期
    const dateCount = samples.filter(val => this.isDate(val)).length;
    if (dateCount / samples.length > 0.8) return 'date';

    // 检查数字
    const numberCount = samples.filter(val => this.isNumber(val)).length;
    if (numberCount / samples.length > 0.8) return 'number';

    // 检查布尔值
    const booleanCount = samples.filter(val => this.isBoolean(val)).length;
    if (booleanCount / samples.length > 0.8) return 'boolean';

    return 'string';
  }

  /**
   * 检查是否为日期
   */
  private isDate(value: any): boolean {
    if (value instanceof Date) return true;
    
    const str = String(value);
    const date = new Date(str);
    return !isNaN(date.getTime()) && str.length > 8;
  }

  /**
   * 检查是否为数字
   */
  private isNumber(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && isFinite(num);
  }

  /**
   * 检查是否为布尔值
   */
  private isBoolean(value: any): boolean {
    if (typeof value === 'boolean') return true;
    
    const str = String(value).toLowerCase();
    return ['true', 'false', '1', '0', 'yes', 'no'].includes(str);
  }

  /**
   * 转换为 CSV 格式
   */
  async convertToCsv(file: File, sheetName: string, options: ExcelImportOptions = {}): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = this.XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new Error(`工作表 "${sheetName}" 不存在`);
      }

      return this.XLSX.utils.sheet_to_csv(worksheet, {
        FS: ',',
        RS: '\n',
        dateNF: options.dateNF || 'yyyy-mm-dd',
        strip: false,
        blankrows: false,
        skipHidden: false});
    } catch (error) {
      throw new Error(`转换为 CSV 失败: ${error}`);
    }
  }

  /**
   * 预览数据
   */
  async previewData(file: File, sheetName: string, maxRows: number = 10): Promise<{ headers: string[]; data: any[][] }> {
    try {
      const worksheet = await this.parseSpecificWorksheet(file, sheetName, { header: 0 });
      return {
        headers: worksheet.headers,
        data: worksheet.data.slice(0, maxRows)};
    } catch (error) {
      throw new Error(`预览数据失败: ${error}`);
    }
  }

  // 以下是模拟方法，实际使用时需要安装 xlsx 库
  private mockXLSXRead(buffer: ArrayBuffer, options: any): any {
    // 模拟 Excel 文件解析
    return {
      SheetNames: ['Sheet1', 'Sheet2'],
      Sheets: {
        Sheet1: {
          '!ref': 'A1:C10',
          A1: { v: 'Name', t: 's' },
          B1: { v: 'Age', t: 's' },
          C1: { v: 'City', t: 's' },
          A2: { v: 'John', t: 's' },
          B2: { v: 25, t: 'n' },
          C2: { v: 'New York', t: 's' }},
        Sheet2: {
          '!ref': 'A1:B5',
          A1: { v: 'Product', t: 's' },
          B1: { v: 'Price', t: 's' }}}};
  }

  private mockSheetToJson(worksheet: any, options: any): any[][] {
    // 模拟转换为 JSON
    return [
      ['Name', 'Age', 'City'],
      ['John', 25, 'New York'],
      ['Jane', 30, 'Los Angeles'],
    ];
  }

  private mockSheetToCsv(worksheet: any, options: any): string {
    // 模拟转换为 CSV
    return 'Name,Age,City\nJohn,25,New York\nJane,30,Los Angeles';
  }

  private mockDecodeRange(range: string): { s: { r: number; c: number }; e: { r: number; c: number } } {
    // 模拟解码范围
    return {
      s: { r: 0, c: 0 },
      e: { r: 9, c: 2 }};
  }

  private mockEncodeRange(range: { s: { r: number; c: number }; e: { r: number; c: number } }): string {
    // 模拟编码范围
    return 'A1:C10';
  }
}

// 工具函数
export const createExcelImportManager = (): ExcelImportManager => {
  return new ExcelImportManager();
};

export const getExcelFileInfo = async (file: File): Promise<{ sheets: string[]; size: number }> => {
  const manager = createExcelImportManager();
  const sheets = await manager.getWorksheetNames(file);
  return {
    sheets,
    size: file.size};
};

export const isExcelFile = (file: File): boolean => {
  const ext = file.name.toLowerCase().split('.').pop();
  return ext === 'xlsx' || ext === 'xls';
};

export const getExcelMimeTypes = (): string[] => {
  return [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
    'application/vnd.ms-excel.template.macroEnabled.12', // .xltm
    'application/vnd.ms-excel.addin.macroEnabled.12', // .xlam
    'application/vnd.ms-excel.sheet.binary.macroEnabled.12', // .xlsb
  ];
};