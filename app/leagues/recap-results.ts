// A score comparison cannot establish a league's official result.
export const officialScoreClass = (marked: boolean | undefined) =>
  marked === true ? "winner-score" : "";

export function combinedReportedPoints(values: Array<string | number | null | undefined>) {
  const reported = values.filter(
    (value) => value !== "" && value !== null && value !== undefined && !Number.isNaN(Number(value)),
  );
  return reported.length
    ? reported.reduce<number>((sum, value) => sum + Number(value), 0)
    : null;
}

export function reportedPointTotals(entries: Array<{ week: string; reportedWeekPoints: number | null }>) {
  let total = 0;
  return entries.map(entry => {
    total += entry.reportedWeekPoints ?? 0;
    return String(total);
  });
}
