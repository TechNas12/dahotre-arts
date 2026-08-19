/**
 * Cloudinary Image Optimization & Transformation Utilities
 */

export type ImageOptimizationOptions = {
  width?: number;
  height?: number;
  crop?: "fill" | "scale" | "fit" | "limit" | "thumb" | "pad";
  quality?: number | "auto" | "auto:good" | "auto:eco" | "auto:low";
  format?: "auto" | "webp" | "avif" | "jpg" | "png";
  gravity?: "auto" | "center" | "face";
};

/**
 * Transforms a Cloudinary URL to request an optimized, resized, and compressed image on-the-fly.
 * If the URL is not from Cloudinary or is invalid, the original URL is returned safely.
 *
 * @param url The Cloudinary image URL (e.g. https://res.cloudinary.com/<cloud_name>/image/upload/v1234/sample.jpg)
 * @param options Optimization options including width, height, crop mode, quality, and format.
 * @returns The optimized Cloudinary URL
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: ImageOptimizationOptions = {}
): string {
  if (!url || typeof url !== "string") {
    return "";
  }

  // Only transform Cloudinary URLs
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) {
    return url;
  }

  const {
    width,
    height,
    crop = "fill",
    quality = "auto",
    format = "auto",
    gravity = "auto",
  } = options;

  // Build transformation string
  const transforms: string[] = [];

  if (format) {
    transforms.push(`f_${format}`);
  }
  if (quality) {
    transforms.push(`q_${quality}`);
  }
  if (width) {
    transforms.push(`w_${Math.round(width)}`);
  }
  if (height) {
    transforms.push(`h_${Math.round(height)}`);
  }
  if (width || height) {
    transforms.push(`c_${crop}`);
    if (crop === "fill" || crop === "thumb") {
      transforms.push(`g_${gravity}`);
    }
  }

  if (transforms.length === 0) {
    return url;
  }

  const transformString = transforms.join(",");

  // Insert transformations immediately after `/image/upload/`
  // Handle optional existing transformations or version prefixes
  const uploadIndex = url.indexOf("/image/upload/");
  if (uploadIndex === -1) {
    return url;
  }

  const prefix = url.substring(0, uploadIndex + "/image/upload/".length);
  const rest = url.substring(uploadIndex + "/image/upload/".length);

  // If URL already has transformations directly after /upload/, avoid duplicate nesting if simple
  return `${prefix}${transformString}/${rest}`;
}

/**
 * Standard preset helpers for consistent sizing across the application
 */
export const imagePresets = {
  /** Table row avatar / mini thumbnail (80x80) */
  thumbnail: (url?: string | null) => getOptimizedImageUrl(url, { width: 80, height: 80, crop: "fill" }),
  /** Table preview square (120x120) */
  table: (url?: string | null) => getOptimizedImageUrl(url, { width: 120, height: 120, crop: "fill" }),
  /** POS Grid & Card preview (400x400) */
  card: (url?: string | null) => getOptimizedImageUrl(url, { width: 400, height: 400, crop: "fill" }),
  /** Medium Modal Preview (800x800) */
  modal: (url?: string | null) => getOptimizedImageUrl(url, { width: 800, height: 800, crop: "limit" }),
  /** High-Definition Full View (1600px width limit with high quality) */
  full: (url?: string | null) => getOptimizedImageUrl(url, { width: 1600, quality: 90, crop: "limit" }),
};
