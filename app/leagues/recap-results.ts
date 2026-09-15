// A score comparison cannot establish a league's official result.
export const officialScoreClass = (marked: boolean | undefined) =>
  marked === true ? "winner-score" : "";
