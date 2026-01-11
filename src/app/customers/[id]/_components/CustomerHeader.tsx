'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Customer } from '@/types/database';

interface CustomerHeaderProps {
  customer: Customer;
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomerHeader({ customer, onEdit, onDelete }: CustomerHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
          Home
        </Link>
        <ChevronRight size={16} />
        <Link href="/customers" className="hover:text-blue-600 dark:hover:text-blue-400">
          Customers
        </Link>
        <ChevronRight size={16} />
        <span className="text-gray-900 dark:text-white font-medium">{customer.name}</span>
      </div>

      {/* Header with Avatar */}
      <div className="card-glass p-6">
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-4"
        >
          <ArrowLeft size={20} />
          Back to Customers
        </Link>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Customer Avatar with Initials */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">
                {getInitials(customer.name)}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold dark:text-white">{customer.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">Customer Profile</p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={onEdit} variant="default" className="flex-1 sm:flex-none">
              <Edit size={18} className="mr-2" />
              Edit
            </Button>
            <Button onClick={onDelete} variant="destructive" className="flex-1 sm:flex-none">
              <Trash2 size={18} className="mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
