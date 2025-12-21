#!/usr/bin/env python3
"""
Update Inventory page to use modal for editing as well as adding.
"""

with open('D:/Tire-Shop-MVP/src/app/inventory/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update startEditingTire to also show the modal
content = content.replace(
    '''  function startEditingTire(tire: Tire) {
    setEditingTireId(tire.id);
    setFormData({
      brand: tire.brand,
      model: tire.model,
      size: tire.size,
      quantity: tire.quantity,
      price: tire.price,
      description: tire.description || '',
    });
  }''',
    '''  function startEditingTire(tire: Tire) {
    setEditingTireId(tire.id);
    setFormData({
      brand: tire.brand,
      model: tire.model,
      size: tire.size,
      quantity: tire.quantity,
      price: tire.price,
      description: tire.description || '',
    });
    setShowForm(true);
  }'''
)

# 2. Update cancelEditingTire to also hide the modal
content = content.replace(
    '''  function cancelEditingTire() {
    setEditingTireId(null);
    setFormData({
      brand: '',
      model: '',
      size: '',
      quantity: 0,
      price: 0,
      description: '',
    });
  }''',
    '''  function cancelEditingTire() {
    setEditingTireId(null);
    setShowForm(false);
    setFormData({
      brand: '',
      model: '',
      size: '',
      quantity: 0,
      price: 0,
      description: '',
    });
  }'''
)

# 3. Update saveEditedTire to reset state properly
content = content.replace(
    '''      setEditingTireId(null);
      setFormData({
        brand: '',
        model: '',
        size: '',
        quantity: 0,
        price: 0,
        description: '',
      });
      loadInventory();''',
    '''      setEditingTireId(null);
      setShowForm(false);
      setFormData({
        brand: '',
        model: '',
        size: '',
        quantity: 0,
        price: 0,
        description: '',
      });
      loadInventory();'''
)

# 4. Update handleSubmit to handle both add and edit
content = content.replace(
    '''  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('inventory').insert([formData]);

      if (error) throw error;

      setFormData({
        brand: '',
        model: '',
        size: '',
        quantity: 0,
        price: 0,
        description: '',
      });
      setShowForm(false);
      loadInventory();
    } catch (error) {
      console.error('Error adding tire:', error);
      alert('Error adding tire');
    }
  }''',
    '''  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingTireId) {
        const { error } = await supabase
          .from('inventory')
          .update(formData)
          .eq('id', editingTireId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventory').insert([formData]);
        if (error) throw error;
      }

      setEditingTireId(null);
      setFormData({
        brand: '',
        model: '',
        size: '',
        quantity: 0,
        price: 0,
        description: '',
      });
      setShowForm(false);
      loadInventory();
    } catch (error) {
      console.error(`Error ${editingTireId ? 'updating' : 'adding'} tire:`, error);
      alert(`Error ${editingTireId ? 'updating' : 'adding'} tire`);
    }
  }'''
)

# 5. Update modal title to show "Add New Tire" or "Edit Tire"
content = content.replace(
    '''                      <h2 id="modal-title" className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Add New Tire
                      </h2>''',
    '''                      <h2 id="modal-title" className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {editingTireId ? 'Edit Tire' : 'Add New Tire'}
                      </h2>'''
)

# 6. Update submit button text
content = content.replace(
    '''                        >
                          Add Tire
                        </button>''',
    '''                        >
                          {editingTireId ? 'Update Tire' : 'Add Tire'}
                        </button>'''
)

# 7. Update cancel button to reset editingTireId
content = content.replace(
    '''                        <button
                          type="button"
                          onClick={() => setShowForm(false)}
                          className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all text-sm font-medium"
                        >
                          Cancel
                        </button>''',
    '''                        <button
                          type="button"
                          onClick={() => {
                            setShowForm(false);
                            setEditingTireId(null);
                            setFormData({
                              brand: '',
                              model: '',
                              size: '',
                              quantity: 0,
                              price: 0,
                              description: '',
                            });
                          }}
                          className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all text-sm font-medium"
                        >
                          Cancel
                        </button>'''
)

# 8. Update backdrop click to reset editingTireId
content = content.replace(
    '''              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowForm(false)}
              aria-hidden="true"''',
    '''              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => {
                setShowForm(false);
                setEditingTireId(null);
              }}
              aria-hidden="true"'''
)

# 9. Update X button to reset editingTireId
content = content.replace(
    '''                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                      </button>''',
    '''                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setEditingTireId(null);
                        }}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                      </button>'''
)

# 10. Update Escape key to reset editingTireId
content = content.replace(
    '''                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowForm(false);
                    }
                  }}''',
    '''                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowForm(false);
                      setEditingTireId(null);
                    }
                  }}'''
)

with open('D:/Tire-Shop-MVP/src/app/inventory/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Inventory page updated to use modal for editing")
