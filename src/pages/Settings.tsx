import { useEffect, useState, useCallback } from 'react';
import { Save, Store, Image as ImageIcon, Truck, MapPin, CreditCard, Share2, Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { RestaurantSettings, CtaButton, OpeningHours, PaymentSettings, SocialLinks, MapLocation } from '@/types';
import { ImageUpload } from '@/components/ImageUpload';
import { FullSpinner, Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';

type TabId = 'general' | 'hero' | 'fulfillment' | 'location' | 'payment' | 'social';

const tabs: { id: TabId; label: string; icon: typeof Store }[] = [
  { id: 'general', label: 'General Info', icon: Store },
  { id: 'hero', label: 'Hero Section', icon: ImageIcon },
  { id: 'fulfillment', label: 'Fulfillment', icon: Truck },
  { id: 'location', label: 'Location & Map', icon: MapPin },
  { id: 'payment', label: 'Payment Methods', icon: CreditCard },
  { id: 'social', label: 'Social Links', icon: Share2 },
];

const days: { key: keyof OpeningHours; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('restaurant_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      if (data) {
        setSettings(data as RestaurantSettings);
      } else {
        // Create default row
        const { data: created, error: createErr } = await supabase
          .from('restaurant_settings')
          .insert({ id: 1 })
          .select('*')
          .single();
        if (createErr) throw createErr;
        setSettings(created as RestaurantSettings);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      setLoadError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(settings).filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key)));
      const { error } = await supabase.from('restaurant_settings').update(payload).eq('id', 1);
      if (error) throw error;
      toast('Settings saved successfully');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FullSpinner label="Loading settings..." />;
  if (!settings) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-800">
        {loadError || 'Settings could not be loaded.'}
      </div>
    );
  }

  const update = <K extends keyof RestaurantSettings>(key: K, value: RestaurantSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your restaurant configuration</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        {activeTab === 'general' && <GeneralTab settings={settings} update={update} />}
        {activeTab === 'hero' && <HeroTab settings={settings} update={update} />}
        {activeTab === 'fulfillment' && <FulfillmentTab settings={settings} update={update} />}
        {activeTab === 'location' && <LocationTab settings={settings} update={update} />}
        {activeTab === 'payment' && <PaymentTab settings={settings} update={update} />}
        {activeTab === 'social' && <SocialTab settings={settings} update={update} />}
      </div>
    </div>
  );
}

