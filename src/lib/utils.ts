import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | { toDate?: () => Date }): string {
  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else {
      return 'Invalid date';
    }

    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    return format(dateObj, 'MMM d, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
}

export function formatDateTime(date: Date | string | { toDate?: () => Date }): string {
  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else {
      return 'Invalid date';
    }

    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    return format(dateObj, 'MMM d, yyyy h:mm a');
  } catch (error) {
    return 'Invalid date';
  }
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove the hash if present
  hex = hex.replace(/^#/, '');

  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function generateColorTints(baseHex: string, count: number): string[] {
  const hsl = hexToHSL(baseHex);
  const tints: string[] = [];

  for (let i = 0; i < count; i++) {
    const lightness = 90 - (i * (80 / count));
    tints.push(`hsl(${hsl.h}, ${hsl.s}%, ${lightness}%)`);
  }

  return tints;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}
