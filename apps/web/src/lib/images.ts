"use client";

// Client-side image pipeline (implementation plan §3.4):
//   client compression → strip metadata → optimized webp derivative
// Re-encoding through a <canvas> DROPS all EXIF, including GPSLatitude /
// GPSLongitude and device metadata — "Tell your story. Never expose theirs."
// The server treats every image as untrusted and re-checks on moderation.

export type ProcessedImage = {
  blob: Blob;
  width: number;
  height: number;
};

const MAX_DIMENSION = 1600; // longest edge; plenty for listing photos
const WEBP_QUALITY = 0.82;

export async function compressAndStripImage(
  file: File,
  maxDimension = MAX_DIMENSION,
  quality = WEBP_QUALITY,
): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;
    if (width > maxDimension || height > maxDimension) {
      const scale = Math.min(maxDimension / width, maxDimension / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser can't process images here.");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob) throw new Error("Could not process that image. Try another.");

    return { blob, width, height };
  } finally {
    bitmap.close?.();
  }
}
