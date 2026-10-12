import * as SecureStore from 'expo-secure-store';

const KEY = 'custom_profile_picture';

/**
 * Resizes and compresses image data URL / URI using HTML5 canvas on Web.
 * This prevents hitting browser localStorage 5MB quota errors.
 * An avatar only needs to be ~250x250, resulting in a ~15-25KB JPEG.
 */
export async function compressImageIfWeb(uriOrBase64: string, maxDim = 300, quality = 0.7): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return uriOrBase64;
  }
  return new Promise((resolve) => {
    try {
      const img = new (window as any).Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(uriOrBase64);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (e) {
          console.warn('Canvas compression error:', e);
          resolve(uriOrBase64);
        }
      };
      img.onerror = () => resolve(uriOrBase64);
      img.src = uriOrBase64;
    } catch (e) {
      resolve(uriOrBase64);
    }
  });
}

export async function saveStoredProfilePhoto(data: string): Promise<void> {
  let photoToSave = data;
  try {
    photoToSave = await compressImageIfWeb(data);
  } catch (e) {}

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(KEY, photoToSave);
    }
  } catch (e) {
    console.error('Failed to save profile picture to localStorage:', e);
  }

  try {
    await SecureStore.setItemAsync(KEY, photoToSave);
  } catch (e) {}
}

export async function getStoredProfilePhoto(): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(KEY);
      if (val) return val;
    }
  } catch (e) {}
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch (e) {
    return null;
  }
}

export async function removeStoredProfilePhoto(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(KEY);
    }
  } catch (e) {}
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch (e) {}
}
