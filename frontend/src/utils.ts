import type { TimeFilter } from './types';

export function localDate(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function initialFilter(): TimeFilter {
  const date = new Date();
  const hour = date.getHours();
  if (hour >= 16) date.setDate(date.getDate() + 1);
  return { date: localDate(date), start: hour >= 9 && hour < 16 ? `${String(hour + 1).padStart(2, '0')}:00` : '09:00', end: '17:00' };
}

export function timeRange(filter: TimeFilter) {
  return { start_time: `${filter.date}T${filter.start}:00`, end_time: `${filter.date}T${filter.end}:00` };
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(value).toLocaleDateString('pl-PL', options ?? { day: 'numeric', month: 'long' });
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}
