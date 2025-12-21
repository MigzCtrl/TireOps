#!/usr/bin/env python3
"""
Script to convert Inventory and Customers forms to modal overlays.
"""

import re

# Read the inventory file
with open('D:/Tire-Shop-MVP/src/app/inventory/page.tsx', 'r', encoding='utf-8') as f:
    inventory_content = f.read()

# Add useEffect for scroll lock after line with setFilteredInventory(filtered);
# Find the location after the stockFilter useEffect
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

# Insert after the setFilteredInventory useEffect
pattern = r'(  }, \[searchTerm, stockFilter, inventory\];)'
inventory_content = re.sub(pattern, r'\1' + scroll_lock_effect, inventory_content, count=1)

# Now replace the form section with modal structure
old_form = r'''        \{/\* Form \*/\}
        \{showForm && \(
          <motion\.div
            initial=\{\{ opacity: 0, y: -20 \}\}
            animate=\{\{ opacity: 1, y: 0 \}\}
            className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg"
            style=\{\{ padding: '24px' \}\}
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Add New Tire</h2>'''

new_form = '''        {/* Form Modal */}
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
                    </div>'''

inventory_content = re.sub(old_form, new_form, inventory_content, flags=re.DOTALL)

# Replace the form tag and content structure
old_form_tag = r'            <form onSubmit=\{handleSubmit\} className="space-y-6">'
new_form_tag = '''                    {/* Form with scrollable content */}
                    <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                      <div className="overflow-y-auto flex-1 pr-2 -mr-2">'''

inventory_content = re.sub(old_form_tag, new_form_tag, inventory_content)

# Replace the buttons section
old_buttons = r'''              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick=\{.*?\}
                  className="sm:flex-1 h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sm:flex-1 h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm hover:shadow-md"
                >
                  Add Tire
                </button>
              </div>
            </form>
          </motion\.div>
        \)\}'''

new_buttons = '''                      </div>

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
        )}'''

inventory_content = re.sub(old_buttons, new_buttons, inventory_content, flags=re.DOTALL)

# Write the modified content back
with open('D:/Tire-Shop-MVP/src/app/inventory/page.tsx', 'w', encoding='utf-8') as f:
    f.write(inventory_content)

print("Inventory page modal conversion completed!")
