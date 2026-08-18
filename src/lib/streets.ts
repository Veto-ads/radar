export function tallyStreets(streetsJsonRows: string[], limit = 8): { street: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const json of streetsJsonRows) {
    let streets: string[];
    try {
      streets = JSON.parse(json || "[]");
    } catch {
      continue;
    }
    for (const street of streets) {
      counts.set(street, (counts.get(street) || 0) + 1);
    }
  }
  return Array.from(counts, ([street, count]) => ({ street, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
