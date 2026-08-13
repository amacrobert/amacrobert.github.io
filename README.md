# amacrobert.github.io

Personal site and articles, built with [Eleventy](https://www.11ty.dev/) and deployed to GitHub Pages
by `.github/workflows/deploy.yml` on every push to `main`.

## Local development

```bash
make run              # http://localhost:8080, rebuilds on save
make run PORT=3000    # ...on a different port
make build            # one-off build into _site/
make clean            # remove _site/
```

Dependencies install themselves on first use; `make install` does it on its own if you want.
The equivalent npm scripts (`npm run serve`, `npm run build`) work too.

## Adding an article

Create `src/articles/<url-slug>/index.md`:

```markdown
---
title: The Article Title
subtitle: One line shown under the title, and as the blurb on the homepage.
description: Sentence used for the meta description and Open Graph tags.
date: 2026-08-12
---

Body goes here, in Markdown.
```

That's the whole thing. `src/articles/articles.11tydata.js` applies the layout and the `articles`
tag to everything in that directory, so the page chrome and the homepage listing are automatic.
The article publishes to `/articles/<url-slug>/` and appears on the homepage, newest `date` first.

Images go next to the `index.md` that uses them and are referenced relatively:

```markdown
![Alt text](diagram.webp)
```

Fenced code blocks are highlighted at build time by PrismJS — no client-side JavaScript, and no
need to escape `<` or `&` by hand:

````markdown
```python
if users.count < BASE_CASE:
    billUser(user)
```
````

## Layout

| Path | Purpose |
| --- | --- |
| `src/index.njk` | Homepage: intro, resume link, generated article index |
| `src/resume.njk` | Resume, published to `/resume/`. Its Articles section is hand-maintained. |
| `src/_includes/base.njk` | HTML shell: head, meta/OG tags, theme toggle, scripts |
| `src/_includes/article.njk` | Article chrome, wraps `base.njk` |
| `src/_data/site.json` | Site-wide author, URL, and description |
| `src/articles/` | Articles, one directory per URL slug |
| `src/*.css`, `src/theme-toggle.js` | Copied through to the site root unchanged |

Per-page front matter understood by `base.njk`: `title`, `description`, `ogTitle`, `ogType`,
`ogImage`, and `stylesheets` (a list of extra stylesheet URLs).
