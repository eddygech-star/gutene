import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Save, FolderTree, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { MenuCategory } from '@/types';
import { ImageUpload } from '@/components/ImageUpload';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FullSpinner, Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';

interface CategoriesProps {
  categories: MenuCategory[];
  onCategoriesRefresh: () => void;
}

const emptyForm = { name: '', description: '', image: '', sort_order: 0, is_active: true };

export function Categories({ categories, onCategoriesRefresh }: CategoriesProps) {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<MenuCategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuCategory | null>(null);
  const [deleteWarning, setDeleteWarning] = useState(false);
  const { toast } = useToast();

  const loadCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('menu_items').select('category_id');
      if (error) throw error;
      const c: Record<string, number> = {};
      (data || []).forEach((item) => {
        if (item.category_id) c[item.category_id] = (c[item.category_id] || 0) + 1;
      });
      setCounts(c);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const startCreate = () => {
    setForm({ ...emptyForm, sort_order: categories.length });
    setEditing(null);
    setIsCreating(true);
  };

  const startEdit = (cat: MenuCategory) => {
    setForm({
      name: cat.name,
      description: cat.description,
      image: cat.image,
      sort_order: cat.sort_order,
      is_active: cat.is_active,
    });
    setEditing(cat);
    setIsCreating(false);
  };

  const cancel = () => {
    setEditing(null);
    setIsCreating(false);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast('Category name is required', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('menu_categories').update(form).eq('id', editing.id);
        if (error) throw error;
        toast('Category updated');
      } else {
        const { error } = await supabase.from('menu_categories').insert(form);
        if (error) throw error;
        toast('Category created');
      }
      await onCategoriesRefresh();
      cancel();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cat: MenuCategory) => {
    try {
      const { error } = await supabase.from('menu_categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
      if (error) throw error;
      toast(`${cat.name} is now ${!cat.is_active ? 'active' : 'inactive'}`);
      onCategoriesRefresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update', 'error');
    }
  };

  const attemptDelete = (cat: MenuCategory) => {
    setDeleteTarget(cat);
    setDeleteWarning((counts[cat.id] || 0) > 0);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      // Unlink items first
      if ((counts[deleteTarget.id] || 0) > 0) {
        const { error: unlinkError } = await supabase
          .from('menu_items')
          .update({ category_id: null })
          .eq('category_id', deleteTarget.id);
        if (unlinkError) throw unlinkError;
      }
      const { error } = await supabase.from('menu_categories').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast('Category deleted');
      setDeleteTarget(null);
      await onCategoriesRefresh();
      await loadCounts();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    }
  };

  if (loading) return <FullSpinner label="Loading categories..." />;

  if (editing || isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={cancel} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{editing ? 'Edit Category' : 'Add Category'}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={cancel} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {editing ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </div>

        <div className="max-w-2xl space-y-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <ImageUpload value={form.image} onChange={(url) => setForm({ ...form, image: url })} label="Category Image" />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Sort Order</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-700">Active</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`relative h-6 w-11 rounded-full transition-colors ${form.is_active ? 'bg-brand-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories Management</h1>
          <p className="text-sm text-gray-500">{categories.length} categories</p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <FolderTree className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-400">No categories yet. Create one to organize your menu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...categories]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((cat) => (
              <div key={cat.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                        <FolderTree className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{cat.name}</h3>
                      <p className="text-xs text-gray-500">{counts[cat.id] || 0} items</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(cat)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${cat.is_active ? 'bg-emerald-500' : 'bg-gray-200'}`}
                    title={cat.is_active ? 'Active' : 'Inactive'}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${cat.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {cat.description && <p className="mt-3 text-sm text-gray-600">{cat.description}</p>}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => startEdit(cat)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => attemptDelete(cat)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Category?"
        message={
          deleteWarning ? (
            <>
              <p className="mb-2">This category has <strong>{counts[deleteTarget?.id || ''] || 0} menu items</strong>. Deleting it will unlink those items (they will become uncategorized but won't be deleted).</p>
              <p>Are you sure you want to continue?</p>
            </>
          ) : (
            `Are you sure you want to delete "${deleteTarget?.name}"?`
          )
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
