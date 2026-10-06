/**
 * Image compression and caching utilities for BiteBoxd Web
 */

export async function compressImageFile(file: File, maxDimension = 640, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        // Extract pure base64 (without prefix)
        const base64 = dataUrl.split(',')[1] || dataUrl;
        resolve(base64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// In-memory cache for fetched Firestore base64 photos
const photoCache = new Map<string, string>();

export function getCachedPhoto(path: string): string | undefined {
  return photoCache.get(path);
}

export function setCachedPhoto(path: string, base64: string): void {
  photoCache.set(path, base64);
}
