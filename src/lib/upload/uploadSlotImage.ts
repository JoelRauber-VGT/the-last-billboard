import { createBrowserClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';

/**
 * Validates MIME type by reading file header (magic bytes)
 * @param file - File to validate
 * @returns true if MIME type is valid
 */
async function validateMimeType(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (!e.target?.result) {
        resolve(false);
        return;
      }

      const arr = new Uint8Array(e.target.result as ArrayBuffer).subarray(0, 4);
      let header = '';
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16);
      }

      // Check magic bytes for supported formats
      // PNG: 89 50 4E 47
      // JPEG: FF D8 FF
      // WEBP: 52 49 46 46 (RIFF) followed by WEBP at bytes 8-11
      const isPng = header.startsWith('89504e47');
      const isJpeg = header.startsWith('ffd8ff');
      const isWebp = header.startsWith('52494646');

      resolve(isPng || isJpeg || isWebp);
    };
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
}

/**
 * Uploads a slot image to Supabase Storage
 * @param file - Image file to upload
 * @param userId - User ID for filename generation
 * @returns Public URL of uploaded image
 * @throws Error if upload fails or validation fails
 */
export async function uploadSlotImage(
  file: File,
  userId: string
): Promise<string> {
  // Validate file size
  if (file.size > config.maxImageSizeMb * 1024 * 1024) {
    throw new Error(`Image must be max ${config.maxImageSizeMb}MB`);
  }

  // Validate MIME type from file metadata
  if (!config.allowedImageTypes.includes(file.type as typeof config.allowedImageTypes[number])) {
    throw new Error('Only PNG, JPEG, WEBP allowed');
  }

  // Validate MIME type from file header (magic bytes)
  const isValidMimeType = await validateMimeType(file);
  if (!isValidMimeType) {
    throw new Error('Invalid image file format');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${userId}_${timestamp}_${sanitizedName}`;

  const supabase = createBrowserClient();

  // Upload with retry logic
  let lastError: Error | null = null;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from('slot-images')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('slot-images')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw new Error(`Image upload failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
}
