'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Users, Plus, Search, Edit, Eye, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const modalRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    // Check for search parameter in URL
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone.includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showForm]);

  async function loadCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert([formData]);
        if (error) throw error;
      }

      setFormData({ name: '', email: '', phone: '', address: '' });
      setShowForm(false);
      setEditingId(null);
      loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  }

  function startEdit(customer: Customer) {
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone,
      address: customer.address || '',
    });
    setEditingId(customer.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure?')) return;
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl dark:text-white">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold dark:text-white mb-2">Customers</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your customer database
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 btn-glass-primary btn-press w-full sm:w-auto justify-center"
          >
            {showForm ? 'Cancel' : <><Plus size={20} /> Add Customer</>}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search customers by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Form Modal */}
        {showForm && typeof window !== 'undefined' && createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999]"
              style={{ width: '100vw', height: '100vh' }}
              onClick={() => setShowForm(false)}
              aria-hidden="true"
            />

            <div
              className="fixed inset-0 overflow-y-auto pointer-events-none z-[10000]"
              style={{ overscrollBehavior: 'contain', width: '100vw', height: '100vh' }}
            >
              <div className="min-h-full flex items-center justify-center p-6 pointer-events-none">
                <div
                  ref={modalRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="modal-title"
                  tabIndex={-1}
                  className="pointer-events-auto w-[90vw] max-w-[1200px]"
                  style={{ overflow: 'visible' }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowForm(false);
                    }
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
                    style={{ maxHeight: '90vh' }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                      <h2 id="modal-title" className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {editingId ? 'Edit Customer' : 'Add New Customer'}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>

                    {/* Form with scrollable content */}
                    <form onSubmit={handleSubmit} className="flex flex-col p-6" style={{ maxHeight: 'calc(90vh - 100px)' }}>
                      <div className="overflow-y-auto flex-1 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                              Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                              Phone *
                            </label>
                            <input
                              type="tel"
                              required
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                              Email
                            </label>
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                              Address
                            </label>
                            <input
                              type="text"
                              value={formData.address}
                              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                              className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Fixed Button Row at Bottom */}
                      <div className="flex gap-3 justify-end pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                          type="button"
                          onClick={() => setShowForm(false)}
                          className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all text-sm font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all text-sm font-medium shadow-sm hover:shadow-md"
                        >
                          {editingId ? 'Update Customer' : 'Add Customer'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              </div>
            </div>
          </AnimatePresence>,
          document.body
        )}


        {/* Table */}
        <div className="card-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Name
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Email
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Phone
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Address
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 sm:px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                    >
                      {searchTerm
                        ? `No customers found matching "${searchTerm}"`
                        : 'No customers yet. Add one to get started!'}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer, index) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium dark:text-white">
                        {customer.name}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-600 dark:text-gray-400">
                        {customer.email || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-600 dark:text-gray-400">
                        {customer.phone}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-600 dark:text-gray-400">
                        {customer.address || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            onClick={() => startEdit(customer)}
                            className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <Link
                            href={`/customers/${customer.id}`}
                            className="p-1.5 sm:p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            {searchTerm
              ? `Showing ${filteredCustomers.length} of ${customers.length} customers`
              : `Total: ${customers.length} customers`}
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}
