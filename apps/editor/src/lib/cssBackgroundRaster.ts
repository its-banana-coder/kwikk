export type CssBackgroundStyle = Record<string, string>;

function camelToKebab(input: string): string {
  return input.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function extractBackgroundFallbackColor(style: CssBackgroundStyle): string | undefined {
  const candidates = [style.backgroundColor, style.background];
  for (const value of candidates) {
    if (!value) continue;
    const normalized = value.trim();
    if (
      normalized.startsWith("#") ||
      normalized.startsWith("rgb(") ||
      normalized.startsWith("rgba(") ||
      /^[a-z]+$/i.test(normalized)
    ) {
      return normalized;
    }
  }
  return undefined;
}

export function cssBackgroundStyleToDataUrl(
  style: CssBackgroundStyle,
  width: number,
  height: number
): string {
  const css = Object.entries({
    width: "100%",
    height: "100%",
    ...style,
  })
    .map(([key, value]) => `${camelToKebab(key)}:${value}`)
    .join(";");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <foreignObject x="0" y="0" width="${width}" height="${height}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="${escapeHtml(css)}"></div>
  </foreignObject>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function rasterizeDataUrlToPng(
  dataUrl: string,
  width: number,
  height: number
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("Failed to load CSS background preview"));
    nextImage.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to create canvas for CSS background");
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}
