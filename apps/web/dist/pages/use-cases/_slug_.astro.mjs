import { f as createAstro, c as createComponent, a as renderComponent, r as renderTemplate, m as maybeRenderHead, b as addAttribute } from '../../chunks/astro/server_BN1mmHq8.mjs';
import { r as renderEntry, g as getCollection } from '../../chunks/_astro_content_C94VIXHO.mjs';
import { s as site, $ as $$BaseLayout, w as withBase } from '../../chunks/BaseLayout_DATG-ij9.mjs';
/* empty css                                     */
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro("https://atrari-pro.github.io/studio-jannah");
async function getStaticPaths() {
  const entries = await getCollection("useCases", ({ data }) => data.status === "published");
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
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `${entry.data.title} \u2014 ${site.name}`, "description": entry.data.description, "path": `/use-cases/${entry.id}`, "pageType": "use_case", "contentGroup": "use_cases", "data-astro-cid-om6o26yy": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<article class="section wrap article" data-astro-cid-om6o26yy> <p class="eyebrow" data-astro-cid-om6o26yy>Use case · ${entry.data.complexity}</p> <h1 data-astro-cid-om6o26yy>${entry.data.title}</h1> <p class="article__meta" data-astro-cid-om6o26yy> ${entry.data.sector} ${entry.data.placeholderBrand && renderTemplate`<span data-astro-cid-om6o26yy>· marque / contexte illustratif</span>`} </p> <div class="article__body" data-astro-cid-om6o26yy> ${renderComponent($$result2, "Content", Content, { "data-astro-cid-om6o26yy": true })} </div> <p class="article__cta" data-astro-cid-om6o26yy> <a class="btn btn-primary"${addAttribute(withBase("/contact"), "href")} data-track-cta="usecase_contact" data-track-label="Parler d’un cas similaire" data-astro-cid-om6o26yy>
Parler d’un cas similaire
</a> <a class="btn btn-ghost"${addAttribute(withBase("/use-cases"), "href")} data-track-cta="usecase_back" data-track-label="Tous les use cases" data-astro-cid-om6o26yy>
Tous les use cases
</a> </p> </article> ` })} `;
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/use-cases/[slug].astro", void 0);

const $$file = "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/use-cases/[slug].astro";
const $$url = "/use-cases/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
