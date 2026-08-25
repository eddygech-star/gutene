import type { OrderStatus, PaymentStatus } from '@/types';

const orderStatusConfig: Record<OrderStatus, { label: string; color: string; dot: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  preparing: { label: 'Preparing', color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
  ready: { label: 'Ready', color: 'bg-cyan-100 text-cyan-800', dot: 'bg-cyan-500' },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string }> = {
  unpaid: { label: 'Unpaid', color: 'bg-red-100 text-red-800' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = orderStatusConfig[status] || orderStatusConfig.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = paymentStatusConfig[status] || paymentStatusConfig.unpaid;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

export const orderStatuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
export const paymentStatuses: PaymentStatus[] = ['unpaid', 'paid', 'pending'];
