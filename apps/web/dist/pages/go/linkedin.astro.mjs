import { c as createComponent, r as renderTemplate, e as defineScriptVars, a as renderComponent, m as maybeRenderHead, b as addAttribute } from '../../chunks/astro/server_BN1mmHq8.mjs';
import { $ as $$BaseLayout, w as withBase, s as site } from '../../chunks/BaseLayout_DATG-ij9.mjs';
/* empty css                                       */
export { renderers } from '../../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Linkedin = createComponent(($$result, $$props, $$slots) => {
  const source = "linkedin";
  return renderTemplate(_a || (_a = __template(["", " <script>(function(){", '\n  const params = new URLSearchParams(window.location.search);\n  (window.sj?.push || window.sjTrack)?.({\n    event: "sj_campaign_land",\n    page_path: "/go/linkedin",\n    page_type: "acquisition",\n    content_group: "acquisition",\n    campaign_source: params.get("utm_source") || source,\n    campaign_medium: params.get("utm_medium") || "social",\n    campaign_name: params.get("utm_campaign") || "linkedin_default",\n    campaign_content: params.get("utm_content") || undefined,\n  });\n})();<\/script> '])), renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `Depuis LinkedIn \u2014 ${site.name}`, "description": "Landing acquisition LinkedIn \u2014 Studio Jannah.", "path": "/go/linkedin", "pageType": "acquisition", "contentGroup": "acquisition", "data-astro-cid-ejbrvgpj": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="section wrap go" data-astro-cid-ejbrvgpj> <p class="eyebrow" data-astro-cid-ejbrvgpj>Acquisition · LinkedIn</p> <h1 data-astro-cid-ejbrvgpj>Bienvenue depuis LinkedIn</h1> <p class="section-lead" data-astro-cid-ejbrvgpj>
Landing dédiée posts / pubs LinkedIn. Event
<code data-astro-cid-ejbrvgpj>sj_campaign_land</code> (contrat DL v1).
</p> <div class="go__cta" data-astro-cid-ejbrvgpj> <a class="btn btn-primary"${addAttribute(withBase("/contact"), "href")} data-track-cta="acq_linkedin_cta_contact" data-track-label="Échanger" data-astro-cid-ejbrvgpj>
Échanger
</a> <a class="btn btn-ghost"${addAttribute(withBase("/a-propos"), "href")} data-track-cta="acq_linkedin_cta_about" data-track-label="À propos" data-astro-cid-ejbrvgpj>
À propos
</a> </div> </section> ` }), defineScriptVars({ source }));
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/go/linkedin.astro", void 0);

const $$file = "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/go/linkedin.astro";
const $$url = "/go/linkedin";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Linkedin,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
