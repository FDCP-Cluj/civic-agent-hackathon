/** Fast fingerprint to avoid redundant PDF preview re-renders. */
export function pdfBytesFingerprint(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const len = view.byteLength;
  if (len === 0) return "0";

  let hash = 2166136261;
  const step = Math.max(1, Math.floor(len / 48));
  for (let i = 0; i < len; i += step) {
    hash ^= view[i];
    hash = Math.imul(hash, 16777619);
  }
  hash ^= view[0] ^ view[len - 1] ^ view[Math.floor(len / 2)];
  return `${len}:${hash >>> 0}`;
}

export function copyArrayBuffer(bytes: ArrayBuffer | Uint8Array): ArrayBuffer {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}
