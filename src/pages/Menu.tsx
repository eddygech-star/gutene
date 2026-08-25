import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, UtensilsCrossed, ChevronDown, ChevronUp, Save, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { MenuCategory, MenuItem, MenuItemOption, MenuItemOptionValue } from '@/types';
import { ImageUpload } from '@/components/ImageUpload';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FullSpinner, Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';

interface MenuProps {
  categories: MenuCategory[];
  onCategoriesRefresh: () => void;
}

const emptyItem: Omit<MenuItem, 'id' | 'created_at' | 'category'> = {
  name: '',
  description: '',
  price: 0,
  discounted_price: null,
  category_id: null,
  prep_time: '',
  calories: '',
  is_vegetarian: false,
  is_spicy: false,
  is_new: false,
  is_available: true,
  ingredients: '',
  image: '',
  sort_order: 0,
};

export function Menu({ categories, onCategoriesRefresh }: MenuProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<typeof emptyItem>(emptyItem);
  const [options, setOptions] = useState<MenuItemOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const { toast } = useToast();

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*, category:menu_categories(*)')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load menu items', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const startCreate = () => {
    setForm(emptyItem);
    setOptions([]);
    setEditing(null);
    setIsCreating(true);
  };

  const startEdit = async (item: MenuItem) => {
    setForm({
      name: item.name,
      description: item.description,
      price: Number(item.price),
      discounted_price: item.discounted_price ? Number(item.discounted_price) : null,
      category_id: item.category_id,
      prep_time: item.prep_time,
      calories: item.calories,
      is_vegetarian: item.is_vegetarian,
      is_spicy: item.is_spicy,
      is_new: item.is_new,
      is_available: item.is_available,
      ingredients: item.ingredients,
      image: item.image,
      sort_order: item.sort_order,
    });
    setEditing(item);
    setIsCreating(false);
    setLoadingOptions(true);
    try {
      const { data: opts, error } = await supabase
        .from('menu_item_options')
        .select('*, values:menu_item_option_values(*)')
        .eq('item_id', item.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      const typed = (opts || []) as MenuItemOption[];
      setOptions(typed.map((o) => ({ ...o, values: (o.values || []).slice().sort((a: MenuItemOptionValue, b: MenuItemOptionValue) => a.sort_order - b.sort_order) })));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load options', 'error');
      setOptions([]);
    } finally {
      setLoadingOptions(false);
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setIsCreating(false);
    setForm(emptyItem);
    setOptions([]);
  };

  const saveItem = async () => {
    if (!form.name.trim()) {
      toast('Item name is required', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        discounted_price: form.discounted_price ? Number(form.discounted_price) : null,
        category_id: form.category_id || null,
      };

      if (editing) {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast('Menu item updated');
      } else {
        const { data, error } = await supabase.from('menu_items').insert(payload).select().single();
        if (error) throw error;
        if (data) {
          // Save any options that were added during creation
          for (const opt of options) {
            const { error: optErr } = await supabase.from('menu_item_options').insert({
              item_id: data.id,
              name: opt.name,
              required: opt.required,
              max_select: opt.max_select,
              sort_order: opt.sort_order,
            });
            if (optErr) throw optErr;
          }
        }
        toast('Menu item created');
      }
      await loadItems();
      onCategoriesRefresh();
      cancelEdit();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailable = async (item: MenuItem) => {
    try {
      const { error } = await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
      if (error) throw error;
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i)));
      toast(`${item.name} is now ${!item.is_available ? 'available' : 'unavailable'}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update', 'error');
    }
  };

  const moveItem = async (item: MenuItem, direction: 'up' | 'down') => {
    const categoryItems = items.filter((i) => i.category_id === item.category_id).sort((a, b) => a.sort_order - b.sort_order);
    const idx = categoryItems.findIndex((i) => i.id === item.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categoryItems.length) return;
    const swapItem = categoryItems[swapIdx];
    try {
      const results = await Promise.all([
        supabase.from('menu_items').update({ sort_order: swapItem.sort_order }).eq('id', item.id),
        supabase.from('menu_items').update({ sort_order: item.sort_order }).eq('id', swapItem.id),
      ]);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
      await loadItems();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to reorder', 'error');
    }
  };

  const deleteItem = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast('Menu item deleted');
      setDeleteTarget(null);
      onCategoriesRefresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    }
  };

  // Option group management
  const addOptionGroup = () => {
    setOptions((prev) => [
      ...prev,
      { id: '', item_id: editing?.id || '', name: '', required: false, max_select: 1, sort_order: prev.length, created_at: '', values: [] },
    ]);
  };

  const updateOptionGroup = (idx: number, field: keyof MenuItemOption, value: string | boolean | number) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  };

  const saveOptionGroup = async (idx: number) => {
    const opt = options[idx];
    if (!opt.name.trim()) {
      toast('Option group name is required', 'warning');
      return;
    }
    if (!editing) {
      toast('Save the menu item first before creating options', 'warning');
      return;
    }
    try {
      if (opt.id) {
        const { error } = await supabase.from('menu_item_options').update({
          name: opt.name,
          required: opt.required,
          max_select: opt.max_select,
          sort_order: opt.sort_order,
        }).eq('id', opt.id);
        if (error) throw error;
        toast('Option group updated');
      } else {
        const { data, error } = await supabase.from('menu_item_options').insert({
          item_id: editing.id,
          name: opt.name,
          required: opt.required,
          max_select: opt.max_select,
          sort_order: opt.sort_order,
        }).select().single();
        if (error) throw error;
        setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, id: data.id, item_id: editing.id } : o)));
        toast('Option group added');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save option', 'error');
    }
  };

  const deleteOptionGroup = async (idx: number) => {
    const opt = options[idx];
    try {
      if (opt.id) {
        const { error } = await supabase.from('menu_item_options').delete().eq('id', opt.id);
        if (error) throw error;
      }
      setOptions((prev) => prev.filter((_, i) => i !== idx));
      toast('Option group deleted');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    }
  };

  const addOptionValue = (optIdx: number) => {
    setOptions((prev) => prev.map((o, i) => {
      if (i !== optIdx) return o;
      return { ...o, values: [...(o.values || []), { id: '', option_id: o.id, name: '', price: 0, sort_order: (o.values || []).length, created_at: '' }] };
    }));
  };

  const updateOptionValue = (optIdx: number, valIdx: number, field: keyof MenuItemOptionValue, value: string | number) => {
    setOptions((prev) => prev.map((o, i) => {
      if (i !== optIdx) return o;
      return { ...o, values: (o.values || []).map((v, j) => (j === valIdx ? { ...v, [field]: value } : v)) };
    }));
  };

  const saveOptionValue = async (optIdx: number, valIdx: number) => {
    const opt = options[optIdx];
    const val = (opt.values || [])[valIdx];
    if (!val.name.trim()) {
      toast('Value name is required', 'warning');
      return;
    }
    if (!opt.id) {
      toast('Save the option group first', 'warning');
      return;
    }
    try {
      if (val.id) {
        const { error } = await supabase.from('menu_item_option_values').update({
          name: val.name, price: Number(val.price) || 0, sort_order: val.sort_order,
        }).eq('id', val.id);
        if (error) throw error;
        toast('Option value updated');
      } else {
        const { data, error } = await supabase.from('menu_item_option_values').insert({
          option_id: opt.id, name: val.name, price: Number(val.price) || 0, sort_order: val.sort_order,
        }).select().single();
        if (error) throw error;
        setOptions((prev) => prev.map((o, i) => {
          if (i !== optIdx) return o;
          return { ...o, values: (o.values || []).map((v, j) => (j === valIdx ? { ...v, id: data.id, option_id: opt.id } : v)) };
        }));
        toast('Option value added');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save value', 'error');
    }
  };

  const deleteOptionValue = async (optIdx: number, valIdx: number) => {
    const opt = options[optIdx];
    const val = (opt.values || [])[valIdx];
    try {
      if (val.id) {
        const { error } = await supabase.from('menu_item_option_values').delete().eq('id', val.id);
        if (error) throw error;
      }
      setOptions((prev) => prev.map((o, i) => {
        if (i !== optIdx) return o;
        return { ...o, values: (o.values || []).filter((_, j) => j !== valIdx) };
      }));
      toast('Option value deleted');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    }
  };

  if (loading) return <FullSpinner label="Loading menu items..." />;

  // Edit/Create form view
  if (editing || isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={cancelEdit} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{editing ? 'Edit Menu Item' : 'Add Menu Item'}</h1>
              <p className="text-sm text-gray-500">{editing ? editing.name : 'Create a new dish'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={cancelEdit} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={saveItem}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {editing ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Price (Birr) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Discounted Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.discounted_price ?? ''}
                    onChange={(e) => setForm({ ...form, discounted_price: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Leave empty for no discount"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={form.category_id || ''}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Sort Order</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Prep Time</label>
                  <input
                    type="text"
                    value={form.prep_time}
                    onChange={(e) => setForm({ ...form, prep_time: e.target.value })}
                    placeholder="e.g. 15 min"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Calories</label>
                  <input
                    type="text"
                    value={form.calories}
                    onChange={(e) => setForm({ ...form, calories: e.target.value })}
                    placeholder="e.g. 320 kcal"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Ingredients</label>
                  <input
                    type="text"
                    value={form.ingredients}
                    onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                    placeholder="Comma-separated list"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Option groups (only in edit mode) */}
            {editing && (
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Option Groups</h2>
                    <p className="text-sm text-gray-500">Add choices like size, spice level, or extras</p>
                  </div>
                  <button
                    onClick={addOptionGroup}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
                  >
                    <Plus className="h-4 w-4" /> Add Group
                  </button>
                </div>
                {loadingOptions ? (
                  <div className="flex justify-center py-6"><Spinner /></div>
                ) : options.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">No option groups yet. Add one to let customers customize this item.</p>
                ) : (
                  <div className="space-y-4">
                    {options.map((opt, optIdx) => (
                      <div key={optIdx} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="sm:col-span-3">
                              <label className="mb-1 block text-xs font-medium text-gray-500">Group Name</label>
                              <input
                                type="text"
                                value={opt.name}
                                onChange={(e) => updateOptionGroup(optIdx, 'name', e.target.value)}
                                placeholder="e.g. Size, Spice Level"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">Max Select</label>
                              <input
                                type="number"
                                min={1}
                                value={opt.max_select}
                                onChange={(e) => updateOptionGroup(optIdx, 'max_select', Number(e.target.value))}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">Sort Order</label>
                              <input
                                type="number"
                                value={opt.sort_order}
                                onChange={(e) => updateOptionGroup(optIdx, 'sort_order', Number(e.target.value))}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                            <div className="flex items-end pb-2">
                              <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={opt.required}
                                  onChange={(e) => updateOptionGroup(optIdx, 'required', e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                                />
                                Required
                              </label>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => saveOptionGroup(optIdx)}
                              className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50"
                              title="Save group"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteOptionGroup(optIdx)}
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                              title="Delete group"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Option values */}
                        <div className="mt-3 border-t border-gray-100 pt-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-medium uppercase text-gray-400">Values</p>
                            <button
                              onClick={() => addOptionValue(optIdx)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                            >
                              <Plus className="h-3 w-3" /> Add Value
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(opt.values || []).map((val, valIdx) => (
                              <div key={valIdx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={val.name}
                                  onChange={(e) => updateOptionValue(optIdx, valIdx, 'name', e.target.value)}
                                  placeholder="Value name"
                                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={val.price}
                                  onChange={(e) => updateOptionValue(optIdx, valIdx, 'price', Number(e.target.value))}
                                  placeholder="Price"
                                  className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                                <button
                                  onClick={() => saveOptionValue(optIdx, valIdx)}
                                  className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50"
                                  title="Save value"
                                >
                                  <Save className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteOptionValue(optIdx, valIdx)}
                                  className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                                  title="Delete value"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            {(opt.values || []).length === 0 && (
                              <p className="text-xs text-gray-400">No values yet.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar: image + flags */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <ImageUpload
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
                label="Item Image"
              />
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Flags</h3>
              <div className="space-y-3">
                {([
                  { key: 'is_available', label: 'Available' },
                  { key: 'is_vegetarian', label: 'Vegetarian' },
                  { key: 'is_spicy', label: 'Spicy' },
                  { key: 'is_new', label: 'New' },
                ] as const).map((flag) => (
                  <label key={flag.key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700">{flag.label}</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, [flag.key]: !form[flag.key] })}
                      className={`relative h-6 w-11 rounded-full transition-colors ${form[flag.key] ? 'bg-brand-500' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form[flag.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  const itemsByCategory = categories.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category_id === cat.id).sort((a, b) => a.sort_order - b.sort_order),
  }));
  const uncategorized = items.filter((i) => !i.category_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-sm text-gray-500">{items.length} items across {categories.length} categories</p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" /> Add Menu Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-400">No menu items yet. Click "Add Menu Item" to create your first dish.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {itemsByCategory.map(({ category, items: catItems }) => (
            <div key={category.id} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                className="flex w-full items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  {category.image && <img src={category.image} alt="" className="h-8 w-8 rounded object-cover" />}
                  <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{catItems.length}</span>
                </div>
                {expandedCategory === category.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>
              {expandedCategory === category.id && (
                <div className="divide-y divide-gray-50 border-t border-gray-100">
                  {catItems.length === 0 ? (
                    <p className="px-6 py-6 text-sm text-gray-400">No items in this category.</p>
                  ) : (
                    catItems.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveItem(item, 'up')} disabled={idx === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-30">
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button onClick={() => moveItem(item, 'down')} disabled={idx === catItems.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-30">
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                            <UtensilsCrossed className="h-5 w-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                            {item.is_new && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">New</span>}
                            {item.is_spicy && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">Spicy</span>}
                            {item.is_vegetarian && <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">Veg</span>}
                          </div>
                          <p className="truncate text-xs text-gray-500">{item.description || 'No description'}</p>
                        </div>
                        <div className="text-right">
                          {item.discounted_price ? (
                            <>
                              <p className="text-sm font-medium text-gray-900">{Number(item.discounted_price).toFixed(0)} Birr</p>
                              <p className="text-xs text-gray-400 line-through">{Number(item.price).toFixed(0)} Birr</p>
                            </>
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{Number(item.price).toFixed(0)} Birr</p>
                          )}
                        </div>
                        <label className="flex items-center gap-1.5 text-xs text-gray-600">
                          <button
                            onClick={() => toggleAvailable(item)}
                            className={`relative h-5 w-9 rounded-full transition-colors ${item.is_available ? 'bg-emerald-500' : 'bg-gray-200'}`}
                          >
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${item.is_available ? 'translate-x-4' : 'translate-x-0.5'}`} />
                          </button>
                        </label>
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(item)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(item)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
          {uncategorized.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === 'uncategorized' ? null : 'uncategorized')}
                className="flex w-full items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">Uncategorized</h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{uncategorized.length}</span>
                </div>
                {expandedCategory === 'uncategorized' ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>
              {expandedCategory === 'uncategorized' && (
                <div className="divide-y divide-gray-50 border-t border-gray-100">
                  {uncategorized.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                          <UtensilsCrossed className="h-5 w-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="truncate text-xs text-gray-500">{item.description || 'No description'}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{Number(item.price).toFixed(0)} Birr</p>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(item)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(item)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Menu Item?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will also remove all its option groups and values.`}
        onConfirm={deleteItem}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
