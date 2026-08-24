import { g as getCollection } from '../chunks/_astro_content_C94VIXHO.mjs';
export { renderers } from '../renderers.mjs';

const GET = async ({ site }) => {
  const origin = (site?.toString() || "https://atrari-pro.github.io/studio-jannah").replace(
    /\/$/,
    ""
  );
  const insights = (await getCollection("insights", ({ data }) => data.status === "published")).map(
    (e) => `${origin}/mag/${e.id}`
  );
  const cases = (await getCollection("useCases", ({ data }) => data.status === "published")).map(
    (e) => `${origin}/use-cases/${e.id}`
  );
  const staticPaths = ["", "/contact", "/a-propos", "/mag", "/use-cases", "/ao", "/app"].map(
    (p) => p ? `${origin}${p}` : `${origin}/`
  );
  const urls = [...staticPaths, ...insights, ...cases];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u}</loc>
  </url>`).join("\n")}
</urlset>
`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
