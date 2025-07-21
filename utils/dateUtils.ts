export interface ISOWeekDate {
  isoWeek: number;
  isoYear: number;
}

export const getISOWeekAndYear = (date: Date): ISOWeekDate => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - (current day number + 6) % 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() + 6) % 7);
  // Get week number, 0-indexed
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  // Return array of year and week number
  return { isoWeek: weekNo, isoYear: d.getUTCFullYear() };
};

export const getISOWeekStartDate = (isoYear: number, isoWeek: number): Date => {
  const date = new Date(isoYear, 0, 1 + (isoWeek - 1) * 7);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(date.setDate(diff));
};

export const getISOWeekEndDate = (isoYear: number, isoWeek: number): Date => {
  const startDate = getISOWeekStartDate(isoYear, isoWeek);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return endDate;
};

export const getISOWeekRange = (isoYear: number, isoWeek: number, numWeeks: number): ISOWeekDate[] => {
  const range: ISOWeekDate[] = [];
  let currentYear = isoYear;
  let currentWeek = isoWeek;

  for (let i = 0; i < numWeeks; i++) {
    range.push({ isoWeek: currentWeek, isoYear: currentYear });

    currentWeek--;
    if (currentWeek < 1) {
      currentYear--;
      // Calculate the number of weeks in the previous year
      const prevYearLastDay = new Date(Date.UTC(currentYear, 11, 31));
      const { isoWeek: lastWeekOfPrevYear } = getISOWeekAndYear(prevYearLastDay);
      currentWeek = lastWeekOfPrevYear;
    }
  }
  return range;
};
