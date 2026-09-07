// Studio Jannah — rehype-article-images
//
// Plugin markdown (rehype, branché dans astro.config.mjs) appliqué à TOUT le
// contenu Markdown du site. Trois effets, tous no-op sur du contenu qui n'a
// ni image locale ni lien interne relatif :
//
//   1. Préfixe le base path GitHub Pages (/studio-jannah en CI) sur les
//      chemins d'image LOCAUX uniquement (ex. /mag/mon-slug/photo.jpg, produit
//      par l'admin — voir docs/ADMIN_LEADS.md). Les URLs externes (http(s)://)
//      et data: ne sont jamais touchées.
//   2. Même préfixe sur les liens internes `<a href="/...">` écrits dans le
//      corps Markdown des articles (ex. `[texte](/expertises/tracking/...)`)
//      — ces liens sont du texte brut rendu par le Markdown, ils ne passent
//      JAMAIS par `withBase()` (réservé aux templates Astro, voir
//      lib/paths.ts) : sans ce préfixe, ils pointent vers
//      `atrari-pro.github.io/expertises/...` (404, absent du path
//      `/studio-jannah`) au lieu de la bonne page. Bug constaté en prod le
//      2026-09-07 sur ~229 liens internes (Expertises + Blog).
//   3. Regroupe les paragraphes-image consécutifs (une image seule dans son
//      propre paragraphe, produit par la syntaxe Markdown standard
//      ![alt](chemin)) en galerie : 1 image = inchangée, 2-3 = grille,
//      4+ = mosaïque (classes .article-gallery / .article-gallery--N, voir
//      le style scopé de apps/web/src/pages/blog/[slug].astro).
//
// Duplication volontaire : la preview admin (apps/app/src/Admin.tsx,
// fonction renderArticleBody) applique la MÊME règle de regroupement en JS
// côté navigateur (impossible de partager un plugin HAST/Node avec du code
// qui tourne dans le navigateur). Si cette règle change ici, la changer
// aussi là-bas pour que la preview reste iso à la vraie page.

import { visit } from "unist-util-visit";

const REMOTE_SRC = /^([a-z]+:)?\/\//i;

function isLocalImageSrc(src) {
  return typeof src === "string" && src.length > 0 && !REMOTE_SRC.test(src) && !src.startsWith("data:");
}

// Même logique que withBase() (lib/paths.ts), pour les hrefs écrits en dur
// dans le Markdown : seuls les chemins relatifs au site (commençant par
// "/", pas "//") sont préfixés — jamais http(s)://, //, #ancre ou mailto:.
function isSiteRelativeHref(href) {
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
}

function isImageOnlyParagraph(node) {
  if (!node || node.tagName !== "p" || !Array.isArray(node.children)) return false;
  const kids = node.children.filter((c) => !(c.type === "text" && /^\s*$/.test(c.value || "")));
  return kids.length === 1 && kids[0].tagName === "img";
}

export default function rehypeArticleImages({ base = "/" } = {}) {
  const prefix = base.endsWith("/") ? base.slice(0, -1) : base;

  return (tree) => {
    // 1) base path sur les images locales
    visit(tree, "element", (node) => {
      if (node.tagName === "img" && isLocalImageSrc(node.properties?.src)) {
        const src = node.properties.src;
        node.properties.src = `${prefix}${src.startsWith("/") ? "" : "/"}${src}`;
      }
      // 1bis) même préfixe sur les liens internes du corps Markdown — voir
      // point 2 du commentaire d'en-tête.
      if (node.tagName === "a" && isSiteRelativeHref(node.properties?.href)) {
        node.properties.href = `${prefix}${node.properties.href}`;
      }
    });

    // 2) regroupement en galerie — sur tout nœud ayant des enfants (root
    //    inclus, pas seulement les éléments), pour attraper les paragraphes
    //    au niveau racine du corps de l'article.
    visit(tree, (node) => Array.isArray(node.children), (node) => {
      const next = [];
      let run = [];
      const flush = () => {
        if (run.length === 0) return;
        if (run.length === 1) {
          next.push(run[0]);
        } else {
          next.push({
            type: "element",
            tagName: "div",
            properties: { className: ["article-gallery", `article-gallery--${Math.min(run.length, 4)}`] },
            children: run.map((p) => ({
              type: "element",
              tagName: "figure",
              properties: { className: ["article-figure"] },
              children: p.children,
            })),
          });
        }
        run = [];
      };
      for (const child of node.children) {
        // remark-rehype insère un nœud texte (retour à la ligne) entre
        // chaque élément de bloc — transparent pour le regroupement : ne
        // casse pas une suite d'images, ne compte pas comme contenu entre
        // elles.
        const isWhitespace = child.type === "text" && /^\s*$/.test(child.value || "");
        if (isWhitespace) {
          next.push(child);
          continue;
        }
        if (isImageOnlyParagraph(child)) {
          run.push(child);
        } else {
          flush();
          next.push(child);
        }
      }
      flush();
      node.children = next;
    });
  };
}
