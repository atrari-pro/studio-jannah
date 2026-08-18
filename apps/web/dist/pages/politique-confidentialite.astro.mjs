import { c as createComponent, a as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN1mmHq8.mjs';
import { $ as $$BaseLayout, s as site } from '../chunks/BaseLayout_DATG-ij9.mjs';
/* empty css                                                     */
export { renderers } from '../renderers.mjs';

const $$PolitiqueConfidentialite = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `Politique de confidentialit\xE9 \u2014 ${site.name}`, "description": "Politique de confidentialit\xE9 et cookies \u2014 Studio Jannah (stub juridique \xE0 finaliser).", "path": "/politique-confidentialite", "pageType": "legal", "contentGroup": "legal", "data-astro-cid-4rgvw6lw": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="section wrap legal" data-astro-cid-4rgvw6lw> <p class="eyebrow" data-astro-cid-4rgvw6lw>RGPD · stub</p> <h1 data-astro-cid-4rgvw6lw>Politique de confidentialité</h1> <p class="section-lead" data-astro-cid-4rgvw6lw>
Document de démarrage — à finaliser avec un conseil juridique avant mise en
      production réelle. La CMP open source
<strong data-astro-cid-4rgvw6lw>tarteaucitron.js</strong> gère le consentement cookies / tags.
</p> <h2 data-astro-cid-4rgvw6lw>Responsable</h2> <p data-astro-cid-4rgvw6lw> ${site.name} — signature ${site.expert.name}. Coordonnées et siège à compléter.
</p> <h2 data-astro-cid-4rgvw6lw>Finalités des cookies</h2> <ul data-astro-cid-4rgvw6lw> <li data-astro-cid-4rgvw6lw> <strong data-astro-cid-4rgvw6lw>Nécessaires</strong> — fonctionnement du site et mémorisation du
        choix de consentement.
</li> <li data-astro-cid-4rgvw6lw> <strong data-astro-cid-4rgvw6lw>Mesure d’audience</strong> — Google Tag Manager (<code data-astro-cid-4rgvw6lw>GTM-KB54PFTP</code>)
        / tags associés, uniquement selon votre choix (Consent Mode v2).
</li> <li data-astro-cid-4rgvw6lw> <strong data-astro-cid-4rgvw6lw>Marketing</strong> — publicité / remarketing le cas échéant, uniquement
        après opt-in.
</li> </ul> <h2 data-astro-cid-4rgvw6lw>Gestion du consentement</h2> <p data-astro-cid-4rgvw6lw>
Vous pouvez
<a href="#cookies" data-open-cmp data-track-cta="privacy_open_cmp" data-track-label="Ouvrir CMP" data-astro-cid-4rgvw6lw>modifier vos choix à tout moment</a>. Refuser est aussi accessible qu’accepter.
</p> <h2 data-astro-cid-4rgvw6lw>Vos droits</h2> <p data-astro-cid-4rgvw6lw>
Accès, rectification, effacement, opposition, limitation, portabilité — via le
      formulaire contact. Réclamation possible auprès de la CNIL.
</p> <p class="legal__note" data-astro-cid-4rgvw6lw>
La CMP ne remplace pas le registre des traitements, les DPA sous-traitants, ni
      les mentions légales complètes.
</p> </section> ` })} `;
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/politique-confidentialite.astro", void 0);

const $$file = "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/politique-confidentialite.astro";
const $$url = "/politique-confidentialite";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$PolitiqueConfidentialite,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
