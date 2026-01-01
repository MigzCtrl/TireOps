import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const hours = parts[0];
  const minutes = parts[1];
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'pm' : 'am';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${minutes}${ampm}`;
}
