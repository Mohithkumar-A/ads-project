/**
 * Tag Extractor Utility
 *
 * Extracts distinct severity/status tags from raw log text using pure string slicing.
 *
 * Principle:
 * - Scans log lines.
 * - Finds the opening delimiter '[' occurring near/after the timestamp and before the log detail.
 * - Finds the corresponding closing delimiter ']'.
 * - Extracts the slice between start + 1 and end.
 * - Treats the tag as an open-ended dynamic string without any hardcoded enum.
 */
export function extractCandidateTags(logText: string): string[] {
  if (!logText) return [];

  const lines = logText.split("\n");
  const tagsSet = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 5) continue;

    const bracketOpen = trimmed.indexOf("[");
    if (bracketOpen === -1) continue;

    const bracketClose = trimmed.indexOf("]", bracketOpen);
    if (bracketClose === -1) continue;

    // Slice the tag strictly between '[' and ']'
    const rawTag = trimmed.substring(bracketOpen + 1, bracketClose).trim();
    if (rawTag.length > 0 && rawTag.length <= 25) {
      tagsSet.add(rawTag.toUpperCase());
    }
  }

  // Fallback defaults if no bracketed tags were present in the file
  if (tagsSet.size === 0) {
    return ["CRITICAL", "ERROR", "WARNING", "INFO"];
  }

  return Array.from(tagsSet);
}
