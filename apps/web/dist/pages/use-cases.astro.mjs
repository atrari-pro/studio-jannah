import { c as createComponent, a as renderComponent, r as renderTemplate, m as maybeRenderHead, b as addAttribute } from '../chunks/astro/server_BN1mmHq8.mjs';
import { g as getCollection } from '../chunks/_astro_content_C94VIXHO.mjs';
import { $ as $$BaseLayout, w as withBase, s as site } from '../chunks/BaseLayout_DATG-ij9.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const cases = (await getCollection("useCases", ({ data }) => data.status === "published")).sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf()
  );
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `Use cases \u2014 ${site.name}`, "description": "Cas complexes de mesure : cross-domain, iframe, r\xE9conciliation paiement\u2026", "path": "/use-cases", "pageType": "use_case_hub", "contentGroup": "use_cases", "data-astro-cid-vjw4nqqw": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="section wrap" data-astro-cid-vjw4nqqw> <p class="eyebrow" data-astro-cid-vjw4nqqw>Cas experts</p> <h1 data-astro-cid-vjw4nqqw>Use cases</h1> <p class="section-lead" data-astro-cid-vjw4nqqw>
Illustrer les trous de funnel (paiement hors domaine, iframe, S2S) — narratif +
      plan de mesure, pas de fausse infra PSP en v1.
</p> <ul class="list" data-astro-cid-vjw4nqqw> ${cases.map((item) => renderTemplate`<li data-astro-cid-vjw4nqqw> <a${addAttribute(withBase(`/use-cases/${item.id}`), "href")}${addAttribute(`usecases_list_${item.id}`, "data-track-cta")}${addAttribute(item.data.title, "data-track-label")} data-astro-cid-vjw4nqqw> <span class="list__kicker" data-astro-cid-vjw4nqqw> ${item.data.sector} · ${item.data.complexity} </span> <span class="list__title" data-astro-cid-vjw4nqqw>${item.data.title}</span> <span class="list__desc" data-astro-cid-vjw4nqqw>${item.data.description}</span> </a> </li>`)} </ul> </section> ` })} `;
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/use-cases/index.astro", void 0);

const $$file = "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/use-cases/index.astro";
const $$url = "/use-cases";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
