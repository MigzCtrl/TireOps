'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WorkOrderFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  serviceTypeFilter: string;
  onServiceTypeFilterChange: (value: string) => void;
  dateRangeFilter: string;
  onDateRangeFilterChange: (value: string) => void;
}

export function WorkOrderFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  serviceTypeFilter,
  onServiceTypeFilterChange,
  dateRangeFilter,
  onDateRangeFilterChange,
}: WorkOrderFiltersProps) {
  return (
    <div className="bg-bg border border-border-muted rounded-lg shadow-md p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
          <Input
            type="text"
            placeholder="Search customer, service, tire..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-bg-light border-border-muted"
          />
        </div>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="bg-bg-light border-border-muted">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={serviceTypeFilter} onValueChange={onServiceTypeFilterChange}>
          <SelectTrigger className="bg-bg-light border-border-muted">
            <SelectValue placeholder="Filter by service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="Tire Installation">Tire Installation</SelectItem>
            <SelectItem value="Tire Rotation">Tire Rotation</SelectItem>
            <SelectItem value="Tire Repair">Tire Repair</SelectItem>
            <SelectItem value="Wheel Alignment">Wheel Alignment</SelectItem>
            <SelectItem value="Tire Balance">Tire Balance</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRangeFilter} onValueChange={onDateRangeFilterChange}>
          <SelectTrigger className="bg-bg-light border-border-muted">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Next 7 Days</SelectItem>
            <SelectItem value="month">Next 30 Days</SelectItem>
            <SelectItem value="past">Past Orders</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
