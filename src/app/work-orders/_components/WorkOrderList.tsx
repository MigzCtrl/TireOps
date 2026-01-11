'use client';

import { Eye, Edit, Trash2, FileText, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatTime } from '@/lib/utils';
import type { WorkOrderWithDetails } from '@/types/database';

type SortField = 'customer_name' | 'service_type' | 'scheduled_date' | 'status' | 'total_amount';
type SortDirection = 'asc' | 'desc';

interface WorkOrderListProps {
  orders: WorkOrderWithDetails[];
  sortField: SortField;
  sortDirection: SortDirection;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalCount: number;
  canEdit: boolean;
  canDelete: boolean;
  onSort: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onStatusChange: (id: string, newStatus: string) => void;
  onEdit: (order: WorkOrderWithDetails) => void;
  onDelete: (id: string) => void;
}

function getStatusBadge(status: string) {
  const badges = {
    pending: (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/20 text-secondary border border-secondary/30">
        <AlertCircle size={12} />
        Pending
      </span>
    ),
    in_progress: (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
        <Loader2 size={12} className="animate-spin" />
        In Progress
      </span>
    ),
    completed: (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success border border-success/30">
        <CheckCircle2 size={12} />
        Completed
      </span>
    ),
    cancelled: (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger/20 text-danger border border-danger/30">
        <XCircle size={12} />
        Cancelled
      </span>
    ),
  };
  return badges[status as keyof typeof badges] || badges.pending;
}

export function WorkOrderList({
  orders,
  sortField,
  sortDirection,
  currentPage,
  totalPages,
  itemsPerPage,
  totalCount,
  canEdit,
  canDelete,
  onSort,
  onPageChange,
  onStatusChange,
  onEdit,
  onDelete,
}: WorkOrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="bg-bg border border-border-muted rounded-lg shadow-md overflow-hidden">
        <div className="p-8 text-center">
          <p className="text-text-muted">No work orders match your filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg border border-border-muted rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bg-light border-b border-border-muted">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                onClick={() => onSort('customer_name')}
              >
                <div className="flex items-center gap-2">
                  Customer
                  {sortField === 'customer_name' && (
                    sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                onClick={() => onSort('service_type')}
              >
                <div className="flex items-center gap-2">
                  Service Type
                  {sortField === 'service_type' && (
                    sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                onClick={() => onSort('scheduled_date')}
              >
                <div className="flex items-center gap-2">
                  Scheduled
                  {sortField === 'scheduled_date' && (
                    sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center gap-2">
                  Status
                  {sortField === 'status' && (
                    sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80 transition-colors"
                onClick={() => onSort('total_amount')}
              >
                <div className="flex items-center gap-2">
                  Amount
                  {sortField === 'total_amount' && (
                    sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-bg divide-y divide-border-muted">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-bg-light transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-text">{order.customer_name}</div>
                  <div className="text-xs text-text-muted">{order.tire_info}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text">{order.service_type}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text">
                    {new Date(order.scheduled_date + 'T00:00:00').toLocaleDateString()}
                  </div>
                  {order.scheduled_time && (
                    <div className="text-xs text-text-muted">{formatTime(order.scheduled_time)}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Select
                    value={order.status}
                    onValueChange={(newStatus) => onStatusChange(order.id, newStatus)}
                  >
                    <SelectTrigger className="w-[160px] h-7 text-xs border-0 shadow-none px-2 gap-4 hover:bg-transparent">
                      <div>{getStatusBadge(order.status)}</div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-text">
                    {order.total_amount ? `$${order.total_amount.toFixed(2)}` : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/work-orders/${order.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-muted hover:text-text hover:bg-bg-light"
                      >
                        <Eye size={16} />
                      </Button>
                    </Link>
                    <Link href={`/invoice/${order.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-info hover:bg-info/10"
                        title="View Invoice"
                      >
                        <FileText size={16} />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!canEdit}
                      onClick={() => onEdit(order)}
                      className="h-8 w-8 text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!canDelete}
                      onClick={() => onDelete(order.id)}
                      className="h-8 w-8 text-danger hover:bg-danger/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalCount > itemsPerPage && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-muted">
          <div className="text-sm text-text-muted">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            <span className="text-sm text-text-muted px-3">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
