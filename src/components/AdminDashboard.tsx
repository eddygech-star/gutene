import { useCallback, useEffect, useState } from 'react';
import { Menu as MenuIcon, X, ExternalLink } from 'lucide-react';
import { Sidebar, type PageId } from '@/components/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { Orders } from '@/pages/Orders';
import { Menu } from '@/pages/Menu';
import { Categories } from '@/pages/Categories';
import { Settings } from '@/pages/Settings';
import { supabase } from '@/lib/supabase';
import type { MenuCategory } from '@/types';

export function AdminDashboard() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from('menu_categories').select('*').order('sort_order');
    if (data) setCategories(data as MenuCategory[]);
  }, []);

  const loadPendingCount = useCallback(async () => {
    const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    setPendingCount(count || 0);
  }, []);

  useEffect(() => {
    loadCategories();
    loadPendingCount();
    const channel = supabase
      .channel('admin-pending-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadPendingCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadCategories, loadPendingCount]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        current={page}
        onNavigate={setPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        orderCount={pendingCount}
      />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between bg-gray-900 px-4 py-3 text-white lg:hidden">
        <button onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <MenuIcon className="h-6 w-6" />
        </button>
        <span className="text-sm font-semibold">Gutene Kitchen — Admin</span>
        <a href="/" className="flex items-center gap-1 text-xs text-gray-300 hover:text-white">
          View site <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <main className="lg:pl-64">
        {/* Desktop top bar */}
        <div className="hidden items-center justify-end border-b border-gray-100 bg-white px-8 py-3 lg:flex">
          <a href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand-600">
            <ExternalLink className="h-4 w-4" /> View public site
          </a>
        </div>
        <div className="p-4 lg:p-8">
          {page === 'dashboard' && <Dashboard onNavigateToOrders={() => setPage('orders')} />}
          {page === 'orders' && <Orders />}
          {page === 'menu' && <Menu categories={categories} onCategoriesRefresh={loadCategories} />}
          {page === 'categories' && <Categories categories={categories} onCategoriesRefresh={loadCategories} />}
          {page === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}
