export async function toDataUrl(src: string): Promise<string> {
  if (!src) throw new Error('Invalid image source');
  if (src.startsWith('data:')) return src;
  const resp = await fetch(src);
  if (!resp.ok) throw new Error(`Failed to fetch image (${resp.status})`);
  const blob = await resp.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image data'));
    reader.readAsDataURL(blob);
  });
}
