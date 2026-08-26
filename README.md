# Home

Landing page for the UACJ Paducah plant monitoring dashboards. It explains what the
monitoring suite is and links out to each system's dashboard.

Static HTML/CSS, no build step and no JavaScript. Served by GitHub Pages from `docs/`
on `main` (Settings -> Pages -> Source: Deploy from a branch, `main` / `/docs`),
matching how `get-log-files` and `granco_monitor` are published.

## Systems linked

| System | Repo | URL | Status |
|--------|------|-----|--------|
| Log Table Monitoring | `padp/get-log-files` | https://padp.github.io/get-log-files/ | Live |
| Press Monitoring | `padp/picos` | https://padp.github.io/picos/ | Live |
| Granco Saw Monitoring | `padp/granco_monitor` | https://padp.github.io/granco_monitor/ | Live |
| Large Aging Oven | `padp/oven_monitor` | not published yet | Coming soon |
| Small Aging Oven | `padp/oven_monitor` | not published yet | Coming soon |

## Adding a system, or turning on an oven

Cards live in `docs/index.html` under two `<ul class="systems">` lists: **Live systems**
and **In development**. To promote an oven once its dashboard ships, move that card into
the live list and change the wrapper from

```html
<div class="card pending">              <span class="badge badge-pending">Coming soon</span>
```

to

```html
<a class="card" href="...">             <span class="badge badge-live">Live</span>
```

and change the closing tag to match. Swap the trailing
`<span class="card-go">Dashboard not yet published</span>` for
`<span class="card-go">Open dashboard <span class="arrow">&rarr;</span></span>`.

## Styling

`docs/styles.css` deliberately reuses the same design tokens, header gradient, card
radius and shadow as the other dashboards so the suite reads as one system. If the
palette changes there, change it here too.
