// A score comparison cannot establish a league's official result.
export const officialScoreClass = (marked: boolean | undefined) =>
  marked === true ? "winner-score" : "";

const bowlerNameTokens = (value: string) => value.toLowerCase()
  .replace(/\b(jr|sr|ii|iii|iv|2nd|3rd)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean).sort();

// Printed recap columns sometimes clip the final few letters of a long name.
// Require every name token and allow only one 1-3 letter truncation so a
// clipped recap can join its unique, fully published Bowler List identity.
export function sameBowlerName(left: string, right: string) {
  const a = bowlerNameTokens(left), b = bowlerNameTokens(right);
  if (!a.length || a.length !== b.length) return false;
  let clipped = 0;
  for (let index = 0; index < a.length; index++) {
    if (a[index] === b[index]) continue;
    const shorter = a[index].length <= b[index].length ? a[index] : b[index];
    const longer = shorter === a[index] ? b[index] : a[index];
    if (shorter.length < 4 || longer.length - shorter.length > 3 || !longer.startsWith(shorter)) return false;
    clipped++;
  }
  return clipped <= 1;
}

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
