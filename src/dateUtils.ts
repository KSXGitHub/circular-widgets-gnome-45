export const WEEKDAY_ABBR = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const
export type WeekdayAbbr = typeof WEEKDAY_ABBR[number]
export const getWeekdayAbbr = (weekdayIndex: number): WeekdayAbbr => WEEKDAY_ABBR[weekdayIndex % WEEKDAY_ABBR.length]

export const MONTH_NAME = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const
export type MonthName = typeof MONTH_NAME[number]
export const getMonthName = (monthIndex: number): MonthName => MONTH_NAME[monthIndex % MONTH_NAME.length]

export const daysInMonth = (month: number, year: number): number => new Date(year, month + 1, 0).getDate()

export const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() == b.getFullYear() && a.getMonth() == b.getMonth() && a.getDate() == b.getDate()
