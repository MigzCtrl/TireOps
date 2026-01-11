'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomerFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterChange: (value: string) => void;
}

export function CustomerFilters({
  searchTerm,
  onSearchChange,
  filterType,
  onFilterChange,
}: CustomerFiltersProps) {
  return (
    <div className="bg-bg border border-border-muted rounded-lg shadow-md p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
          <Input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-bg-light border-border-muted"
          />
        </div>

        <Select value={filterType} onValueChange={onFilterChange}>
          <SelectTrigger className="bg-bg-light border-border-muted">
            <SelectValue placeholder="Filter customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            <SelectItem value="new">New This Week</SelectItem>
            <SelectItem value="active">Active (Has Orders)</SelectItem>
            <SelectItem value="inactive">Inactive (No Orders)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
