'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';

// Extended WorkOrder type with tire_info for display
interface WorkOrder {
  id: string;
  service_type: string;
  status: string;
  scheduled_date: string;
  scheduled_time?: string | null;
  total_amount?: number | null;
  notes?: string;
  tire_info?: string;
}

interface OrderHistoryProps {
  workOrders: WorkOrder[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  totalSpent: number;
  avgOrderValue: number;
  lastVisit: Date | null;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
};

export function OrderHistory({
  workOrders,
  statusFilter,
  onStatusFilterChange,
  totalSpent,
  avgOrderValue,
  lastVisit,
}: OrderHistoryProps) {
  const filteredOrders = statusFilter === 'all'
    ? workOrders
    : workOrders.filter(order => order.status === statusFilter);

  return (
    <>
      {/* Compact Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <div className="stats-card p-3 flex flex-col items-center text-center">
          <div className="p-2 rounded-lg bg-blue-500/20 mb-2">
            <ClipboardList className="text-blue-500" size={18} />
          </div>
          <p className="text-2xl stat-number font-bold text-gray-900 dark:text-white mb-1">{workOrders.length}</p>
          <p className="text-xs stat-label text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Orders</p>
        </div>

        <div className="stats-card p-3 flex flex-col items-center text-center">
          <div className="p-2 rounded-lg bg-green-500/20 mb-2">
            <svg className="text-green-500" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-2xl stat-number font-bold text-gray-900 dark:text-white mb-1">${totalSpent.toFixed(2)}</p>
          <p className="text-xs stat-label text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Revenue</p>
        </div>

        <div className="stats-card p-3 flex flex-col items-center text-center">
          <div className="p-2 rounded-lg bg-purple-500/20 mb-2">
            <svg className="text-purple-500" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-2xl stat-number font-bold text-gray-900 dark:text-white mb-1">${avgOrderValue.toFixed(2)}</p>
          <p className="text-xs stat-label text-gray-600 dark:text-gray-400 uppercase tracking-wider">Avg Order Value</p>
        </div>

        <div className="stats-card p-3 flex flex-col items-center text-center">
          <div className="p-2 rounded-lg bg-pink-500/20 mb-2">
            <svg className="text-pink-500" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-base stat-number font-bold text-gray-900 dark:text-white mb-1">
            {lastVisit ? lastVisit.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
          </p>
          <p className="text-xs stat-label text-gray-600 dark:text-gray-400 uppercase tracking-wider">Last Visit</p>
        </div>
      </motion.div>

      {/* Work Orders Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card-glass p-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <ClipboardList className="text-blue-400" size={20} />
            </div>
            <h2 className="text-xl font-semibold dark:text-white">Work Order History</h2>
          </div>
          <Link href="/work-orders">
            <Button>
              <Plus size={18} className="mr-2" />
              New Order
            </Button>
          </Link>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => onStatusFilterChange(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
              {status !== 'all' && (
                <span className="ml-2 text-xs opacity-75">
                  ({workOrders.filter(o => o.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            {statusFilter === 'all'
              ? 'No work orders yet for this customer'
              : `No ${statusFilter.replace('_', ' ')} orders`}
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500"></div>

            <div className="space-y-6">
              {filteredOrders.map((order, index) => (
                <Link key={order.id} href={`/work-orders`}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative pl-12 cursor-pointer group"
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      order.status === 'completed'
                        ? 'bg-green-500 border-green-400'
                        : order.status === 'in_progress'
                        ? 'bg-blue-500 border-blue-400'
                        : order.status === 'pending'
                        ? 'bg-yellow-500 border-yellow-400'
                        : 'bg-red-500 border-red-400'
                    }`}>
                      <ClipboardList size={14} className="text-white" />
                    </div>

                    {/* Order Card */}
                    <div className="bg-bg-light rounded-lg p-4 border border-border-muted hover:bg-bg transition-all group-hover:shadow-lg">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                        <div>
                          <h3 className="font-semibold text-lg text-text">{order.service_type}</h3>
                          <p className="text-sm text-text-muted">{order.tire_info}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border ${
                            statusColors[order.status as keyof typeof statusColors]
                          }`}
                        >
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-text-muted text-xs mb-1">Date</p>
                          <p className="font-medium text-text">
                            {new Date(order.scheduled_date).toLocaleDateString()}
                          </p>
                        </div>
                        {order.scheduled_time && (
                          <div>
                            <p className="text-text-muted text-xs mb-1">Time</p>
                            <p className="font-medium text-text">{formatTime(order.scheduled_time)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-text-muted text-xs mb-1">Amount</p>
                          <p className="font-medium text-text">
                            {order.total_amount ? `$${order.total_amount.toFixed(2)}` : 'Not set'}
                          </p>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="mt-3 pt-3 border-t border-border-muted">
                          <p className="text-text-muted text-xs mb-1">Notes</p>
                          <p className="text-sm text-text">{order.notes}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
