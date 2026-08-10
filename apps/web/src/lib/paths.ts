/** Préfixe les chemins pour GitHub Pages (`base: /studio-jannah/`). */
export function withBase(href: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  if (!href || href.startsWith("http") || href.startsWith("//") || href.startsWith("#") || href.startsWith("mailto:")) {
    return href;
  }
  if (href === "/") return `${base}/` || "/";
  return `${base}${href.startsWith("/") ? href : `/${href}`}`;
}
