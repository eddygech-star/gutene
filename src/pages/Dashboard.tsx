import { useEffect, useState } from 'react';
import { ShoppingBag, DollarSign, Clock, UtensilsCrossed, TrendingUp, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/types';
import { OrderStatusBadge, orderStatuses } from '@/components/StatusBadge';
import { FullSpinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';

interface DashboardProps {
  onNavigateToOrders: () => void;
}

export function Dashboard({ onNavigateToOrders }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalMenuItems, setTotalMenuItems] = useState(0);
  const [weekRevenue, setWeekRevenue] = useState<{ day: string; revenue: number; orders: number }[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadDashboard();
    const channel = supabase
      .channel('dashboard-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadDashboard())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadDashboard = async () => {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOf7DaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString();

      const [todayRes, menuRes, weekRes] = await Promise.all([
        supabase.from('orders').select('*').gte('created_at', startOfToday).order('created_at', { ascending: false }),
        supabase.from('menu_items').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('total, status, created_at').gte('created_at', startOf7DaysAgo),
      ]);

      if (todayRes.error) throw todayRes.error;
      if (menuRes.error) throw menuRes.error;
      if (weekRes.error) throw weekRes.error;

      const todayData = todayRes.data || [];
      setTodayOrders(todayData);
      setTodayRevenue(todayData.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + Number(o.total), 0));
      setPendingCount(todayData.filter(o => o.status === 'pending').length);
      setTotalMenuItems(menuRes.count || 0);

      // Week revenue
      const days: { day: string; revenue: number; orders: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
        const dayOrders = (weekRes.data || []).filter(
          (o) => new Date(o.created_at) >= dayStart && new Date(o.created_at) < dayEnd && o.status !== 'cancelled'
        );
        days.push({
          day: dayStart.toLocaleDateString('en', { weekday: 'short' }),
          revenue: dayOrders.reduce((sum, o) => sum + Number(o.total), 0),
          orders: dayOrders.length,
        });
      }
      setWeekRevenue(days);

      // Status breakdown (all orders)
      const breakdown: Record<string, number> = {};
      orderStatuses.forEach((s) => (breakdown[s] = 0));
      (weekRes.data || []).forEach((o) => {
        if (breakdown[o.status] !== undefined) breakdown[o.status]++;
      });
      setStatusBreakdown(breakdown);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const quickStatusChange = async (orderId: string, status: OrderStatus) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(`Order status updated to ${status}`);
    }
  };

  if (loading) return <FullSpinner label="Loading dashboard..." />;

  const maxRevenue = Math.max(...weekRevenue.map((d) => d.revenue), 1);
  const stats = [
    { label: "Today's Orders", value: todayOrders.length, icon: ShoppingBag, color: 'bg-blue-500' },
    { label: "Today's Revenue", value: `${todayRevenue.toFixed(0)} Birr`, icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Pending Orders', value: pendingCount, icon: Clock, color: 'bg-amber-500' },
    { label: 'Menu Items', value: totalMenuItems, icon: UtensilsCrossed, color: 'bg-slate-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-sm text-gray-500">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Revenue (Last 7 Days)</h2>
              <p className="text-sm text-gray-500">Daily revenue from non-cancelled orders</p>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex h-48 items-end justify-between gap-2">
            {weekRevenue.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-brand-500 to-brand-300 transition-all hover:from-brand-600 hover:to-brand-400"
                    style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: d.revenue > 0 ? '8px' : '2px' }}
                    title={`${d.revenue.toFixed(0)} Birr - ${d.orders} orders`}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Status</h2>
          <div className="space-y-3">
            {orderStatuses.map((status) => {
              const count = statusBreakdown[status] || 0;
              const total = Object.values(statusBreakdown).reduce((a, b) => a + b, 0) || 1;
              const pct = (count / total) * 100;
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between">
                    <OrderStatusBadge status={status} />
                    <span className="text-sm font-medium text-gray-700">{count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-brand-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          <button
            onClick={onNavigateToOrders}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View all <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3">Order #</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Quick Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {todayOrders.slice(0, 10).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{order.order_number}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{order.customer_name || 'Walk-in'}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{Number(order.total).toFixed(0)} Birr</td>
                  <td className="px-6 py-3"><OrderStatusBadge status={order.status} /></td>
                  <td className="px-6 py-3">
                    <select
                      value={order.status}
                      onChange={(e) => quickStatusChange(order.id, e.target.value as OrderStatus)}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      {orderStatuses.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {todayOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                    No orders today yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
