export type UploadedImage = { url: string; publicId: string };

export async function uploadImage(
  localUri: string,
  options?: { folder?: string },
): Promise<UploadedImage> {
  const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET =
    process.env.EXPO_PUBLIC_CLOUDINARY_PRESET ||
    process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloud storage not configured: set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_PRESET (or EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET)'
    );
  }

  const form = new FormData();

  // Best-effort mime type
  const ext = (localUri.split('.').pop() || '').toLowerCase().split('?')[0];
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  form.append('file', {
    // @ts-ignore: React Native FormData file shape
    uri: localUri,
    type: mime,
    name: `upload.${ext || 'jpg'}`,
  });
  form.append('upload_preset', UPLOAD_PRESET);
  if (options?.folder) form.append('folder', options.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form as any,
  });

  const json = await res.json();
  if (!res.ok || !json?.secure_url) {
    const msg = json?.error?.message || res.statusText || 'Upload failed';
    throw new Error(`Image upload failed: ${msg}`);
  }

  return { url: json.secure_url as string, publicId: json.public_id as string };
}
