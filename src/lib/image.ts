import { getBlob, ref } from 'firebase/storage';
import { storage } from './firebase';

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image data'));
    reader.readAsDataURL(blob);
  });

const isFirebaseStorageUrl = (src: string): boolean => {
  try {
    const { hostname } = new URL(src);
    return hostname.endsWith('firebasestorage.app') || hostname.includes('firebasestorage.googleapis.com');
  } catch {
    return false;
  }
};

export async function toDataUrl(src: string): Promise<string> {
  if (!src) throw new Error('Invalid image source');
  if (src.startsWith('data:')) return src;

  if (isFirebaseStorageUrl(src)) {
    try {
      const storageRef = ref(storage, src);
      const blob = await getBlob(storageRef);
      return await blobToDataUrl(blob);
    } catch (error) {
      console.warn('[toDataUrl] Falling back to fetch for Firebase Storage URL', error);
    }
  }

  const resp = await fetch(src, { mode: 'cors' });
  if (!resp.ok) throw new Error(`Failed to fetch image (${resp.status})`);
  const blob = await resp.blob();
  return blobToDataUrl(blob);
}
