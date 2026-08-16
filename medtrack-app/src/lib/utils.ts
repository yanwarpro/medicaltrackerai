import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInYears, differenceInDays, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDate(dateStr: string | undefined, fmt = 'dd MMM yyyy'): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), fmt, { locale: localeId });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | undefined): string {
  return formatDate(dateStr, 'dd/MM/yyyy');
}

export function calcAge(dateOfBirth: string): number {
  try {
    return differenceInYears(new Date(), parseISO(dateOfBirth));
  } catch {
    return 0;
  }
}

export function daysBetween(date1: string, date2: string): number {
  try {
    return Math.abs(differenceInDays(parseISO(date1), parseISO(date2)));
  } catch {
    return 0;
  }
}

export function calcDelta(current: number, previous: number): { abs: number; pct: number; trend: 'up' | 'down' | 'stable' } {
  const abs = current - previous;
  const pct = previous !== 0 ? (abs / previous) * 100 : 0;
  const trend = Math.abs(abs) < 0.001 ? 'stable' : abs > 0 ? 'up' : 'down';
  return { abs, pct, trend };
}

export function getAbnormalColor(flag: string | null): string {
  if (!flag) return '';
  if (flag === 'HH' || flag === 'LL') return 'text-red-400';
  if (flag === 'H') return 'text-yellow-400';
  if (flag === 'L') return 'text-blue-400';
  return '';
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function base64ToMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.]+);base64,/);
  return match ? match[1] : 'application/octet-stream';
}

export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(decimals);
}

export function truncate(str: string, maxLength = 40): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

export function isMedicationName(name: string): boolean {
  if (!name) return false;
  const upper = name.toUpperCase();
  if (/\b(TABLET|TAB|CAPSUL|CAPSULE|KAPSUL|SYRUP|SIRUP|AMPUL|VIAL|INJEKSI|INJECTION|SUPP|CREAM|KRIM|SALEP|DROPS|INFUS)\b/.test(upper)) {
    return true;
  }
  if (/\d+\s*(MG|MCG|IU|GR|ML)\b/.test(upper)) {
    return true;
  }
  const knownMeds = [
    'DOMPERIDON', 'LANSOPRAZOL', 'ALLOPURINOL', 'ASAM FOLAT', 'PARACETAMOL',
    'AMLODIPINE', 'CANDESARTAN', 'SIMVASTATIN', 'METFORMIN', 'FUROSEMIDE',
    'SPIRONOLACTONE', 'OMEPRAZOL', 'RANITIDINE', 'BICNAT', 'KETOSTERIL', 'NEUROBION'
  ];
  return knownMeds.some((m) => upper.includes(m));
}
