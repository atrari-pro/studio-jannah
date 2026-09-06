import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/** Contenu local à apps/web — un fichier MD = un sujet Mag. */
const insights = defineCollection({
  loader: glob({
    pattern: "*.md",
    base: new URL("../content/insights", import.meta.url),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    status: z.enum(["draft", "review", "published"]),
    tags: z.array(z.string()).default([]),
    hook: z.string(),
    rubrique: z.enum(["mesure", "trafic", "metiers", "produits", "agents"]),
    format: z.enum(["text", "video"]).default("text"),
    featured: z.boolean().default(false),
    cover: z.string().optional(),
    video: z
      .object({
        src: z.string(),
        poster: z.string().optional(),
        caption: z.string().optional(),
      })
      .optional(),
    sources: z
      .array(
        z.object({
          label: z.string(),
          url: z.string().url(),
        }),
      )
      .default([]),
  }),
});

/**
 * Bibliothèque Expertises — pilier/cluster, distincte du magazine `insights`.
 * Fichiers : content/expertises/<domain>/<category>/<slug>.md — le triplet
 * domain/category/slug vient du chemin (entry.id), pas retapé en frontmatter,
 * pour ne jamais désynchroniser URL et taxonomie. Domaines/catégories de
 * référence : @studio-jannah/shared (expertiseDomains, expertiseCategories) ;
 * détail complet du backlog : docs/CONTENT_EXPERTISE_TAXONOMY.md.
 */
const expertises = defineCollection({
  loader: glob({
    pattern: "*/*/*.md",
    base: new URL("../content/expertises", import.meta.url),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    status: z.enum(["draft", "review", "published"]),
    categoryLabel: z.string(),
    type: z.enum(["guide", "audit", "checklist", "glossaire", "comparatif", "methodologie"]),
    level: z.enum(["fondamentaux", "avance", "expert"]),
    tags: z.array(z.string()).default([]),
    hook: z.string(),
    sources: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    relatedInsights: z.array(z.string()).default([]),
    relatedUseCases: z.array(z.string()).default([]),
    relatedExpertises: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
  }),
});

const useCases = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: new URL("../content/use-cases", import.meta.url),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    status: z.enum(["draft", "review", "published"]),
    sector: z.string(),
    complexity: z.enum(["medium", "high", "expert"]),
    themes: z.array(z.string()).default([]),
    placeholderBrand: z.boolean().default(true),
  }),
});

export const collections = { insights, useCases, expertises };
