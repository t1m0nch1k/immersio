/**
 * Profile avatar images.
 *
 * `avatar` is a plain string so the existing persisted state keeps working
 * unchanged: it is either a single-character emoji or a `data:image/...` URL
 * holding a small square thumbnail.
 */

const DATA_URL_PREFIX = /^data:image\/(png|jpeg|jpg|webp);base64,/i;

/** Thumbnails are stored inline in localStorage, so they must stay small. */
export const AVATAR_MAX_BYTES = 60 * 1024;
export const AVATAR_MAX_EDGE = 256;

export const isAvatarPhoto = (value: string): boolean => DATA_URL_PREFIX.test(value);

/**
 * Rejects anything that is neither a short emoji nor a data URL under the size
 * cap. Without the cap a single 12MP photo would blow the localStorage quota
 * and take the whole progress blob down with it.
 */
export const isValidAvatar = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (isAvatarPhoto(value)) return value.length <= AVATAR_MAX_BYTES;
  // An emoji is one code point, which may be a surrogate pair.
  return Array.from(value).length === 1;
};

export const fileToAvatarDataUrl = (file: File, size = AVATAR_MAX_EDGE): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`Not an image: ${file.type || 'unknown type'}`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.onload = () => {
      const source = String(reader.result);
      const image = new Image();

      image.onerror = () => reject(new Error('Could not decode the image'));
      image.onload = () => {
        // Centre-crop to a square, then scale down. Photos are rarely square,
        // and the avatar is always drawn in a circle.
        const edge = Math.min(image.width, image.height);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('2D canvas is unavailable'));
          return;
        }
        context.drawImage(
          image,
          (image.width - edge) / 2,
          (image.height - edge) / 2,
          edge,
          edge,
          0,
          0,
          size,
          size
        );

        // WebP keeps the byte count down, which matters more than the format:
        // the result is inlined into localStorage on every save.
        const dataUrl = canvas.toDataURL('image/webp', 0.82);
        resolve(dataUrl.length > AVATAR_MAX_BYTES
          ? canvas.toDataURL('image/webp', 0.6)
          : dataUrl);
      };
      image.src = source;
    };
    reader.readAsDataURL(file);
  });
