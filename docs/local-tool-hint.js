/*
 * Cards for tools that only work on the plant network (Vision System
 * Database, Press History Search, ...) open in a new tab and, at the
 * moment of the click, show a plain-language toast explaining that the
 * tool is plant-network only.
 *
 * This is the closest available substitute for detecting a failed
 * connection. Both tools are plain http://, and this page is served over
 * https://; browsers block active requests (fetch/XHR/iframe) from an
 * https page to an http target as "mixed content" regardless of network
 * location, so this page can never check reachability itself, or know
 * whether a click's new tab actually loaded. The toast is shown on every
 * click, success or failure alike, because "only on failure" isn't
 * something this page can know.
 *
 * Any element with a data-local-notice attribute gets this treatment --
 * add that attribute (with the message to show) to wire up a new one.
 */
(function () {
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
    document.querySelectorAll("[data-local-notice]").forEach((el) => {
      el.addEventListener("click", () => showToast(el.dataset.localNotice));
    });
  });
})();
