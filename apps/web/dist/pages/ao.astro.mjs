import { c as createComponent, a as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN1mmHq8.mjs';
import { $ as $$BaseLayout, s as site } from '../chunks/BaseLayout_DATG-ij9.mjs';
/* empty css                              */
export { renderers } from '../renderers.mjs';

const $$Ao = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `R\xE9ponses AO \u2014 ${site.name}`, "description": "Slot r\xE9ponses type appel d\u2019offres \u2014 Studio Jannah.", "path": "/ao", "pageType": "ao", "contentGroup": "corporate", "data-astro-cid-2ykwnc5g": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="section wrap" data-astro-cid-2ykwnc5g> <p class="eyebrow" data-astro-cid-2ykwnc5g>Slot Innovation / Delivery</p> <h1 data-astro-cid-2ykwnc5g>Réponses AO</h1> <p class="section-lead" data-astro-cid-2ykwnc5g>
Zone prévue pour dossiers type appel d’offres / briefs (entretien, prospects).
      Structure en place ; contenus fictifs à venir puis remplacement réel.
</p> <article class="ao-stub" data-astro-cid-2ykwnc5g> <h2 data-astro-cid-2ykwnc5g>Exemple de structure (stub)</h2> <ol data-astro-cid-2ykwnc5g> <li data-astro-cid-2ykwnc5g>Compréhension du besoin</li> <li data-astro-cid-2ykwnc5g>Approche mesure & tracking</li> <li data-astro-cid-2ykwnc5g>Livrables & jalons</li> <li data-astro-cid-2ykwnc5g>Preuves / contextes de marques</li> </ol> </article> </section> ` })} `;
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/ao.astro", void 0);

const $$file = "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/ao.astro";
const $$url = "/ao";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Ao,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
