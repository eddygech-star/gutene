import { LayoutDashboard, ShoppingBag, UtensilsCrossed, FolderTree, Settings, ChefHat, X } from 'lucide-react';

export type PageId = 'dashboard' | 'orders' | 'menu' | 'categories' | 'settings';

interface SidebarProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
  isOpen: boolean;
  onClose: () => void;
  orderCount: number;
}

const navItems: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'menu', label: 'Menu Items', icon: UtensilsCrossed },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ current, onNavigate, isOpen, onClose, orderCount }: SidebarProps) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gray-900 text-gray-300 transition-transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-400 text-gray-900">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Gutene Kitchen</h1>
              <p className="text-xs text-gray-500">Admin Dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-400 text-gray-900'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
                {item.id === 'orders' && orderCount > 0 && (
                  <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                    {orderCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 px-6 py-4">
          <p className="text-xs text-gray-600">© 2026 Gutene Kitchen</p>
        </div>
      </aside>
    </>
  );
}
