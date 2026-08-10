import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/** Contenu local à apps/web (évite chemins OneDrive / doublons glob) */
const insights = defineCollection({
  loader: glob({
    pattern: "**/*.md",
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

export const collections = { insights, useCases };
