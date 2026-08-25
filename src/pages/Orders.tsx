import { useCallback, useEffect, useState } from 'react';
import { Search, Download, Trash2, Eye, X, ChevronLeft, ChevronRight, ShoppingBag, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Order, OrderItem, OrderStatus, PaymentStatus } from '@/types';
import { PaymentStatusBadge, orderStatuses, paymentStatuses } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FullSpinner, Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';

const PAGE_SIZE = 10;

export function Orders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('orders').select('*', { count: 'exact' });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte('created_at', end.toISOString());
      }
      if (search.trim()) {
        query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      }

      query = query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      setOrders(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo, search, page, toast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadOrders]);

  const openOrder = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setOrderItems(data || []);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load order items', 'error');
    } finally {
      setLoadingItems(false);
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    setUpdating(id);
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      if (selectedOrder?.id === id) setSelectedOrder((prev) => prev ? { ...prev, status } : null);
      toast(`Order status updated to ${status}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const updatePaymentStatus = async (id: string, payment_status: PaymentStatus) => {
    setUpdating(id);
    try {
      const { error } = await supabase.from('orders').update({ payment_status }).eq('id', id);
      if (error) throw error;
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, payment_status } : o)));
      if (selectedOrder?.id === id) setSelectedOrder((prev) => prev ? { ...prev, payment_status } : null);
      toast(`Payment status updated to ${payment_status}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const deleteOrder = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('orders').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      toast('Order deleted');
      setDeleteTarget(null);
      if (selectedOrder?.id === deleteTarget.id) setSelectedOrder(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete order', 'error');
    }
  };

  const exportCSV = () => {
    const headers = ['Order #', 'Customer', 'Phone', 'Email', 'Address', 'Type', 'Table', 'Status', 'Payment Method', 'Payment Status', 'Subtotal', 'Delivery Fee', 'Total', 'Notes', 'Created At'];
    const rows = orders.map((o) => [
      o.order_number, o.customer_name, o.customer_phone, o.customer_email, o.customer_address,
      o.order_type, o.table_number, o.status, o.payment_method, o.payment_status,
      o.subtotal, o.delivery_fee, o.total, o.notes, new Date(o.created_at).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Orders exported as CSV');
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500">{totalCount} total orders</p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search order #, name, phone..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as OrderStatus | 'all'); setPage(0); }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Statuses</option>
            {orderStatuses.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); setDateFrom(''); setDateTo(''); setPage(0); }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Orders table */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <FullSpinner label="Loading orders..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">Order #</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Payment</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{order.order_number}</td>
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-gray-900">{order.customer_name || 'Walk-in'}</p>
                      <p className="text-xs text-gray-500">{order.customer_phone}</p>
                    </td>
                    <td className="px-6 py-3 text-sm capitalize text-gray-700">{order.order_type}</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{Number(order.total).toFixed(0)} Birr</td>
                    <td className="px-6 py-3">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                        disabled={updating === order.id}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                      >
                        {orderStatuses.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3"><PaymentStatusBadge status={order.payment_status} /></td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}<br />
                      <span className="text-xs">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openOrder(order)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(order)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                          title="Delete order"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <ShoppingBag className="mx-auto h-10 w-10 text-gray-300" />
                      <p className="mt-2 text-sm text-gray-400">No orders found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-sm text-gray-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl animate-scale-in">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedOrder.order_number}</h2>
                <p className="text-sm text-gray-500">{new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-400">Customer</p>
                  <p className="text-sm text-gray-900">{selectedOrder.customer_name || 'Walk-in'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-400">Phone</p>
                  <p className="text-sm text-gray-900">{selectedOrder.customer_phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-400">Email</p>
                  <p className="text-sm text-gray-900">{selectedOrder.customer_email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-400">Order Type</p>
                  <p className="text-sm capitalize text-gray-900">{selectedOrder.order_type}{selectedOrder.table_number ? ` (Table ${selectedOrder.table_number})` : ''}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium uppercase text-gray-400">Address</p>
                  <p className="text-sm text-gray-900">{selectedOrder.customer_address || '—'}</p>
                </div>
                {selectedOrder.notes && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium uppercase text-gray-400">Notes</p>
                    <p className="text-sm text-gray-900">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Order Items</h3>
                {loadingItems ? (
                  <div className="flex justify-center py-6"><Spinner /></div>
                ) : (
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div key={item.id} className="rounded-lg border border-gray-100 p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.quantity}× {item.item_name}</p>
                            <p className="text-xs text-gray-500">{Number(item.item_price).toFixed(0)} Birr each</p>
                            {item.selected_options && item.selected_options.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.selected_options.map((opt, i) => (
                                  <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                    {opt.group_name}: {opt.value_name}{opt.price > 0 ? ` (+${opt.price})` : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{Number(item.line_total).toFixed(0)} Birr</p>
                        </div>
                      </div>
                    ))}
                    {orderItems.length === 0 && <p className="text-sm text-gray-400">No items found.</p>}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>{Number(selectedOrder.subtotal).toFixed(0)} Birr</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery Fee</span><span>{Number(selectedOrder.delivery_fee).toFixed(0)} Birr</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                  <span>Total</span><span>{Number(selectedOrder.total).toFixed(0)} Birr</span>
                </div>
              </div>

              {/* Payment screenshot */}
              {selectedOrder.payment_screenshot && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">Payment Screenshot</h3>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <img src={selectedOrder.payment_screenshot} alt="Payment receipt" className="w-full object-contain" />
                  </div>
                  <a href={selectedOrder.payment_screenshot} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                      <ExternalLink className="h-3 w-3" /> Open full size
                    </a>
                </div>
              )}

              {/* Status controls */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-gray-400">Order Status</label>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                    disabled={updating === selectedOrder.id}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                  >
                    {orderStatuses.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-gray-400">Payment Status</label>
                  <select
                    value={selectedOrder.payment_status}
                    onChange={(e) => updatePaymentStatus(selectedOrder.id, e.target.value as PaymentStatus)}
                    disabled={updating === selectedOrder.id}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                  >
                    {paymentStatuses.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500">Payment Method:</span>
                <span className="font-medium capitalize text-gray-900">{selectedOrder.payment_method}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Order?"
        message={`Are you sure you want to delete order ${deleteTarget?.order_number}? This action cannot be undone.`}
        onConfirm={deleteOrder}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
