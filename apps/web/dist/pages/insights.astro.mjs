import { f as createAstro, c as createComponent } from '../chunks/astro/server_BN1mmHq8.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://atrari-pro.github.io/studio-jannah");
const $$Index = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  return Astro2.redirect("/mag", 301);
}, "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/insights/index.astro", void 0);

const $$file = "/Users/Mohamed.Atrari/Library/CloudStorage/OneDrive-EY/Documents/00 -- Mohamed/site_perso/apps/web/src/pages/insights/index.astro";
const $$url = "/insights";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$Index,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
