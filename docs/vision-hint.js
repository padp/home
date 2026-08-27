/*
 * The Vision System Database link opens in a new tab (see index.html) so a
 * failed connection off-site doesn't take out this homepage tab -- only the
 * disposable new tab shows the browser's native "can't reach this site"
 * page. This script's only job is to show a plain-language explanation at
 * click time.
 *
 * We deliberately don't try to detect whether the new tab actually loaded:
 * that isn't observable from here. Doing so would require a fetch/XHR/
 * iframe request to http://PAD-LAPTOP-03:5057, and browsers block that kind
 * of active request from an https:// page (mixed content) regardless of
 * network location -- there's no reliable signal to react to. So this note
 * is shown on every click, success or failure, rather than only on
 * failure, because "only on failure" isn't something this page can know.
 *
 * (Earlier attempt: gating this card's visibility by matching the
 * visitor's public IP against the plant's Cato Networks egress range. Cato
 * spreads egress across a large, non-contiguous, load-balanced pool by
 * default -- confirmed by hitting IP-echo services from several plant
 * devices and getting different, unrelated netblocks back each time -- so
 * that approach was dropped as unreliable. See README.md.)
 */
(function () {
  const LINK_ID = "vision-db-link";
  const MESSAGE =
    "Opening the Vision System Database in a new tab — it only loads " +
    "from the plant network. If that tab shows a connection error, that's why.";

  function showToast(message) {
    let toast = document.getElementById("hint-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "hint-toast";
      toast.className = "toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove("visible");
    void toast.offsetWidth; // restart the transition even if already visible
    toast.classList.add("visible");
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove("visible"), 6000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const link = document.getElementById(LINK_ID);
    if (!link) return;
    link.addEventListener("click", () => showToast(MESSAGE));
  });
})();
