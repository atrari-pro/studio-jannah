import { c as createComponent, a as renderComponent, r as renderTemplate, m as maybeRenderHead, F as Fragment, b as addAttribute } from '../chunks/astro/server_BN1mmHq8.mjs';
import { g as getCollection } from '../chunks/_astro_content_C94VIXHO.mjs';
import { $ as $$BaseLayout, s as site, w as withBase } from '../chunks/BaseLayout_DATG-ij9.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const articles = (await getCollection("insights")).filter((a) => a.data.status === "published").sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
  const [featured, ...rest] = articles;
  const mag = site.magazine;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `${mag.name} \u2014 ${site.name}`, "description": mag.tagline, "path": "/mag", "pageType": "mag_hub", "contentGroup": "mag", "data-astro-cid-f73uk22h": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="mag-cover" data-astro-cid-f73uk22h> <div class="wrap" data-astro-cid-f73uk22h> <p class="eyebrow" data-astro-cid-f73uk22h>${mag.name}</p> <h1 data-astro-cid-f73uk22h>${mag.headline}</h1> <p class="mag-cover__lead" data-astro-cid-f73uk22h>${mag.tagline}</p> <p class="mag-cover__count" data-astro-cid-f73uk22h>${articles.length} articles</p> </div> </section> ${articles.length === 0 ? renderTemplate`<section class="section wrap" data-astro-cid-f73uk22h> <p class="empty" data-astro-cid-f73uk22h>
Aucun article publié pour le moment. Ajoute des fichiers dans
<code data-astro-cid-f73uk22h>apps/web/content/insights/</code>.
</p> </section>` : renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "data-astro-cid-f73uk22h": true }, { "default": async ($$result3) => renderTemplate`${featured && renderTemplate`<section class="section wrap featured" aria-labelledby="featured-title" data-astro-cid-f73uk22h> <p class="eyebrow" data-astro-cid-f73uk22h>À la une</p> <a class="featured__link"${addAttribute(withBase(`/mag/${featured.id}`), "href")}${addAttribute(`mag_featured_${featured.id}`, "data-track-cta")}${addAttribute(featured.data.title, "data-track-label")} data-astro-cid-f73uk22h> <h2 id="featured-title" data-astro-cid-f73uk22h>${featured.data.title}</h2> <p data-astro-cid-f73uk22h>${featured.data.hook}</p> <span class="featured__cta" data-astro-cid-f73uk22h>Lire l’article →</span> </a> </section>`}<section class="section wrap feed-section" aria-labelledby="feed-title" data-astro-cid-f73uk22h> <h2 class="feed-title" id="feed-title" data-astro-cid-f73uk22h>
Au sommaire
</h2> <ul class="feed" data-astro-cid-f73uk22h> ${articles.map((item) => renderTemplate`<li data-astro-cid-f73uk22h> <a${addAttribute(withBase(`/mag/${item.id}`), "href")}${addAttribute(`mag_list_${item.id}`, "data-track-cta")}${addAttribute(item.data.title, "data-track-label")} data-astro-cid-f73uk22h> <span class="feed__tags" data-astro-cid-f73uk22h> ${item.data.tags.slice(0, 3).join(" \xB7 ") || "article"} </span> <span class="feed__title" data-astro-cid-f73uk22h>${item.data.title}</span> <span class="feed__desc" data-astro-cid-f73uk22h>${item.data.description}</span> </a> </li>`)} </ul> </section> ` })}`}` })} `;
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/mag/index.astro", void 0);

const $$file = "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/mag/index.astro";
const $$url = "/mag";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
