/**
 * Parses a hex color to rgb
 *
 * @param {string} hex - Hex color string #112233
 * @returns Array<number>
 */
export function HEXToRGB(hex) {
  return hex
    .match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
    .slice(1)
    .map((n) => parseInt(n, 16));
}

/**
 * Convert rgb color to hsl
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns Array<number>
 */
export function RGBToHSL(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const l = Math.max(r, g, b);
  const s = l - Math.min(r, g, b);
  const h = s
    ? l === r
      ? (g - b) / s
      : l === g
      ? 2 + (b - r) / s
      : 4 + (r - g) / s
    : 0;
  return [
    60 * h < 0 ? 60 * h + 360 : 60 * h,
    100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
    (100 * (2 * l - s)) / 2,
  ];
}
