#!/usr/bin/env python3
"""
Convert Inventory and Customers pages to use modal overlays.
"""

def convert_inventory_page():
    """Convert Inventory page form to modal overlay."""

    # Read the file
    with open('D:/Tire-Shop-MVP/src/app/inventory/page.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Step 1: Update imports (lines 0-10)
    for i, line in enumerate(lines[:10]):
        if "import { useEffect, useState, Suspense } from 'react';" in line:
            lines[i] = "import { useEffect, useState, Suspense, useRef } from 'react';\n"
        elif "import { motion } from 'framer-motion';" in line:
            lines[i] = "import { motion, AnimatePresence } from 'framer-motion';\n"
        elif "import { Package, Plus, Search, Download, Trash2, Edit, Check, Loader2 } from 'lucide-react';" in line:
            lines[i] = "import { Package, Plus, Search, Download, Trash2, Edit, Check, Loader2, X } from 'lucide-react';\n"

    # Step 2: Add modalRef (after formData state around line 42)
    for i, line in enumerate(lines):
        if '  const supabase = createClient();' in line:
            # Insert modalRef before this line
            lines.insert(i, '  const modalRef = useRef<HTMLDivElement>(null);\n\n')
            break

    # Step 3: Add useEffect for scroll lock (after setFilteredInventory useEffect)
    for i, line in enumerate(lines):
        if '  }, [searchTerm, stockFilter, inventory]);' in line:
            scroll_lock_effect = '''
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
'''
            lines.insert(i + 1, scroll_lock_effect)
            break

    # Step 4: Replace the form section with modal structure
    # Find the start and end of the form section
    form_start = None
    form_end = None
    for i, line in enumerate(lines):
        if '        {/* Form */}' in line:
            form_start = i
        if form_start is not None and '        )}' in line and i > form_start + 10:
            form_end = i + 1
            break

    if form_start and form_end:
        # Create the new modal form
        modal_form = '''        {/* Form Modal */}
        {showForm && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowForm(false)}
              aria-hidden="true"
            />

            <div
              className="fixed inset-0 overflow-y-auto pointer-events-none z-50"
              style={{ overscrollBehavior: 'contain' }}
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
                    className="bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl"
                    style={{ maxHeight: '90vh', padding: '24px', overflow: 'visible' }}
                  >
                    {/* Header with X button */}
                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
                      <h2 id="modal-title" className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Add New Tire
                      </h2>
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>

                    {/* Form with scrollable content */}
                    <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                      <div className="overflow-y-auto flex-1 pr-2 -mr-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                              Brand *
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.brand}
                              onChange={(e) =>
                                setFormData({ ...formData, brand: e.target.value })
                              }
                              className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                              Model *
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.model}
                              onChange={(e) =>
                                setFormData({ ...formData, model: e.target.value })
                              }
                              className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                              Size *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g., 225/45R17"
                              value={formData.size}
                              onChange={(e) =>
                                setFormData({ ...formData, size: e.target.value })
                              }
                              className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                              Quantity *
                            </label>
                            <Stepper
                              value={formData.quantity}
                              onChange={(value) => setFormData({ ...formData, quantity: value })}
                              min={0}
                              className="justify-start"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                              Price *
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              value={formData.price}
                              onChange={(e) =>
                                setFormData({ ...formData, price: parseFloat(e.target.value) })
                              }
                              className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="col-span-1 sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                              Description
                            </label>
                            <textarea
                              value={formData.description}
                              onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                              }
                              className="w-full h-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Fixed Button Row at Bottom */}
                      <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
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
                          Add Tire
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              </div>
            </div>
          </AnimatePresence>
        )}

'''
        # Replace the form section
        lines[form_start:form_end] = [modal_form]

    # Write the modified content back
    with open('D:/Tire-Shop-MVP/src/app/inventory/page.tsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print("[OK] Inventory page converted to modal overlay")


def convert_customers_page():
    """Convert Customers page form to modal overlay."""

    # Read the file
    with open('D:/Tire-Shop-MVP/src/app/customers/page.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Step 1: Update imports
    for i, line in enumerate(lines[:10]):
        if "import { useEffect, useState, Suspense } from 'react';" in line:
            lines[i] = "import { useEffect, useState, Suspense, useRef } from 'react';\n"
        elif "import { motion } from 'framer-motion';" in line:
            lines[i] = "import { motion, AnimatePresence } from 'framer-motion';\n"
        elif "import { Users, Plus, Search, Edit, Eye, Trash2 } from 'lucide-react';" in line:
            lines[i] = "import { Users, Plus, Search, Edit, Eye, Trash2, X } from 'lucide-react';\n"

    # Step 2: Add modalRef
    for i, line in enumerate(lines):
        if '  const supabase = createClient();' in line:
            lines.insert(i, '  const modalRef = useRef<HTMLDivElement>(null);\n\n')
            break

    # Step 3: Add useEffect for scroll lock (after searchTerm useEffect)
    for i, line in enumerate(lines):
        if '  }, [searchTerm, customers]);' in line:
            scroll_lock_effect = '''
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
'''
            lines.insert(i + 1, scroll_lock_effect)
            break

    # Step 4: Replace the form section with modal structure
    form_start = None
    form_end = None
    for i, line in enumerate(lines):
        if '        {/* Form */}' in line:
            form_start = i
        if form_start is not None and '        )}' in line and i > form_start + 10:
            form_end = i + 1
            break

    if form_start and form_end:
        modal_form = '''        {/* Form Modal */}
        {showForm && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowForm(false)}
              aria-hidden="true"
            />

            <div
              className="fixed inset-0 overflow-y-auto pointer-events-none z-50"
              style={{ overscrollBehavior: 'contain' }}
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
                    className="bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl"
                    style={{ maxHeight: '90vh', padding: '24px', overflow: 'visible' }}
                  >
                    {/* Header with X button */}
                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
                      <h2 id="modal-title" className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {editingId ? 'Edit Customer' : 'Add New Customer'}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>

                    {/* Form with scrollable content */}
                    <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                      <div className="overflow-y-auto flex-1 pr-2 -mr-2">
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
                              className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                              className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                              className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                              className="w-full h-11 px-3 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Fixed Button Row at Bottom */}
                      <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
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
          </AnimatePresence>
        )}

'''
        lines[form_start:form_end] = [modal_form]

    # Write the modified content back
    with open('D:/Tire-Shop-MVP/src/app/customers/page.tsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print("[OK] Customers page converted to modal overlay")


if __name__ == '__main__':
    convert_inventory_page()
    convert_customers_page()
    print("\n[OK] All pages successfully converted to modal overlays!")
