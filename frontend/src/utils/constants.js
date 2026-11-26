export const BOOK_CATEGORIES = [
  'Fiction',
  'Science',
  'History',
  'Technology',
  'Biography',
  'Other',
];

export const CATEGORY_BADGE_STYLES = {
  Fiction: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  Science: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
  History: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Technology: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  Biography: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Other: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

/**
 * Returns local calendar date as YYYY-MM-DD.
 */
export function getTodayInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes YYYY-MM-DD + N days in UTC calendar math.
 */
export function addDaysToDateString(dateStr, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Formats an ISO date string stored at UTC midnight into readable date (e.g. 26 Nov 2026).
 */
export function formatDisplayDate(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
