import { useState, type ReactNode } from 'react';
import { Instagram, Facebook, Send, MapPin, Phone, Mail, ShoppingBag, Menu as MenuIcon, X, Clock3 } from 'lucide-react';
import type { RestaurantSettings } from '@/types';
import { useCart } from './CartContext';

function SiteLink({ href, children, className, onClick }: { href: string; children: ReactNode; className?: string; onClick?: () => void }) {
  return <a href={href} className={className} onClick={onClick}>{children}</a>;
}

export function Header({ settings, onCart }: { settings: RestaurantSettings; onCart: () => void }) {
  const { itemCount } = useCart();
  const [open, setOpen] = useState(false);
  const links = [['/', 'Home'], ['/menu', 'Menu'], ['/about', 'Our Story'], ['/contact', 'Contact']];
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#fffdf8]/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <SiteLink href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          {settings.logo ? <img src={settings.logo} alt={settings.name} className="h-11 w-11 rounded-full object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-500 font-serif text-xl text-white">G</span>}
          <div><span className="block font-serif text-xl font-semibold tracking-tight text-stone-900">{settings.name || 'Gutene Kitchen'}</span><span className="hidden text-[10px] uppercase tracking-[0.24em] text-stone-500 sm:block">{settings.tagline || 'Made with intention'}</span></div>
        </SiteLink>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map(([href, label]) => <SiteLink key={href} href={href} className={`text-sm font-medium transition-colors ${window.location.pathname === href ? 'text-brand-700' : 'text-stone-600 hover:text-brand-700'}`}>{label}</SiteLink>)}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={onCart} className="relative rounded-full border border-stone-200 p-3 text-stone-700 transition hover:border-brand-400 hover:text-brand-700" aria-label="Open cart"><ShoppingBag className="h-5 w-5" />{itemCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{itemCount}</span>}</button>
          <button className="rounded-full p-3 text-stone-700 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}</button>
        </div>
      </div>
      {open && <nav className="border-t border-stone-200 bg-[#fffdf8] px-5 py-4 md:hidden">{links.map(([href, label]) => <SiteLink key={href} href={href} onClick={() => setOpen(false)} className="block border-b border-stone-100 py-3 text-sm font-medium text-stone-700 last:border-0">{label}</SiteLink>)}</nav>}
    </header>
  );
}

export function Footer({ settings }: { settings: RestaurantSettings }) {
  return <footer className="mt-24 bg-stone-950 text-stone-300"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8"><div><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-brand-500 font-serif text-lg text-white">G</span><span className="font-serif text-xl text-white">{settings.name || 'Gutene Kitchen'}</span></div><p className="max-w-xs text-sm leading-7 text-stone-400">{settings.description || 'Thoughtful food, warm hospitality, and a table that feels like home.'}</p><div className="mt-6 flex gap-3">{Object.entries(settings.social_links || {}).filter(([, url]) => url).map(([name, url]) => <a key={name} href={url as string} target="_blank" rel="noreferrer" className="rounded-full border border-stone-700 p-2.5 text-stone-300 hover:border-brand-400 hover:text-brand-300"><span className="sr-only">{name}</span>{name === 'instagram' ? <Instagram className="h-4 w-4" /> : name === 'facebook' ? <Facebook className="h-4 w-4" /> : <Send className="h-4 w-4" />}</a>)}</div></div><div><h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Explore</h3><div className="space-y-3 text-sm"><SiteLink href="/menu" className="block hover:text-white">Our menu</SiteLink><SiteLink href="/about" className="block hover:text-white">Our story</SiteLink><SiteLink href="/contact" className="block hover:text-white">Find us</SiteLink></div></div><div><h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Hours</h3><div className="flex items-start gap-2 text-sm text-stone-400"><Clock3 className="mt-0.5 h-4 w-4 text-brand-400" /><div>{Object.entries(settings.opening_hours || {}).slice(0, 3).map(([day, hours]) => <p key={day} className="mb-2 capitalize">{day}: {hours as string}</p>)}</div></div></div><div><h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Contact</h3><div className="space-y-4 text-sm text-stone-400">{settings.address && <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-brand-400" />{settings.address}</p>}{settings.phone && <a href={`tel:${settings.phone}`} className="flex gap-2 hover:text-white"><Phone className="h-4 w-4 text-brand-400" />{settings.phone}</a>}{settings.email && <a href={`mailto:${settings.email}`} className="flex gap-2 hover:text-white"><Mail className="h-4 w-4 text-brand-400" />{settings.email}</a>}</div></div></div><div className="border-t border-stone-800 py-5 text-center text-xs text-stone-500"><p>© {new Date().getFullYear()} {settings.name || 'Gutene Kitchen'}. All rights reserved.</p><a href="/admin" className="mt-2 inline-block text-stone-600 hover:text-brand-400">Staff login</a></div></footer>;
}

export function LoadingState() { return <div className="grid min-h-[60vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" /></div>; }
