# Contenu Mag — source de vérité

Éditer ici (`apps/web/content/`), pas le miroir à la racine du monorepo.

## Nouveau sujet Mag

1. Copier un fichier existant dans `insights/` → `mon-sujet.md`
2. Remplir le frontmatter (obligatoire) :
   - `title`, `description`, `hook`, `publishedAt`
   - `status: draft` jusqu’à QA (`review` puis `published`)
   - `rubrique` : `mesure` | `trafic` | `metiers` | `produits` | `agents`
   - `format` : `text` | `video`
   - `sources` (au moins une sur un article publié)
3. Si vidéo / cover : déposer les fichiers dans `apps/web/public/mag/mon-sujet/`

```yaml
format: video
cover: /mag/mon-sujet/cover.jpg
video:
  src: /mag/mon-sujet/clip.mp4
  poster: /mag/mon-sujet/cover.jpg
  caption: Optionnel
```

Le catalogue `/mag` lit uniquement cette collection. Pas de page à recoder.

## Use cases

`use-cases/` reste dans le repo (pipeline agents) mais **n’est plus en façade** (nav, home, footer, sitemap).
