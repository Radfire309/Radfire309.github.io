/* Blog pages. Loads nothing, sends nothing.
   1. The compare slider: two pictures of the same ground, one over the other. The range input covers the
      picture, so a drag, a tap or the arrow keys move the line.
   2. A report's "Print or save as PDF" button (data-print) opens the browser's print dialog. */
(function () {
  "use strict";

  Array.prototype.forEach.call(document.querySelectorAll("[data-compare] .compare-frame"), function (frame) {
    var range = frame.querySelector(".compare-range");
    if (!range) return;
    function set() { frame.style.setProperty("--pos", range.value + "%"); }
    range.addEventListener("input", set);
    set();
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-print]"), function (b) {
    b.addEventListener("click", function () { window.print(); });
  });

})();
