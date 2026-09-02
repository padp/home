/*
 * Replaces the hard-coded "Live" badge with what each system's API actually
 * says right now.
 *
 * The badge used to be a static claim in the markup: it read "Live" whether the
 * collector had written a row in the last thirty seconds or died three days
 * ago. This asks each API and reports the answer.
 *
 * The badge in the card's top-right corner is the ONLY thing this writes to -
 * Live / Stale / Stalled / No response, with the detail (including data age,
 * where a real one exists) in its title tooltip. An earlier version also
 * appended a "Data 4 min old." line into the card body; that was redundant
 * with the badge it sat under and is gone.
 *
 * Two things worth knowing before changing any of this:
 *
 * 1. "Recent data" and "recent production" are NOT the same question, and only
 *    some of these systems can answer the first one. A press that is genuinely
 *    down has perfectly fresh data saying so - reporting that as "stale" would
 *    be wrong. So each system below uses the best TRUE freshness signal it
 *    actually exposes, rather than pretending to a symmetry that isn't there:
 *
 *      oven      age_s on /current            - real data age, server-computed
 *      logtable  updatedAt on /table-state    - real data age, genuine UTC
 *      press     stalled on /press/status     - the system's own verdict
 *      granco    stalled on /status           - the system's own verdict
 *
 *    seconds_since_last_billet / seconds_since_last_cut are deliberately NOT
 *    used as freshness: both measure production activity, so a legitimately
 *    idle machine would be reported as a broken one.
 *
 * 2. Timestamps are only ever compared client-side when they are unambiguously
 *    UTC. The press's own billet ts is plant-local naive wall-clock, so
 *    subtracting it from Date.now() would be off by the whole UTC offset -
 *    exactly the class of bug that put a 5-hour error in that project's stall
 *    banner. Where the server already computed an age or a verdict, that value
 *    is used as-is and no date maths happens here at all.
 *
 * The three plant-network-only cards (Recipe Setpoint Sync, Vision System
 * Database, Press History Search) are deliberately NOT checked and carry no
 * data-status attribute. They are plain http:// and this page is https://, so
 * the browser blocks the request as mixed content before it is even sent -
 * a platform rule, not something to work around. See README.md.
 */
(function () {
  "use strict";

  // Render's free tier sleeps when idle, so the first request of the day can
  // spend most of a minute waking the service up. Long enough to let that
  // finish, short enough that a genuinely dead endpoint resolves while someone
  // is still looking at the page.
  var TIMEOUT_MS = 25000;

  var SOURCES = {
    logtable: {
      url: "https://get-log-files.onrender.com/api/table-state",
      // Collector cycle is 60s; anything past 15 min means it stopped.
      staleAfterSeconds: 900,
      read: function (data) {
        var raw = data && data.updatedAt;
        // Mongo extended JSON: {"$date": "...Z"}. Genuine UTC, safe to compare.
        var iso = raw && (typeof raw === "object" ? raw.$date : raw);
        if (!iso) return { age: null };
        var ms = Date.parse(iso);
        if (isNaN(ms)) return { age: null };
        return { age: (Date.now() - ms) / 1000 };
      }
    },
    press: {
      url: "https://picos-a6fx.onrender.com/api/press/status",
      read: function (data) {
        // No true data-age field here, so fall back to the server's own
        // stall verdict, which is computed against the plant clock correctly.
        return { stalled: !!(data && data.stalled) };
      }
    },
    granco: {
      url: "https://granco-monitor.onrender.com/api/status",
      read: function (data) {
        return { stalled: !!(data && data.stalled) };
      }
    },
    "oven-large": {
      url: "https://oven-monitor.onrender.com/api/oven/large/current",
      staleAfterSeconds: 900,
      read: readOvenAge
    },
    "oven-small": {
      url: "https://oven-monitor.onrender.com/api/oven/small/current",
      staleAfterSeconds: 900,
      read: readOvenAge
    }
  };

  function readOvenAge(data) {
    var age = data && data.age_s;
    return { age: typeof age === "number" ? age : null };
  }

  function describeAge(seconds) {
    if (seconds < 90) return "just now";
    var mins = Math.round(seconds / 60);
    if (mins < 60) return mins + " min old";
    var hours = Math.round(mins / 6) / 10;
    if (hours < 48) return hours + " hr old";
    return Math.round(hours / 24) + " days old";
  }

  function setBadge(card, cls, text, title) {
    var badge = card.querySelector(".badge");
    if (!badge) return;
    badge.className = "badge " + cls;
    badge.textContent = text;
    if (title) badge.title = title;
  }

  function check(card, key) {
    var source = SOURCES[key];
    if (!source) return;

    setBadge(card, "badge-checking", "Checking", "Asking the API whether its data is current");

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    fetch(source.url, { signal: controller.signal, cache: "no-store" })
      .then(function (resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.json();
      })
      .then(function (data) {
        var result = source.read(data) || {};

        if (typeof result.age === "number") {
          var stale = result.age > source.staleAfterSeconds;
          setBadge(
            card,
            stale ? "badge-stale" : "badge-live",
            stale ? "Stale" : "Live",
            stale
              ? "The API answered, but its most recent data is " + describeAge(result.age) +
                " - the collector may have stopped."
              : "The API is responding and its data is " + describeAge(result.age) + "."
          );
          return;
        }

        if (typeof result.stalled === "boolean") {
          setBadge(
            card,
            result.stalled ? "badge-stale" : "badge-live",
            result.stalled ? "Stalled" : "Live",
            result.stalled
              ? "The API is responding and reports the equipment as stalled."
              : "The API is responding and reports no stall."
          );
          return;
        }

        // Answered, but not in a shape we can judge. Reachable is still
        // worth something; claiming more than that would not be.
        setBadge(card, "badge-live", "Live", "The API is responding.");
      })
      .catch(function (err) {
        var aborted = err && err.name === "AbortError";
        setBadge(
          card,
          "badge-down",
          "No response",
          aborted
            ? "No answer within " + Math.round(TIMEOUT_MS / 1000) +
              "s. The dashboard may still open - its API can be slow to wake after being idle."
            : "Could not reach the API (" + (err && err.message ? err.message : "network error") +
              "). The dashboard itself may still open."
        );
      })
      .then(function () { clearTimeout(timer); });
  }

  function init() {
    if (typeof fetch !== "function" || typeof AbortController !== "function") return;
    var cards = document.querySelectorAll("[data-status]");
    Array.prototype.forEach.call(cards, function (card) {
      check(card, card.getAttribute("data-status"));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
