// Board `type` strings are free text set per board by whoever created it, so
// the same physical media network can end up spelled several ways
// ("Megacom" / "Megjacom" / "Mega", "DIGITAL MEGA SCREEN" / "Digital Mega
// Screen"). This module normalizes and clusters those raw strings into
// "units" — the grouping the public catalog API exposes — without a manual
// alias table.
//
// Clustering is deliberately conservative: it only merges single-word
// spelling variants (typo/abbreviation level, e.g. "Mega" -> "Megacom") or
// exact matches after normalization. It never merges multi-word names that
// differ by a whole extra word (e.g. "Mezah" stays separate from "Mezah
// Tower" and "Mezah max" — those are different products that happen to
// share a prefix word, and merging them would wrongly combine their
// stats). A separate, looser word-boundary prefix search is used only as a
// lookup fallback (see findUnitCluster) — never for clustering itself — so
// a query like "Airport Road" can still resolve to "Airport Road Arches"
// without risking the same over-merge in the index.

const NOISE_WORDS = new Set(["ads", "إعلانات", "digital"]);

export function normalizeUnitName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((tok) => tok && !NOISE_WORDS.has(tok))
    .join(" ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Deliberately does NOT include a same-word prefix rule (e.g. "mega" ~
// "megacom"): tested against real data, that same heuristic also merged
// "Mezah" into "Digital Mezahpole" ("mezah" is a prefix of "mezahpole" in
// exactly the same way "mega" is a prefix of "megacom") even though those
// are different products. There's no reliable string-only way to tell
// those two cases apart, so clustering only trusts an exact match after
// normalization or a one-character typo on words long enough that a
// coincidental 1-edit collision is unlikely.
export function areAliases(normA: string, normB: string): boolean {
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.length >= 6 && normB.length >= 6 && levenshtein(normA, normB) <= 1) return true;
  return false;
}

// A looser check used only for the lookup fallback: the query must be a
// whole-word prefix of the candidate (boundary is start/end-of-string or a
// space on both sides), e.g. "airport road" matches "airport road arches".
function isWholeWordPrefix(query: string, candidate: string): boolean {
  return query.length >= 4 && candidate !== query && (candidate.startsWith(query + " ") || candidate === query);
}

export type RawTypeCount = { type: string; count: number };
export type UnitCluster = { rawTypes: string[]; nameAr: string | null; nameEn: string | null; totalCount: number };

function hasArabic(s: string): boolean {
  return /[؀-ۿ]/.test(s);
}

export function clusterUnitTypes(rawTypes: RawTypeCount[]): UnitCluster[] {
  const n = rawTypes.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(x: number, y: number) {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) parent[rx] = ry;
  }

  const norms = rawTypes.map((r) => normalizeUnitName(r.type));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (areAliases(norms[i], norms[j])) union(i, j);
    }
  }

  const groups = new Map<number, RawTypeCount[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = groups.get(root);
    if (list) list.push(rawTypes[i]);
    else groups.set(root, [rawTypes[i]]);
  }

  return Array.from(groups.values()).map((members) => {
    const sorted = [...members].sort((a, b) => b.count - a.count);
    const arCandidate = sorted.find((m) => hasArabic(m.type));
    const enCandidate = sorted.find((m) => !hasArabic(m.type));
    return {
      rawTypes: members.map((m) => m.type),
      nameAr: arCandidate?.type || sorted[0]?.type || null,
      nameEn: enCandidate?.type || sorted[0]?.type || null,
      totalCount: members.reduce((sum, m) => sum + m.count, 0),
    };
  });
}

export function findUnitCluster(
  rawTypes: RawTypeCount[],
  name: string,
  nameEn?: string | null
): UnitCluster | null {
  const clusters = clusterUnitTypes(rawTypes);
  const normQuery = normalizeUnitName(name);
  const normQueryEn = nameEn ? normalizeUnitName(nameEn) : null;

  for (const cluster of clusters) {
    for (const raw of cluster.rawTypes) {
      const normRaw = normalizeUnitName(raw);
      if (areAliases(normQuery, normRaw)) return cluster;
      if (normQueryEn && areAliases(normQueryEn, normRaw)) return cluster;
    }
  }

  // No exact/alias hit — fall back to a whole-word prefix match (e.g. query
  // "Airport Road" against a unit named "Airport Road Arches"). If more
  // than one cluster qualifies, the one with the most ads is assumed to be
  // the one the catalog card refers to.
  const prefixMatches = clusters.filter((cluster) =>
    cluster.rawTypes.some((raw) => {
      const normRaw = normalizeUnitName(raw);
      return isWholeWordPrefix(normQuery, normRaw) || (!!normQueryEn && isWholeWordPrefix(normQueryEn, normRaw));
    })
  );
  if (prefixMatches.length === 0) return null;
  return prefixMatches.sort((a, b) => b.totalCount - a.totalCount)[0];
}
