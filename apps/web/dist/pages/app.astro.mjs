import { c as createComponent, a as renderComponent, r as renderTemplate, m as maybeRenderHead, b as addAttribute } from '../chunks/astro/server_BN1mmHq8.mjs';
import { $ as $$BaseLayout, w as withBase, s as site } from '../chunks/BaseLayout_DATG-ij9.mjs';
/* empty css                               */
export { renderers } from '../renderers.mjs';

const $$App = createComponent(($$result, $$props, $$slots) => {
  const appDevUrl = "http://localhost:5173";
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `App d\xE9mo \u2014 ${site.name}`, "description": "Pont vers l\u2019app d\xE9mo PWA / Capacitor \u2014 Studio Jannah.", "path": "/app", "pageType": "app_bridge", "contentGroup": "product", "data-astro-cid-fqt3mzrt": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="section wrap app-bridge" data-astro-cid-fqt3mzrt> <p class="eyebrow" data-astro-cid-fqt3mzrt>Product / Funnel · Mobile</p> <h1 data-astro-cid-fqt3mzrt>App démo</h1> <p class="section-lead" data-astro-cid-fqt3mzrt>
Surface interactive (funnels, wizards) destinée à la PWA puis Capacitor pour
      démos entretien. En local : lancer <code data-astro-cid-fqt3mzrt>pnpm dev:app</code>.
</p> <div class="app-bridge__actions" data-astro-cid-fqt3mzrt> <a class="btn btn-primary"${addAttribute(appDevUrl, "href")} data-track-cta="app_open" data-track-label="Ouvrir l’app démo" rel="noopener" data-astro-cid-fqt3mzrt>
Ouvrir l’app démo
</a> <a class="btn btn-ghost"${addAttribute(withBase("/contact"), "href")} data-track-cta="app_contact" data-track-label="Demander une démo" data-astro-cid-fqt3mzrt>
Demander une démo
</a> </div> <ul class="app-bridge__notes" data-astro-cid-fqt3mzrt> <li data-astro-cid-fqt3mzrt>Tracking funnel_step prévu dans l’app</li> <li data-astro-cid-fqt3mzrt>PWA manifest à activer phase 2</li> <li data-astro-cid-fqt3mzrt>Capacitor wrap = phase démo mobile téléchargeable</li> </ul> </section> ` })} `;
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/app.astro", void 0);

const $$file = "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/app.astro";
const $$url = "/app";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$App,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
