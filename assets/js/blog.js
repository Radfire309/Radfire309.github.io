/* Blog pages. Loads nothing, sends nothing.
   1. The compare slider: two pictures of the same ground, one over the other. The range input covers the
      picture, so a drag, a tap or the arrow keys move the line.
   2. The picture viewer: a picture link (a[data-view]) opens the picture large in a dialog on the page
      instead of leaving it. It closes with its button, Escape, or a click anywhere outside the picture,
      and focus goes back to the picture that opened it. Without JavaScript the link opens the file. */
(function () {
  "use strict";

  Array.prototype.forEach.call(document.querySelectorAll("[data-compare] .compare-frame"), function (frame) {
    var range = frame.querySelector(".compare-range");
    if (!range) return;
    function set() { frame.style.setProperty("--pos", range.value + "%"); }
    range.addEventListener("input", set);
    set();
  });

  var links = document.querySelectorAll("a[data-view]");
  if (!links.length || typeof HTMLDialogElement !== "function") return;

  var dialog = document.createElement("dialog");
  dialog.className = "viewer";
  dialog.setAttribute("aria-label", "Picture");
  dialog.innerHTML =
    '<button class="viewer-close" type="button" aria-label="Close">' +
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
    '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' +
    '</button><img class="viewer-img" alt=""><p class="viewer-cap"></p>';
  document.body.appendChild(dialog);
  var img = dialog.querySelector(".viewer-img");
  var cap = dialog.querySelector(".viewer-cap");
  var opener = null;

  function close() { if (dialog.open) dialog.close(); }

  dialog.querySelector(".viewer-close").addEventListener("click", close);
  dialog.addEventListener("click", function (ev) { if (ev.target !== img) close(); });
  dialog.addEventListener("close", function () {
    img.removeAttribute("src");
    if (opener) opener.focus();
  });

  Array.prototype.forEach.call(links, function (a) {
    a.addEventListener("click", function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button > 0) return;
      ev.preventDefault();
      var inner = a.querySelector("img");
      var fig = a.closest("figure");
      var fc = fig && fig.querySelector("figcaption");
      img.src = a.getAttribute("href");
      img.alt = inner ? inner.alt : "";
      cap.textContent = fc ? fc.textContent : "";
      cap.hidden = !cap.textContent;
      opener = a;
      dialog.showModal();
    });
  });
})();
