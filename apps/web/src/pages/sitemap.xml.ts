import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { expertiseDomains, expertiseCategories } from "@studio-jannah/shared";

export const GET: APIRoute = async ({ site }) => {
  const origin = (site?.toString() || "https://atrari-pro.github.io/studio-jannah").replace(
    /\/$/,
    "",
  );

  const insights = (await getCollection("insights", ({ data }) => data.status === "published")).map(
    (e) => `${origin}/blog/${e.id}`,
  );

  const expertiseArticles = (
    await getCollection("expertises", ({ data }) => data.status === "published")
  ).map((e) => `${origin}/expertises/${e.id}`);

  // Pages pilier domaine/catégorie : existent dès le scaffold (générées
  // depuis la taxonomie), avant même qu'un article ne soit publié.
  const expertisePillars = expertiseDomains.flatMap((domain) => [
    `${origin}/expertises/${domain.id}`,
    ...expertiseCategories[domain.id].map((c) => `${origin}/expertises/${domain.id}/${c.id}`),
  ]);

  const staticPaths = ["", "/contact", "/a-propos", "/blog", "/expertises"].map((p) =>
    p ? `${origin}${p}` : `${origin}/`,
  );

  const urls = [...staticPaths, ...insights, ...expertisePillars, ...expertiseArticles];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u}</loc>\n  </url>`).join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
