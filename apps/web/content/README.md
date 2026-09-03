# Contenu Blog — source de vérité

Éditer ici (`apps/web/content/`), pas le miroir à la racine du monorepo.

## Nouveau sujet Blog

1. Copier un fichier existant dans `insights/` → `mon-sujet.md`
2. Remplir le frontmatter (obligatoire) :
   - `title`, `description`, `hook`, `publishedAt`
   - `status: draft` jusqu’à QA (`review` puis `published`)
   - `rubrique` : `mesure` | `trafic` | `metiers` | `produits` | `agents`
   - `format` : `text` | `video`
   - `sources` (au moins une sur un article publié)
3. Si vidéo / cover : déposer les fichiers dans `apps/web/public/blog/mon-sujet/`

```yaml
format: video
cover: /blog/mon-sujet/cover.jpg
video:
  src: /blog/mon-sujet/clip.mp4
  poster: /blog/mon-sujet/cover.jpg
  caption: Optionnel
```

Le catalogue `/blog` lit uniquement cette collection (`/mag` et `/insights` redirigent en 301 vers `/blog` depuis le renommage). Pas de page à recoder.

## Use cases

`use-cases/` reste dans le repo (pipeline agents) mais **n’est plus en façade** (nav, home, footer, sitemap).
