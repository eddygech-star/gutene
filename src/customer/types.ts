import type { MenuItem, MenuItemOption, MenuItemOptionValue, RestaurantSettings, SelectedOption } from '@/types';

export interface CartLine {
  id: string;
  item: MenuItem;
  quantity: number;
  selectedOptions: SelectedOption[];
  optionsKey: string;
  unitPrice: number;
}

export interface CustomerSiteData {
  settings: RestaurantSettings;
  categories: MenuItem['category'][];
  items: MenuItem[];
}

export type { MenuItemOption, MenuItemOptionValue };
