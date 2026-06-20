export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function numberFromHash(hash: string, start = 0, length = 8): number {
  return parseInt(hash.slice(start, start + length), 16);
}