// ===== General Tab =====
function GeneralTab({ settings, update }: { settings: RestaurantSettings; update: <K extends keyof RestaurantSettings>(k: K, v: RestaurantSettings[K]) => void }) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">General Information</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Restaurant Name">
          <input type="text" value={settings.name} onChange={(e) => update('name', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Tagline">
          <input type="text" value={settings.tagline} onChange={(e) => update('tagline', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Phone" full>
          <input type="text" value={settings.phone} onChange={(e) => update('phone', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Email">
          <input type="email" value={settings.email} onChange={(e) => update('email', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Address">
          <input type="text" value={settings.address} onChange={(e) => update('address', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Description" full>
          <textarea value={settings.description} onChange={(e) => update('description', e.target.value)} rows={3} className={inputCls} />
        </Field>
      </div>

      <ImageUpload value={settings.logo} onChange={(url) => update('logo', url)} label="Logo" />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Primary Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={settings.primary_color}
            onChange={(e) => update('primary_color', e.target.value)}
            className="h-10 w-16 rounded-lg border border-gray-200 cursor-pointer"
          />
          <input
            type="text"
            value={settings.primary_color}
            onChange={(e) => update('primary_color', e.target.value)}
            className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Opening Hours</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {days.map((day) => (
            <div key={day.key} className="flex items-center gap-3">
              <span className="w-24 text-sm text-gray-600">{day.label}</span>
              <input
                type="text"
                value={settings.opening_hours[day.key] || ''}
                onChange={(e) => update('opening_hours', { ...settings.opening_hours, [day.key]: e.target.value } as OpeningHours)}
                placeholder="9:00-22:00 or Closed"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          ))}
        </div>
      </div>

      <Toggle
        label="Restaurant is Open"
        checked={settings.is_open}
        onChange={(v) => update('is_open', v)}
      />
    </div>
  );
}

// ===== Hero Tab =====
function HeroTab({ settings, update }: { settings: RestaurantSettings; update: <K extends keyof RestaurantSettings>(k: K, v: RestaurantSettings[K]) => void }) {
  const buttons = settings.cta_buttons || [];
  const updateButtons = (btns: CtaButton[]) => update('cta_buttons', btns);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Hero Section</h2>
      <ImageUpload value={settings.hero_bg} onChange={(url) => update('hero_bg', url)} label="Hero Background Image" />
      <Field label="Hero Title" full>
        <input type="text" value={settings.hero_title} onChange={(e) => update('hero_title', e.target.value)} className={inputCls} />
      </Field>
      <Field label="Hero Subtitle" full>
        <input type="text" value={settings.hero_subtitle} onChange={(e) => update('hero_subtitle', e.target.value)} className={inputCls} />
      </Field>
      <Field label="Hero Description" full>
        <textarea value={settings.hero_description} onChange={(e) => update('hero_description', e.target.value)} rows={3} className={inputCls} />
      </Field>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">CTA Buttons</h3>
          <button
            onClick={() => updateButtons([...buttons, { label: '', link: '', style: 'primary' }])}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
          >
            <Plus className="h-3.5 w-3.5" /> Add Button
          </button>
        </div>
        <div className="space-y-3">
          {buttons.map((btn, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg border border-gray-200 p-3">
              <GripVertical className="h-4 w-4 text-gray-300" />
              <input
                type="text"
                value={btn.label}
                onChange={(e) => updateButtons(buttons.map((b, i) => (i === idx ? { ...b, label: e.target.value } : b)))}
                placeholder="Label"
                className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <input
                type="text"
                value={btn.link}
                onChange={(e) => updateButtons(buttons.map((b, i) => (i === idx ? { ...b, link: e.target.value } : b)))}
                placeholder="Link URL"
                className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <select
                value={btn.style}
                onChange={(e) => updateButtons(buttons.map((b, i) => (i === idx ? { ...b, style: e.target.value as 'primary' | 'secondary' } : b)))}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </select>
                <button
                  onClick={() => updateButtons(buttons.filter((_, i) => i !== idx))}
                  className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                  title="Remove button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
            </div>
          ))}
          {buttons.length === 0 && <p className="text-sm text-gray-400">No CTA buttons yet. Add one to display call-to-action buttons on your hero section.</p>}
        </div>
      </div>
    </div>
  );
}

// ===== Fulfillment Tab =====
function FulfillmentTab({ settings, update }: { settings: RestaurantSettings; update: <K extends keyof RestaurantSettings>(k: K, v: RestaurantSettings[K]) => void }) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Fulfillment Options</h2>
      <Toggle label="Enable Delivery" checked={settings.enable_delivery} onChange={(v) => update('enable_delivery', v)} />
      <Toggle label="Enable Pickup" checked={settings.enable_pickup} onChange={(v) => update('enable_pickup', v)} />
      <Toggle label="Enable Dine-in" checked={settings.enable_dinein} onChange={(v) => update('enable_dinein', v)} />
      <Field label="Minimum Order Amount (Birr)">
        <input
          type="number"
          step="0.01"
          value={settings.minimum_order}
          onChange={(e) => update('minimum_order', Number(e.target.value))}
          className={inputCls}
        />
      </Field>
    </div>
  );
}

// ===== Location Tab =====
function LocationTab({ settings, update }: { settings: RestaurantSettings; update: <K extends keyof RestaurantSettings>(k: K, v: RestaurantSettings[K]) => void }) {
  const mapLoc = settings.map_location;
  const updateLoc = (patch: Partial<MapLocation>) => update('map_location', { ...mapLoc, ...patch });

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapLoc.lng - 0.01},${mapLoc.lat - 0.01},${mapLoc.lng + 0.01},${mapLoc.lat + 0.01}&layer=mapnik&marker=${mapLoc.lat},${mapLoc.lng}`;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Location & Map</h2>
      <Field label="Address" full>
        <input type="text" value={settings.address} onChange={(e) => update('address', e.target.value)} className={inputCls} />
      </Field>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Map Position</h3>
        <p className="mb-3 text-sm text-gray-500">Use the manual latitude and longitude fields below to set your restaurant's location.</p>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <iframe
            title="Map"
            src={mapUrl}
            className="h-64 w-full"
            style={{ border: 0 }}
            loading="lazy"
          />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Tip: To pick a precise location, use the manual latitude/longitude inputs below or drag the map to your spot.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Latitude">
          <input
            type="number"
            step="0.0001"
            value={mapLoc.lat}
            onChange={(e) => updateLoc({ lat: Number(e.target.value) })}
            className={inputCls}
          />
        </Field>
        <Field label="Longitude">
          <input
            type="number"
            step="0.0001"
            value={mapLoc.lng}
            onChange={(e) => updateLoc({ lng: Number(e.target.value) })}
            className={inputCls}
          />
        </Field>
        <Field label="Zoom Level">
          <input
            type="number"
            min={1}
            max={20}
            value={mapLoc.zoom}
            onChange={(e) => updateLoc({ zoom: Number(e.target.value) })}
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  );
}

// ===== Payment Tab =====
function PaymentTab({ settings, update }: { settings: RestaurantSettings; update: <K extends keyof RestaurantSettings>(k: K, v: RestaurantSettings[K]) => void }) {
  const ps = settings.payment_settings;
  const updatePs = (patch: Partial<PaymentSettings>) => update('payment_settings', { ...ps, ...patch });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>

      {/* Telebir */}
      <div className="rounded-lg border border-gray-200 p-4">
        <Toggle label="Telebir" checked={ps.enable_telebir} onChange={(v) => updatePs({ enable_telebir: v })} />
        {ps.enable_telebir && (
          <div className="mt-4 space-y-4">
            <ImageUpload value={ps.telebir_qr} onChange={(url) => updatePs({ telebir_qr: url })} label="Telebir QR Code" />
            <Field label="Telebir Phone Number">
              <input type="text" value={ps.telebir_phone} onChange={(e) => updatePs({ telebir_phone: e.target.value })} className={inputCls} />
            </Field>
          </div>
        )}
      </div>

      {/* Bank Transfer */}
      <div className="rounded-lg border border-gray-200 p-4">
        <Toggle label="Bank Transfer" checked={ps.enable_bank} onChange={(v) => updatePs({ enable_bank: v })} />
        {ps.enable_bank && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Bank Name">
              <input type="text" value={ps.bank_name} onChange={(e) => updatePs({ bank_name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Account Name">
              <input type="text" value={ps.bank_account_name} onChange={(e) => updatePs({ bank_account_name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Account Number">
              <input type="text" value={ps.bank_account_number} onChange={(e) => updatePs({ bank_account_number: e.target.value })} className={inputCls} />
            </Field>
          </div>
        )}
      </div>

      {/* Cash */}
      <div className="rounded-lg border border-gray-200 p-4">
        <Toggle label="Cash on Delivery" checked={ps.enable_cash} onChange={(v) => updatePs({ enable_cash: v })} />
      </div>

      {/* Preview */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Customer Preview</h3>
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="mb-3 text-sm text-gray-600">Available payment options customers will see:</p>
          <div className="flex flex-wrap gap-2">
            {ps.enable_telebir && <span className="rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">Telebir</span>}
            {ps.enable_bank && <span className="rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">Bank Transfer</span>}
            {ps.enable_cash && <span className="rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">Cash on Delivery</span>}
            {!ps.enable_telebir && !ps.enable_bank && !ps.enable_cash && (
              <span className="text-sm text-gray-400">No payment methods enabled.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Social Tab =====
function SocialTab({ settings, update }: { settings: RestaurantSettings; update: <K extends keyof RestaurantSettings>(k: K, v: RestaurantSettings[K]) => void }) {
  const sl = settings.social_links;
  const updateSl = (patch: Partial<SocialLinks>) => update('social_links', { ...sl, ...patch });

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Social Links</h2>
      <Field label="Instagram URL" full>
        <input type="url" value={sl.instagram} onChange={(e) => updateSl({ instagram: e.target.value })} placeholder="https://instagram.com/..." className={inputCls} />
      </Field>
      <Field label="Facebook URL" full>
        <input type="url" value={sl.facebook} onChange={(e) => updateSl({ facebook: e.target.value })} placeholder="https://facebook.com/..." className={inputCls} />
      </Field>
      <Field label="Telegram URL" full>
        <input type="url" value={sl.telegram} onChange={(e) => updateSl({ telegram: e.target.value })} placeholder="https://t.me/..." className={inputCls} />
      </Field>
    </div>
  );
}

// ===== Shared components =====
const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-brand-500' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}
