import { f as createAstro, c as createComponent, a as renderComponent, r as renderTemplate, m as maybeRenderHead, b as addAttribute } from '../../chunks/astro/server_BN1mmHq8.mjs';
import { r as renderEntry, g as getCollection } from '../../chunks/_astro_content_C94VIXHO.mjs';
import { s as site, $ as $$BaseLayout, w as withBase } from '../../chunks/BaseLayout_DATG-ij9.mjs';
/* empty css                                     */
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro("https://atrari-pro.github.io/studio-jannah");
async function getStaticPaths() {
  const entries = await getCollection("insights", ({ data }) => data.status === "published");
  return entries.map((entry) => ({
    params: { slug: entry.id },
    props: { entry }
  }));
}
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { entry } = Astro2.props;
  const { Content } = await renderEntry(entry);
  const mag = site.magazine;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `${entry.data.title} \u2014 ${mag.name}`, "description": entry.data.description, "path": `/mag/${entry.id}`, "pageType": "mag_article", "contentGroup": "mag", "data-astro-cid-noros225": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<article class="section wrap article" data-astro-cid-noros225> <p class="eyebrow" data-astro-cid-noros225> <a${addAttribute(withBase("/mag"), "href")} data-track-cta="mag_crumb"${addAttribute(mag.name, "data-track-label")} data-astro-cid-noros225>${mag.name}</a> </p> <h1 data-astro-cid-noros225>${entry.data.title}</h1> <p class="article__hook" data-astro-cid-noros225>${entry.data.hook}</p> <p class="article__meta" data-astro-cid-noros225> <time${addAttribute(entry.data.publishedAt.toISOString(), "datetime")} data-astro-cid-noros225>${entry.data.publishedAt.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })}</time> ${entry.data.tags.length > 0 && renderTemplate`<span data-astro-cid-noros225>· ${entry.data.tags.join(" \xB7 ")}</span>`} </p> <div class="article__body" data-astro-cid-noros225> ${renderComponent($$result2, "Content", Content, { "data-astro-cid-noros225": true })} </div> ${entry.data.sources.length > 0 && renderTemplate`<aside class="article__sources" data-astro-cid-noros225> <h2 data-astro-cid-noros225>Références</h2> <ul data-astro-cid-noros225> ${entry.data.sources.map((s) => renderTemplate`<li data-astro-cid-noros225> <a${addAttribute(s.url, "href")} rel="noopener noreferrer"${addAttribute(`mag_src_${entry.id}`, "data-track-cta")}${addAttribute(s.label, "data-track-label")} data-astro-cid-noros225> ${s.label} </a> </li>`)} </ul> </aside>`} <p class="article__cta" data-astro-cid-noros225> <a class="btn btn-primary"${addAttribute(withBase("/contact"), "href")} data-track-cta="mag_contact" data-track-label="Discuter mesure" data-astro-cid-noros225>
Discuter mesure
</a> <a class="btn btn-ghost"${addAttribute(withBase("/mag"), "href")} data-track-cta="mag_back" data-track-label="Retour au Mag" data-astro-cid-noros225>
Retour au Mag
</a> </p> </article> ` })} `;
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/mag/[slug].astro", void 0);

const $$file = "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/mag/[slug].astro";
const $$url = "/mag/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
