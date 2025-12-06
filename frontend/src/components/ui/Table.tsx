import React from 'react';
import { cn } from '../../lib/cn';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

interface TableColumn {
  header: string;
  accessor: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: TableColumn[];
  className?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export const Table: React.FC<TableProps> = ({ children, className }) => {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full border-collapse', className)}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<TableProps> = ({ children, className }) => {
  return (
    <thead className={cn('bg-muted', className)}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<TableProps> = ({ children, className }) => {
  return (
    <tbody className={className}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<TableProps & { onClick?: () => void }> = ({ 
  children, 
  className,
  onClick 
}) => {
  return (
    <tr 
      className={cn(
        'border-b border-border',
        onClick && 'cursor-pointer hover:bg-muted/50',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};

export const TableHead: React.FC<TableProps> = ({ children, className }) => {
  return (
    <th className={cn('px-4 py-3 text-left text-sm font-medium', className)}>
      {children}
    </th>
  );
};

export const TableCell: React.FC<TableProps & React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...props }) => {
  return (
    <td className={cn('px-4 py-3 text-sm', className)} {...props}>
      {children}
    </td>
  );
};

// Composant de table avec données
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  className,
  emptyMessage = 'Aucune donnée',
  onRowClick
}: DataTableProps<T>) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((col, idx) => (
            <TableHead key={idx} className={col.className}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell className="text-center text-muted" colSpan={columns.length}>
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, rowIdx) => (
            <TableRow 
              key={rowIdx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col, colIdx) => (
                <TableCell key={colIdx} className={col.className}>
                  {col.render 
                    ? col.render(row[col.accessor], row)
                    : row[col.accessor]
                  }
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
