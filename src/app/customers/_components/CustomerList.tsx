'use client';

import Link from 'next/link';
import { ArrowUp, ArrowDown, Edit, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Customer } from '@/types/database';

type SortField = 'name' | 'email' | 'phone' | 'created_at' | 'order_count';
type SortDirection = 'asc' | 'desc';

interface CustomerListProps {
  customers: Customer[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function CustomerList({
  customers,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted">
          No customers match your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-bg-light border-b border-border-muted">
          <tr>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80"
              onClick={() => onSort('name')}
            >
              <div className="flex items-center gap-2">
                Name
                {sortField === 'name' && (
                  sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                )}
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80"
              onClick={() => onSort('email')}
            >
              <div className="flex items-center gap-2">
                Email
                {sortField === 'email' && (
                  sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                )}
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80"
              onClick={() => onSort('phone')}
            >
              <div className="flex items-center gap-2">
                Phone
                {sortField === 'phone' && (
                  sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                )}
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80"
              onClick={() => onSort('created_at')}
            >
              <div className="flex items-center gap-2">
                Join Date
                {sortField === 'created_at' && (
                  sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                )}
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:bg-bg-light/80"
              onClick={() => onSort('order_count')}
            >
              <div className="flex items-center gap-2">
                Orders
                {sortField === 'order_count' && (
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
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className="hover:bg-bg-light transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                {/* Desktop: Clickable name | Mobile: Plain text (use eye icon) */}
                <Link
                  href={`/customers/${customer.id}`}
                  className="hidden md:block text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                >
                  {customer.name}
                </Link>
                <div className="md:hidden text-sm font-medium text-text">{customer.name}</div>
                {customer.address && (
                  <div className="text-xs text-text-muted">{customer.address}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-text">{customer.email || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-text">{customer.phone || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-text">
                  {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-text">
                  {customer.order_count || 0}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/customers/${customer.id}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 md:h-8 md:w-8 text-primary md:text-text-muted hover:text-text hover:bg-bg-light"
                    >
                      <Eye size={20} className="md:hidden" />
                      <Eye size={16} className="hidden md:block" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canEdit}
                    onClick={() => onEdit(customer)}
                    className="h-8 w-8 text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canDelete}
                    onClick={() => onDelete(customer)}
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
  );
}
