/** Resize/compress hero images before upload (keeps uploads under nginx limits). */
export async function compressHeroImage(file, { maxWidth = 1920, quality = 0.86 } = {}) {
  if (!file?.type?.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file);
  const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
  if (!blob) return file;

  const base = String(file.name || 'hero').replace(/\.[^.]+$/, '') || 'hero';
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

export function uploadErrorMessage(err, isAr = false) {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')) {
    return isAr ? 'انتهت مهلة الرفع — جرّب صورة أصغر' : 'Upload timed out — try a smaller image';
  }
  if (err?.message === 'Network Error') {
    return isAr
      ? 'خطأ في الشبكة — تأكد أن السيرفر يعمل أو صغّر حجم الصورة (أقل من 5MB)'
      : 'Network error — check the server is running or use a smaller image (under 5MB)';
  }
  return err?.message || (isAr ? 'فشل الرفع' : 'Upload failed');
}
