// utils/hash.ts

// Simple, non-cryptographic 32-bit FNV-1a hash to anonymize IDs in logs.
// The `salt` is optional; pass quizId if you want per-quiz uniqueness.
export function anonUserKey(id: string | null | undefined, salt?: string): string {
  const s = String(id ?? "") + (salt ? `|${salt}` : "");
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return "u" + h.toString(16);
}
