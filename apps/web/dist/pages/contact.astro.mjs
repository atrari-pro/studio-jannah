import { c as createComponent, a as renderComponent, d as renderScript, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BN1mmHq8.mjs';
import { $ as $$BaseLayout, s as site } from '../chunks/BaseLayout_DATG-ij9.mjs';
/* empty css                                   */
export { renderers } from '../renderers.mjs';

const $$Contact = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `Contact \u2014 ${site.name}`, "description": "\xC9changer avec Studio Jannah.", "path": "/contact", "pageType": "contact", "contentGroup": "corporate", "data-astro-cid-uw5kdbxl": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="section wrap contact" data-astro-cid-uw5kdbxl> <p class="eyebrow" data-astro-cid-uw5kdbxl>Dispo ciblée</p> <h1 data-astro-cid-uw5kdbxl>Parler du signal</h1> <p class="section-lead" data-astro-cid-uw5kdbxl>
Salarié aujourd’hui — échanges sur missions / projets ciblés. Réponse sous 48h
      ouvrées.
</p> <form class="form" id="contact-form" method="post" data-funnel="contact" novalidate data-astro-cid-uw5kdbxl>  <label class="form__hp" aria-hidden="true" data-astro-cid-uw5kdbxl>
Société
<input name="company" type="text" tabindex="-1" autocomplete="off" data-astro-cid-uw5kdbxl> </label> <label data-astro-cid-uw5kdbxl>
Nom
<input name="name" type="text" required autocomplete="name" maxlength="200" data-astro-cid-uw5kdbxl> </label> <label data-astro-cid-uw5kdbxl>
Email
<input name="email" type="email" required autocomplete="email" maxlength="320" data-astro-cid-uw5kdbxl> </label> <label data-astro-cid-uw5kdbxl>
Contexte
<textarea name="message" rows="5" required maxlength="8000" placeholder="Besoin, marque, délai…" data-astro-cid-uw5kdbxl></textarea> </label> <button class="btn btn-primary" type="submit" id="contact-submit" data-track-cta="contact_form_submit" data-track-label="Envoyer" data-astro-cid-uw5kdbxl>
Envoyer
</button> <p class="form__status form__status--ok" id="form-ok" hidden role="status" data-astro-cid-uw5kdbxl>
Message bien reçu — retour sous 48h ouvrées.
</p> <p class="form__status form__status--err" id="form-err" hidden role="alert" data-astro-cid-uw5kdbxl></p> </form> </section> ` })} ${renderScript($$result, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/contact.astro?astro&type=script&index=0&lang.ts")} `;
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/contact.astro", void 0);

const $$file = "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/contact.astro";
const $$url = "/contact";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Contact,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
