import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async ({ site }) => {
  const origin = (site?.toString() || "https://atrari-pro.github.io/studio-jannah").replace(
    /\/$/,
    "",
  );

  const insights = (await getCollection("insights", ({ data }) => data.status === "published")).map(
    (e) => `${origin}/mag/${e.id}`,
  );
  const cases = (await getCollection("useCases", ({ data }) => data.status === "published")).map(
    (e) => `${origin}/use-cases/${e.id}`,
  );

  const staticPaths = ["", "/contact", "/a-propos", "/mag", "/use-cases", "/ao", "/app"].map((p) =>
    p ? `${origin}${p}` : `${origin}/`,
  );

  const urls = [...staticPaths, ...insights, ...cases];

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
