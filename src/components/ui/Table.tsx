import * as React from "react"
import { cn } from "@/lib/utils"
import { Spin } from "./Spin"
import { Empty } from "./Empty"

// Basic table components
const BaseTable = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
BaseTable.displayName = "BaseTable"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

// Ant Design compatible Table component
interface Column {
  title: string;
  dataIndex: string;
  key: string;
  ellipsis?: boolean;
  width?: number | string;
  render?: (value: any, record: any, index: number) => React.ReactNode;
}

interface Pagination {
  pageSize?: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: [number, number]) => string;
  pageSizeOptions?: string[];
}

interface AntTableProps {
  columns?: Column[];
  dataSource?: any[];
  loading?: boolean;
  rowKey?: string | ((record: any) => string);
  rowClassName?: string | ((record: any, index: number) => string);
  size?: 'small' | 'middle' | 'large';
  scroll?: { x?: number | string; y?: number | string };
  pagination?: Pagination | false;
  bordered?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const Table = React.forwardRef<HTMLDivElement, AntTableProps>(
  ({
    columns = [],
    dataSource = [],
    loading = false,
    rowKey = 'key',
    rowClassName,
    size = 'middle',
    scroll,
    pagination,
    bordered = false,
    className,
    style,
    ...props
  }, ref) => {
    // Filter out Ant Design specific props that shouldn't be passed to DOM
    const {
      columns: _columns,
      dataSource: _dataSource,
      loading: _loading,
      rowKey: _rowKey,
      rowClassName: _rowClassName,
      size: _size,
      scroll: _scroll,
      pagination: _pagination,
      bordered: _bordered,
      ...domProps
    } = props as any;

    if (loading) {
      return (
        <div ref={ref} className={cn("flex items-center justify-center p-8", className)} style={style}>
          <Spin />
        </div>
      );
    }

    if (!dataSource || dataSource.length === 0) {
      return (
        <div ref={ref} className={cn("flex items-center justify-center p-8", className)} style={style}>
          <Empty description="暂无数据" />
        </div>
      );
    }

    const getRowKey = (record: any, index: number): string => {
      if (typeof rowKey === 'function') {
        return rowKey(record);
      }
      return record[rowKey] || index.toString();
    };

    const getRowClassName = (record: any, index: number): string => {
      if (typeof rowClassName === 'function') {
        return rowClassName(record, index);
      }
      return rowClassName || '';
    };

    return (
      <div
        ref={ref}
        className={cn("relative w-full", className)}
        style={style}
        {...domProps}
      >
        <div className={cn(
          "overflow-auto",
          scroll?.x && "overflow-x-auto",
          scroll?.y && "overflow-y-auto"
        )} style={{
          maxHeight: scroll?.y,
          maxWidth: scroll?.x
        }}>
          <BaseTable className={cn(
            size === 'small' && "text-xs",
            size === 'large' && "text-base",
            bordered && "border border-border"
          )}>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    style={{ width: column.width }}
                    className={cn(
                      column.ellipsis && "truncate",
                      bordered && "border-r border-border last:border-r-0"
                    )}
                  >
                    {column.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataSource.map((record, index) => (
                <TableRow
                  key={getRowKey(record, index)}
                  className={cn(
                    getRowClassName(record, index),
                    bordered && "border-b border-border"
                  )}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        column.ellipsis && "truncate",
                        bordered && "border-r border-border last:border-r-0"
                      )}
                    >
                      {column.render
                        ? column.render(record[column.dataIndex], record, index)
                        : record[column.dataIndex]
                      }
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </BaseTable>
        </div>

        {/* Pagination would go here if needed */}
        {pagination && (
          <div className="mt-4 flex justify-end">
            {/* Pagination component implementation would go here */}
          </div>
        )}
      </div>
    );
  }
);

Table.displayName = "Table";

export {
  Table,
  BaseTable,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption
}
