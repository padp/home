# Home

Landing page for the UACJ Paducah plant monitoring dashboards. It explains what the
monitoring suite is and links out to each system's dashboard.

Static HTML/CSS, no build step. Two small vanilla-JS files: `docs/local-tool-hint.js`
adds a click-time explanation to the plant-network-only cards, and
`docs/status-check.js` replaces the static "Live" badge with a real check against each
system's API (see "Live status badges" below). Everything else is plain markup. Served
by GitHub Pages from `docs/` on `main` (Settings -> Pages -> Source:
Deploy from a branch, `main` / `/docs`), matching how `get-log-files` and
`granco_monitor` are published.

## Systems linked

| System | Repo | URL | Status |
|--------|------|-----|--------|
| Log Table Monitoring | `padp/get-log-files` | https://padp.github.io/get-log-files/ | Live |
| Press Monitoring | `padp/picos` | https://padp.github.io/picos/ | Live |
| Granco Saw Monitoring | `padp/granco_monitor` | https://padp.github.io/granco_monitor/ | Live |
| Large Aging Oven | `padp/oven_monitor` | https://padp.github.io/oven_monitor/?oven=large | Live |
| Small Aging Oven | `padp/oven_monitor` | https://padp.github.io/oven_monitor/?oven=small | Live |
| Recipe Setpoint Sync | `padp/index-scs` (local, uacj-mengr45:3005) | http://uacj-mengr45:3005/ | Live, plant-network only |
| Vision System Database | n/a (local, uacj-mengr45:5057) | http://uacj-mengr45:5057 | Live, plant-network only |
| Press History Search | Press History UI/v2 (local, uacj-mengr45:3080) | http://uacj-mengr45:3080 | Live, plant-network only |

The first five are checked live on page load; the last three cannot be (see "Live status
badges" and "Plant-network-only cards" below).

## Adding a system

Cards live in `docs/index.html` under three `<ul class="systems">` lists: **Live
monitoring** (real-time dashboards), **Management** (tools that change what the equipment
does, rather than watch what it did) and **History & review** (search/analysis tools over
past data). Copy an existing `<li>` from whichever fits and adjust the heading, badge,
description and `href`. A system that isn't live yet should use
`<div class="card pending">` with a `<span class="badge badge-pending">` instead of
`<a class="card" href="...">` with `badge-live` -- see git history for the exact markup
the two oven cards used before their dashboard shipped.

## Live status badges

The "Live" badge used to be a static claim typed into the markup -- it said Live whether
the collector had written a row thirty seconds ago or died three days ago.
`docs/status-check.js` now asks each system's API on page load and reports the answer:
**Checking** -> **Live**, **Stale**/**Stalled**, or **No response**, with the reason in
the badge's `title` and, where a real data age exists, a "Data 4 min old." line on the
card.

Two things to understand before extending it:

- **"Recent data" and "recent production" are different questions, and only some of these
  systems can answer the first.** A press that is genuinely down has perfectly fresh data
  saying so; calling that "stale" would be wrong. So each system uses the best *true*
  freshness signal it actually exposes rather than a forced symmetry -- the ovens report
  `age_s` and the log table reports `updatedAt` (both real data ages), while press and
  Granco fall back to their own server-computed `stalled` verdict.
  `seconds_since_last_billet` / `seconds_since_last_cut` are deliberately **not** used:
  both measure *production*, so a legitimately idle machine would read as a broken one.
- **Timestamps are only compared client-side when they are unambiguously UTC.** The
  press's billet `ts` is plant-local naive wall-clock, so subtracting it from `Date.now()`
  would be off by the whole UTC offset -- the same class of bug that once put a five-hour
  error in that project's stall banner. Where the server already computed an age or a
  verdict, that value is used as-is and no date maths happens here at all.

To add a checked card, give its `<li>`'s card element `data-status="<key>"` and add a
matching entry to `SOURCES` with a `url` and a `read()` that returns either
`{age: seconds}` (needs `staleAfterSeconds`) or `{stalled: bool}`. A card with no
`data-status` keeps its static badge. The timeout is 25s, sized for Render free-tier cold
starts.

Note that the checks only succeed from an allowed origin: `get-log-files` allows
`https://padp.github.io` specifically, so testing this page from `127.0.0.1` shows the
log-table card as "No response" even though production is fine. To test locally against
real origins, intercept `https://padp.github.io/**` in Playwright and fulfil it from
`docs/` rather than serving over `http://localhost`.

## Plant-network-only cards (Recipe Setpoint Sync, Vision System Database, Press History Search)

All three link to tools hosted locally on the plant LAN, not reachable from the public
internet -- ports 3005, 5057 and 3080 on `uacj-mengr45`. Two things make these different
from the other five:

- They're plain `http://`, not `https://`, and this page is served over `https://`.
  Browsers block active requests (`fetch`/`XHR`/`iframe`) from an https page to an http
  target as "mixed content" -- this is a hard platform rule, not something client-side
  code can work around. That means this page can never *check* whether a tool is
  reachable before the visitor clicks, and can never detect whether a click succeeded or
  failed.
- Both open in a new tab (`target="_blank"`) instead of navigating this page away. If the
  visitor isn't on the plant network, only that disposable new tab shows the browser's
  native connection-error page -- this homepage tab stays open. `docs/local-tool-hint.js`
  shows a small toast at the moment of the click (driven by each link's
  `data-local-notice` attribute) explaining that the tool only works on-site, since
  that's the best available substitute for detecting failure directly. Add
  `data-local-notice="..."` to any future local-only link to get the same toast for free.

Press History Search (`Press History UI/v2/p.html`) wasn't reachable by URL at all until
a static-file route was added to its Tornado backend (`file_server.py`) alongside the
existing API routes -- see the comment above `initialize_api()`'s static routes there.
That backend runs as a long-lived process via `scheduled/run_webapp.cmd`; it needs to be
restarted to pick up that change (it won't hot-reload on its own).

**Abandoned approach -- IP-based gating.** The original design hid this card entirely
and only revealed it once a client-side check matched the visitor's public IP against the
plant's known egress address. That was dropped: the plant's internet egress goes through
Cato Networks (a cloud SASE/SD-WAN provider), and by default Cato load-balances a site's
outbound traffic across a large, non-contiguous, shared pool of addresses rather than one
fixed IP -- confirmed by hitting IP-echo services from several on-site devices and getting
back different, unrelated netblocks each time (including one, `181.215.65.27`, that
wasn't even Cato -- a hosting/proxy provider called Datacamp Limited, suggesting that
device wasn't on the plant network at all when tested). Hardcoding wider and wider IP
ranges wouldn't converge, since Cato's published range for third-party firewall
allowlisting spans many regions worldwide -- that's their whole global customer base, not
this one site.

The real fix, if this is worth revisiting: Cato supports allocating a small number of
static public IPs per account and routing a site's traffic through them via a "NAT
Routing" network rule (Cato Learning Center: "Allocating IP Addresses for the Account",
"How to Configure a Network Rule to Egress Traffic"). Ask IT/your Cato admin to configure
that for the Paducah site; once traffic egresses through a known, fixed IP (or small set
of them), client-side gating can reliably work again -- an exact match against that
allocated IP, not a guessed CIDR range.

## Styling

`docs/styles.css` deliberately reuses the same design tokens, header gradient, card
radius and shadow as the other dashboards so the suite reads as one system. If the
palette changes there, change it here too.
