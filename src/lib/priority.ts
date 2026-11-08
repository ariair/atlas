// There is no priority field in the data, so priority is read from how much of the grade an item is
// worth. Shown in words, never colour alone. Used by the map's detail card and the deadlines page.
export type Priority = 'high' | 'medium' | 'low' | 'not set';

export function priorityOf(weightPct: number | null): Priority {
  if (weightPct === null) return 'not set';
  if (weightPct >= 20) return 'high';
  if (weightPct >= 10) return 'medium';
  return 'low';
}
