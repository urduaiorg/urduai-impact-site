// Maps the "/assets/..." string paths used throughout src/data/*.js to the
// ImageMetadata objects Astro needs for build-time optimisation.
// Files live in src/assets/** with the same sub-path they had under public/assets/**.
const modules = import.meta.glob("/src/assets/**/*.{jpg,jpeg,png}", {
  eager: true,
  import: "default"
});

/**
 * @param {string | undefined | null} publicPath e.g. "/assets/showcase/women-dost-banner.jpg"
 * @returns {import("astro").ImageMetadata | null}
 */
export function resolveImage(publicPath) {
  if (!publicPath || typeof publicPath !== "string") return null;
  const key = publicPath.replace(/^\/assets\//, "/src/assets/");
  return modules[key] ?? null;
}

/**
 * Clamp a candidate widths list to the source image so Astro never upscales,
 * always keeping the source width itself as the largest candidate.
 */
export function clampWidths(widths, meta) {
  const max = meta?.width ?? Infinity;
  const set = new Set(widths.filter((w) => w < max));
  set.add(Math.min(max, Math.max(...widths)));
  return [...set].sort((a, b) => a - b);
}
