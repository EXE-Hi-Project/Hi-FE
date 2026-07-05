import type { ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import { Camera } from '@phosphor-icons/react/dist/csr/Camera';
import { Coffee } from '@phosphor-icons/react/dist/csr/Coffee';
import { Compass } from '@phosphor-icons/react/dist/csr/Compass';
import { ForkKnife } from '@phosphor-icons/react/dist/csr/ForkKnife';
import { Heart } from '@phosphor-icons/react/dist/csr/Heart';
import { Park } from '@phosphor-icons/react/dist/csr/Park';
import { Storefront } from '@phosphor-icons/react/dist/csr/Storefront';
import { Ticket } from '@phosphor-icons/react/dist/csr/Ticket';
import type { CouplePlaceCategory } from '../../types/shared';

export type PlaceCategoryMeta = {
  label: string;
  color: string;
  soft: string;
  activeClass: string;
  Icon: ComponentType<IconProps>;
};

export const PLACE_CATEGORY_META: Record<CouplePlaceCategory, PlaceCategoryMeta> = {
  FOOD: { label: 'Ăn uống', color: '#f97316', soft: 'rgba(249,115,22,.14)', activeClass: 'bg-orange-500 text-white shadow-sm', Icon: ForkKnife },
  CAFE: { label: 'Cafe', color: '#b45309', soft: 'rgba(180,83,9,.14)', activeClass: 'bg-amber-700 text-white shadow-sm', Icon: Coffee },
  DATE_SPOT: { label: 'Hẹn hò', color: '#f43f5e', soft: 'rgba(244,63,94,.14)', activeClass: 'bg-rose-500 text-white shadow-sm', Icon: Heart },
  ENTERTAINMENT: { label: 'Vui chơi', color: '#8b5cf6', soft: 'rgba(139,92,246,.14)', activeClass: 'bg-violet-500 text-white shadow-sm', Icon: Ticket },
  CINEMA: { label: 'Rạp phim', color: '#ef4444', soft: 'rgba(239,68,68,.14)', activeClass: 'bg-red-500 text-white shadow-sm', Icon: Camera },
  PARK: { label: 'Công viên', color: '#10b981', soft: 'rgba(16,185,129,.14)', activeClass: 'bg-emerald-500 text-white shadow-sm', Icon: Park },
  SHOPPING: { label: 'Mua sắm', color: '#0ea5e9', soft: 'rgba(14,165,233,.14)', activeClass: 'bg-sky-500 text-white shadow-sm', Icon: Storefront },
  OTHER: { label: 'Khác', color: '#64748b', soft: 'rgba(100,116,139,.14)', activeClass: 'bg-slate-500 text-white shadow-sm', Icon: Compass },
};

export const PLACE_CATEGORY_ORDER: CouplePlaceCategory[] = [
  'FOOD',
  'CAFE',
  'DATE_SPOT',
  'ENTERTAINMENT',
  'CINEMA',
  'PARK',
  'SHOPPING',
  'OTHER',
];
