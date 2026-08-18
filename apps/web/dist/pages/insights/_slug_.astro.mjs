import { f as createAstro, c as createComponent } from '../../chunks/astro/server_BN1mmHq8.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro("https://atrari-pro.github.io/studio-jannah");
async function getStaticPaths() {
  return [
    { params: { slug: "trafic-demain-mesure" } }
  ];
}
const $$slug = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { slug } = Astro2.params;
  return Astro2.redirect(`/mag/${slug}`, 301);
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/insights/[slug].astro", void 0);

const $$file = "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/insights/[slug].astro";
const $$url = "/insights/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
