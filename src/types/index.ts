export interface RestaurantSettings {
  id: number;
  name: string;
  tagline: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
  hero_bg: string;
  logo: string;
  cta_buttons: CtaButton[];
  enable_delivery: boolean;
  enable_pickup: boolean;
  enable_dinein: boolean;
  primary_color: string;
  minimum_order: number;
  social_links: SocialLinks;
  is_open: boolean;
  opening_hours: OpeningHours;
  map_location: MapLocation;
  payment_settings: PaymentSettings;
  created_at: string;
  updated_at: string;
}

export interface CtaButton {
  label: string;
  link: string;
  style: 'primary' | 'secondary';
}

export interface SocialLinks {
  instagram: string;
  facebook: string;
  telegram: string;
}

export interface OpeningHours {
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
  sun: string;
}

export interface MapLocation {
  lat: number;
  lng: number;
  zoom: number;
}

export interface PaymentSettings {
  telebir_qr: string;
  telebir_phone: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  enable_telebir: boolean;
  enable_bank: boolean;
  enable_cash: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string;
  image: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  item_count?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  discounted_price: number | null;
  category_id: string | null;
  prep_time: string;
  calories: string;
  is_vegetarian: boolean;
  is_spicy: boolean;
  is_new: boolean;
  is_available: boolean;
  ingredients: string;
  image: string;
  sort_order: number;
  created_at: string;
  category?: MenuCategory;
  options?: MenuItemOption[];
}

export interface MenuItemOption {
  id: string;
  item_id: string;
  name: string;
  required: boolean;
  max_select: number;
  sort_order: number;
  created_at: string;
  values?: MenuItemOptionValue[];
}

export interface MenuItemOptionValue {
  id: string;
  option_id: string;
  name: string;
  price: number;
  sort_order: number;
  created_at: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'pending';

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  order_type: string;
  table_number: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: PaymentStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string;
  payment_screenshot: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  item_price: number;
  quantity: number;
  selected_options: SelectedOption[];
  line_total: number;
  created_at: string;
}

export interface SelectedOption {
  group_name: string;
  value_name: string;
  price: number;
}
