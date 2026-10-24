// Pure helpers shared by the backend and the apps (no Convex imports).

export const MAX_TAGS = 10;
const TAG_PATTERN = /^[\p{L}\p{N}_-]{1,40}$/u;

/** "#AppalachianTrail" -> "AppalachianTrail" (display form). Returns null if invalid. */
export function cleanTag(raw: string): string | null {
  const tag = raw.trim().replace(/^#+/, "");
  return TAG_PATTERN.test(tag) ? tag : null;
}

/** Matching form: case-insensitive, no leading "#". */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, "").toLowerCase();
}

/** Parse "#at #AppalachianTrail, nobo" into unique display tags. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of input.split(/[\s,]+/)) {
    const tag = cleanTag(part);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  return tags;
}
