const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns today's local calendar date as YYYY-MM-DD.
 */
function getTodayDateString(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a YYYY-MM-DD string (or Date) into a UTC midnight Date representing that calendar day.
 * Returns null if invalid.
 */
function parseDateOnly(value) {
  if (value === undefined || value === null || value === '') {
    return parseDateOnly(getTodayDateString());
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return utcDate;
}

/**
 * Returns today's calendar day normalized to UTC midnight.
 */
function getTodayCalendarUTC(now = new Date()) {
  return parseDateOnly(getTodayDateString(now));
}

/**
 * Adds whole calendar days to a UTC midnight Date.
 */
function addDaysUTC(dateUTC, days) {
  return new Date(dateUTC.getTime() + days * MS_PER_DAY);
}

/**
 * Returns whole calendar days elapsed from startDateUTC to endDateUTC.
 */
function diffCalendarDays(endDateUTC, startDateUTC) {
  const end = parseDateOnly(endDateUTC);
  const start = parseDateOnly(startDateUTC);
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * Checks if a loan is currently overdue as of today.
 */
function isLoanOverdue(loan, now = new Date()) {
  if (!loan || loan.status !== 'Issued' || !loan.dueDate) {
    return false;
  }
  const todayUTC = getTodayCalendarUTC(now);
  const dueUTC = parseDateOnly(loan.dueDate);
  return todayUTC.getTime() > dueUTC.getTime();
}

/**
 * Calculates late return fine at Rs. 5 per day after the due date.
 */
function calculateFine(dueDate, returnDate) {
  const daysLate = diffCalendarDays(returnDate, dueDate);
  return daysLate > 0 ? daysLate * 5 : 0;
}

module.exports = {
  getTodayDateString,
  parseDateOnly,
  getTodayCalendarUTC,
  addDaysUTC,
  diffCalendarDays,
  isLoanOverdue,
  calculateFine,
};
