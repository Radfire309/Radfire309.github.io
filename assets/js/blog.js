/* Blog pages: the compare slider (two pictures of the same ground, one over the other). The range input
   covers the picture, so a drag, a tap or the arrow keys move the line. Loads nothing, sends nothing. */
(function () {
  "use strict";
  var frames = document.querySelectorAll("[data-compare] .compare-frame");
  Array.prototype.forEach.call(frames, function (frame) {
    var range = frame.querySelector(".compare-range");
    if (!range) return;
    function set() { frame.style.setProperty("--pos", range.value + "%"); }
    range.addEventListener("input", set);
    set();
  });
})();
