export const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Cek tanda tangan file asli, karena Content-Type dari browser bisa dipalsukan
export async function hasValidImageSignature(file: File) {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  if (file.type === "image/jpeg") return at(0, 0xff, 0xd8, 0xff);
  if (file.type === "image/png") return at(0, 0x89, 0x50, 0x4e, 0x47);
  if (file.type === "image/webp") return at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50);
  return false;
}