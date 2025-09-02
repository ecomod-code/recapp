// utils/hash.ts
export function anonUserKey(id: string | undefined | null, quizId: string) {
  const salt = (import.meta as any)?.env?.VITE_DEBUG_SALT ?? "";
  const s = `${id ?? ""}|${quizId}|${salt}`;
  // 32-bit FNV-1a
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return "u" + h.toString(16);
}

// usage:
const key = anonUserKey(studentId, quizId);
d.run({ quizId, studentIdHash: key, action: "start" });
