import { c as createComponent, m as maybeRenderHead, r as renderTemplate, a as renderComponent, b as addAttribute } from '../chunks/astro/server_BN1mmHq8.mjs';
import { m as methodSteps, $ as $$BaseLayout, s as site, w as withBase } from '../chunks/BaseLayout_DATG-ij9.mjs';
/* empty css                                    */
export { renderers } from '../renderers.mjs';

const $$Method = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<section class="section method" id="methode" aria-labelledby="method-title" data-astro-cid-gkk5ym2j> <div class="wrap" data-astro-cid-gkk5ym2j> <p class="eyebrow" data-astro-cid-gkk5ym2j>Comment on avance</p> <h2 class="section-title" id="method-title" data-astro-cid-gkk5ym2j>Méthode</h2> <p class="section-lead" data-astro-cid-gkk5ym2j>Trois temps. Un fil : la fiabilité du signal avant l’activation.</p> <ol class="method__list" data-astro-cid-gkk5ym2j> ${methodSteps.map((s) => renderTemplate`<li data-astro-cid-gkk5ym2j> <span class="method__n" aria-hidden="true" data-astro-cid-gkk5ym2j> ${s.n} </span> <div data-astro-cid-gkk5ym2j> <h3 data-astro-cid-gkk5ym2j>${s.title}</h3> <p data-astro-cid-gkk5ym2j>${s.text}</p> </div> </li>`)} </ol> </div> </section> `;
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/components/Method.astro", void 0);

const $$APropos = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `\xC0 propos \u2014 ${site.name}`, "description": "Parcours hybride analytics/tracking et data/IA \u2014 Studio Jannah.", "path": "/a-propos", "pageType": "about", "contentGroup": "corporate", "data-astro-cid-xp7oeim3": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="section wrap about" data-astro-cid-xp7oeim3> <p class="eyebrow" data-astro-cid-xp7oeim3>Signature</p> <h1 data-astro-cid-xp7oeim3>${site.expert.name}</h1> <p class="about__role" data-astro-cid-xp7oeim3>${site.expert.role} · ${site.expert.years} ans d’expérience</p> <div class="about__body" data-astro-cid-xp7oeim3> <p data-astro-cid-xp7oeim3>
Profil hybride : expertise tracking & analytics (GA4, Piano, ContentSquare,
        server-side) combinée à SQL, Python et une montée en IA & Data Science.
</p> <p data-astro-cid-xp7oeim3> <strong data-astro-cid-xp7oeim3>${site.name}</strong> est l’atelier qui porte cette expertise — image
        fiable, qualité de service, levier pour les entretiens et l’indépendance à
        venir.
</p> <p class="about__note" data-astro-cid-xp7oeim3>
Textes de démarrage inspirés du parcours réel ; détails et preuves seront
        affinés au fil des remplacements de placeholders.
</p> </div> <a class="btn btn-primary"${addAttribute(withBase("/contact"), "href")} data-track-cta="about_cta_contact" data-track-label="Contact" data-astro-cid-xp7oeim3>
Contact
</a> </section> ${renderComponent($$result2, "Method", $$Method, { "data-astro-cid-xp7oeim3": true })} ` })} `;
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/a-propos.astro", void 0);

const $$file = "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/a-propos.astro";
const $$url = "/a-propos";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$APropos,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
