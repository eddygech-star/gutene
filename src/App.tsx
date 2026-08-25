import { useEffect, useState } from 'react';
import CustomerSite from '@/customer/CustomerSite';
import { AdminDashboard } from '@/components/AdminDashboard';

function usePath(): string {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path;
}

export default function App() {
  const path = usePath();

  // Admin routes: /admin, /admin/dashboard, /admin/orders, etc.
  if (path === '/admin' || path.startsWith('/admin/')) {
    return <AdminDashboard />;
  }

  return <CustomerSite />;
}
