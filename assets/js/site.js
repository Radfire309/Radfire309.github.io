/* Tony Benson, Radfire Labs. Theme toggle, the app functions picker, screens and the large view, the film player.
   The page reads completely without this file; it only adds switching and playing in place. */
(function () {
  "use strict";

  var root = document.documentElement;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ---------- Theme ---------- */
  var darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var toggle = document.querySelector("[data-theme-toggle]");

  function currentTheme() {
    var set = root.getAttribute("data-theme");
    if (set === "light" || set === "dark") return set;
    return darkQuery && darkQuery.matches ? "dark" : "light";
  }

  function labelToggle() {
    if (!toggle) return;
    var next = currentTheme() === "dark" ? "light" : "dark";
    toggle.setAttribute("aria-label", "Switch to " + next + " theme");
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      labelToggle();
    });
    if (darkQuery) {
      var onChange = function () { labelToggle(); };
      if (darkQuery.addEventListener) darkQuery.addEventListener("change", onChange);
      else if (darkQuery.addListener) darkQuery.addListener(onChange);
    }
    labelToggle();
  }

  /* ---------- Pictures that are not there yet ---------- */
  function markMissing(img) {
    var box = img.parentNode;
    if (box && box.classList) box.classList.add("is-missing");
  }
  each(document.querySelectorAll(".thumb img, .film-media img"), function (img) {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) markMissing(img);
    img.addEventListener("error", function () { markMissing(img); });
  });

  /* ---------- Films: a poster until tapped, then a native player ---------- */
  var narrowFilms = window.matchMedia ? window.matchMedia("(max-width: 767.98px)") : { matches: false };

  function playInPlace(link) {
    var poster = link.querySelector("img");
    var video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "none");
    if (poster && !link.classList.contains("is-missing")) video.poster = poster.getAttribute("src");
    video.src = link.getAttribute("href");
    var title = link.getAttribute("aria-label");
    if (title) video.setAttribute("aria-label", title.replace(/^Play /, ""));

    var box = document.createElement("div");
    box.className = link.className;
    box.appendChild(video);
    link.parentNode.replaceChild(box, link);

    /* A film in the film grid is the width of one tile, about 163 px on a phone: too small to read its
       captions. On a narrow screen the tile takes the whole row while its film plays (the CSS only acts
       under 768 px) and gives it back when another film starts or this one ends. */
    var tile = box.closest ? box.closest(".film") : null;
    if (tile) {
      tile.classList.add("is-wide");
      video.addEventListener("ended", function () { tile.classList.remove("is-wide"); });
      if (narrowFilms.matches && tile.scrollIntoView) tile.scrollIntoView({ block: "center", behavior: "instant" });
    }

    video.focus();
    var started = video.play();
    if (started && started.catch) started.catch(function () {});
    return video;
  }

  /* Starting one film pauses any other. */
  document.addEventListener("play", function (event) {
    var playing = event.target;
    each(document.querySelectorAll("video"), function (other) {
      if (other !== playing && !other.paused) other.pause();
    });
    each(document.querySelectorAll(".film.is-wide"), function (tile) {
      if (!tile.contains(playing)) tile.classList.remove("is-wide");
    });
  }, true);

  /* ---------- Screens: the strip switches the big picture ---------- */
  function slidesOf(showcase) { return showcase.querySelectorAll("[data-stage] > .slide"); }

  function show(showcase, index) {
    each(slidesOf(showcase), function (slide) {
      var on = slide.getAttribute("data-slide") === String(index);
      if (!on) {
        slide.hidden = true;
        each(slide.querySelectorAll("video"), function (v) { if (!v.paused) v.pause(); });
      } else {
        slide.hidden = false;
      }
    });
    each(showcase.querySelectorAll("[data-show]"), function (thumb) {
      if (thumb.getAttribute("data-show") === String(index)) thumb.setAttribute("aria-current", "true");
      else thumb.removeAttribute("aria-current");
    });
  }

  /* ---------- Large view (lightbox) ---------- */
  var box = null, boxImg, boxPan, boxZoom, boxCap, boxCount, boxPrev, boxNext, boxItems = [], boxAt = 0, opener = null, zoomed = false;

  function buildBox() {
    box = document.createElement("dialog");
    box.className = "lightbox";
    box.setAttribute("aria-label", "Screen, large view");
    box.innerHTML =
      '<div class="lb-inner">' +
        '<figure class="lb-figure"><div class="lb-pan"><img class="lb-img" alt="" draggable="false"></div><figcaption class="lb-cap">' +
          '<span class="lb-text"></span><span class="lb-count" aria-live="polite"></span></figcaption></figure>' +
        '<button type="button" class="lb-btn lb-prev" aria-label="Previous screen">' +
          '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<button type="button" class="lb-btn lb-next" aria-label="Next screen">' +
          '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<button type="button" class="lb-btn lb-zoom" aria-pressed="false">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15 15l5 5M10.5 8v5M8 10.5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' +
          '<span>Zoom</span></button>' +
        '<button type="button" class="lb-btn lb-close" aria-label="Close the large view">' +
          '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>' +
      "</div>";
    document.body.appendChild(box);
    boxImg = box.querySelector(".lb-img");
    boxPan = box.querySelector(".lb-pan");
    boxZoom = box.querySelector(".lb-zoom");
    boxZoom.addEventListener("click", function () { setZoom(!zoomed); });
    dragToPan(boxPan);
    boxCap = box.querySelector(".lb-text");
    boxCount = box.querySelector(".lb-count");
    boxPrev = box.querySelector(".lb-prev");
    boxNext = box.querySelector(".lb-next");
    boxPrev.addEventListener("click", function () { step(-1); });
    boxNext.addEventListener("click", function () { step(1); });
    box.querySelector(".lb-close").addEventListener("click", closeBox);
    box.addEventListener("click", function (event) {
      var t = event.target;
      if (t === box || t.classList.contains("lb-inner") || (t === boxPan && !zoomed)) closeBox();
    });
    box.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
      else if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
      else if (event.key === "Tab") {
        /* Keep focus inside the large view. */
        var keys = Array.prototype.filter.call(box.querySelectorAll("button, .lb-pan[tabindex]"), function (b) { return !b.hidden; });
        var at = keys.indexOf(document.activeElement);
        event.preventDefault();
        keys[(at + (event.shiftKey ? -1 : 1) + keys.length) % keys.length].focus();
      }
    });
    /* Escape: the dialog closes itself; this puts focus and scroll back. */
    box.addEventListener("close", afterClose);
  }

  /* Zoom: the picture at its real detail (one image pixel to one screen pixel, and at least twice the fitted
     width) inside an area the visitor scrolls or drags around; a second press returns to the fitted view.
     Showing another picture, opening and closing all reset it. */
  function setZoom(on) {
    if (on === zoomed || !box) return;
    var item = boxItems[boxAt];
    if (on) {
      var fitted = boxImg.getBoundingClientRect().width || item.w;
      var target = Math.max(item.w / (window.devicePixelRatio || 1), fitted * 2);
      if (target > item.w) target = item.w;
      if (target < fitted * 1.5) target = fitted * 1.5;
      boxImg.style.width = Math.round(target) + "px";
      boxPan.setAttribute("tabindex", "0");
      boxPan.setAttribute("role", "region");
      boxPan.setAttribute("aria-label", "Zoomed picture. Scroll or drag to look around.");
    } else {
      boxImg.style.width = "";
      boxPan.removeAttribute("tabindex");
      boxPan.removeAttribute("role");
      boxPan.removeAttribute("aria-label");
    }
    zoomed = on;
    box.classList.toggle("is-zoomed", on);
    boxZoom.setAttribute("aria-pressed", on ? "true" : "false");
    boxPan.scrollLeft = on ? (boxPan.scrollWidth - boxPan.clientWidth) / 2 : 0;
    boxPan.scrollTop = on ? (boxPan.scrollHeight - boxPan.clientHeight) / 2 : 0;
  }

  /* A mouse drags the picture around; a finger scrolls the area itself. */
  function dragToPan(pan) {
    var start = null;
    pan.addEventListener("pointerdown", function (event) {
      if (!zoomed || event.pointerType !== "mouse" || event.button !== 0) return;
      start = { x: event.clientX, y: event.clientY, left: pan.scrollLeft, top: pan.scrollTop };
      pan.classList.add("is-dragging");
      if (pan.setPointerCapture) pan.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    pan.addEventListener("pointermove", function (event) {
      if (!start) return;
      pan.scrollLeft = start.left - (event.clientX - start.x);
      pan.scrollTop = start.top - (event.clientY - start.y);
    });
    var end = function () { start = null; pan.classList.remove("is-dragging"); };
    pan.addEventListener("pointerup", end);
    pan.addEventListener("pointercancel", end);
  }

  function render() {
    setZoom(false);
    var item = boxItems[boxAt];
    boxImg.src = item.src;
    boxImg.width = item.w;
    boxImg.height = item.h;
    boxImg.alt = item.alt;
    boxCap.textContent = item.caption;
    boxCount.textContent = boxItems.length > 1 ? (boxAt + 1) + " of " + boxItems.length : "";
    boxPrev.hidden = boxNext.hidden = boxItems.length < 2;
  }

  function step(delta) {
    if (boxItems.length < 2) return;
    boxAt = (boxAt + delta + boxItems.length) % boxItems.length;
    render();
  }

  function itemOf(el) {
    return {
      src: el.getAttribute("data-src"),
      w: +el.getAttribute("data-w"), h: +el.getAttribute("data-h"),
      alt: el.getAttribute("data-alt") || "",
      caption: el.getAttribute("data-caption") || ""
    };
  }

  /* A showcase: every screen it has, opened on the one that was tapped. */
  function openBox(showcase, slideIndex, from) {
    var items = [], at = 0;
    each(slidesOf(showcase), function (slide) {
      if (!slide.hasAttribute("data-src")) return;
      if (slide.getAttribute("data-slide") === String(slideIndex)) at = items.length;
      items.push(itemOf(slide));
    });
    return openItems(items, at, from);
  }

  function openItems(items, at, from) {
    if (!items.length) return false;
    if (!box) buildBox();
    boxItems = items;
    boxAt = at;
    opener = from;
    render();
    root.classList.add("lb-open");
    if (box.showModal) box.showModal(); else box.setAttribute("open", "");
    box.querySelector(".lb-close").focus();
    return true;
  }

  function closeBox() {
    if (!box) return;
    if (box.close && box.open) box.close(); else { box.removeAttribute("open"); afterClose(); }
  }

  function afterClose() {
    setZoom(false);
    root.classList.remove("lb-open");
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  }

  /* ---------- One click handler for films, the strip and the large view ---------- */
  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
    var t = event.target.closest ? event.target : null;
    if (!t) return;

    var thumb = t.closest("[data-show]");
    if (thumb) {
      var showcase = thumb.closest(".showcase");
      if (!showcase) return;
      event.preventDefault();
      var index = thumb.getAttribute("data-show");
      show(showcase, index);
      if (thumb.hasAttribute("data-play")) {
        var slide = showcase.querySelector('.slide[data-slide="' + index + '"]');
        var link = slide && slide.querySelector("a[data-film]");
        if (link) playInPlace(link);
        else {
          var v = slide && slide.querySelector("video");
          if (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); v.focus(); }
        }
      }
      return;
    }

    var zoom = t.closest("a[data-zoom]");
    if (zoom) {
      var sc = zoom.closest(".showcase");
      var fig = zoom.closest(".slide");
      if (sc && fig && openBox(sc, fig.getAttribute("data-slide"), zoom)) event.preventDefault();
      return;
    }

    /* A smaller card: its picture opens the large view on every screen that card has. */
    var set = t.closest("a[data-zoom-set]");
    if (set) {
      var card = set.closest(".mini");
      var screens = [];
      each(card ? card.querySelectorAll("[data-item]") : [], function (el) { screens.push(itemOf(el)); });
      if (openItems(screens, 0, set)) event.preventDefault();
      return;
    }

    var film = t.closest("a[data-film]");
    if (film) {
      event.preventDefault();
      playInPlace(film);
    }
  });

  /* ---------- Contact address, from one place ---------- */
  /* The build writes the mailto link into the contact block; the picker reads the same attribute. */
  var contactEl = document.querySelector("[data-contact]");
  var contactValue = contactEl ? (contactEl.getAttribute("data-contact") || "").trim() : "";
  var contactOk = /^[^\s@<>"'?&#]+@[^\s@<>"'?&#]+\.[A-Za-z]{2,}$/.test(contactValue);

  /* ---------- What I can build into your app: the picker ---------- */
  (function picker() {
    var root = document.querySelector("[data-picker]");
    if (!root) return;
    var total = root.querySelectorAll("[data-pick]").length;
    var list = root.querySelector("[data-pick-list]");
    var empty = root.querySelector("[data-pick-empty]");
    var countEl = root.querySelector("[data-pick-count]");
    var status = root.querySelector("[data-pick-status]");
    var send = root.querySelector("[data-pick-send]");
    var hint = root.querySelector("[data-pick-hint]");
    var allBtn = root.querySelector("[data-pick-all]");
    var clearBtn = root.querySelector("[data-pick-clear]");
    var bar = root.querySelector("[data-pick-bar]");
    var barCount = root.querySelector("[data-pick-bar-count]");
    var goalBox = root.querySelector("[data-pick-goals]");
    var goalList = root.querySelector("[data-pick-goal-list]");
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var items = [];          /* catalogue order: { id, name, line, button, chips, row, direct } */
    var byId = {};
    var goals = [];          /* { id, label, picks, button, on } */
    var goalById = {};
    var mail = {};
    try { mail = JSON.parse(root.getAttribute("data-mail") || "{}") || {}; } catch (err) { mail = {}; }
    var emptyHint = mail.empty_hint || hint.textContent;
    var STORE = "portfolio-picker";

    /* Each tile arrives as a plain card; it becomes a real toggle button here. */
    function toButton(span, attr) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = span.className;
      button.setAttribute(attr, span.getAttribute(attr));
      button.setAttribute("aria-pressed", "false");
      while (span.firstChild) button.appendChild(span.firstChild);
      span.parentNode.replaceChild(button, span);
      return button;
    }
    each(root.querySelectorAll(".pick-item"), function (li) {
      var span = li.querySelector(".pick");
      var id = span.getAttribute("data-pick");
      var button = toButton(span, "data-pick");
      var chips = [];
      each(li.querySelectorAll(".pick-built a"), function (a) {
        chips.push({ name: a.textContent, href: a.getAttribute("href") });
      });
      var item = {
        id: id,
        name: button.querySelector(".pick-name").textContent,
        line: button.querySelector(".pick-line").textContent,
        icon: button.querySelector(".pick-icon").innerHTML,
        button: button, chips: chips, row: null, direct: false
      };
      items.push(item);
      byId[id] = item;
    });
    each(root.querySelectorAll(".goal-item"), function (li) {
      var span = li.querySelector(".goal");
      var id = span.getAttribute("data-goal");
      var picks = (span.getAttribute("data-goal-picks") || "").split(" ").filter(function (p) { return byId[p]; });
      var button = toButton(span, "data-goal");
      var g = { id: id, label: button.querySelector(".goal-name").textContent, picks: picks, button: button, on: false };
      goals.push(g);
      goalById[id] = g;
    });
    root.classList.add("is-ready");

    function goalsFor(it) { return goals.filter(function (g) { return g.on && g.picks.indexOf(it.id) >= 0; }); }
    function isOn(it) { return it.direct || goalsFor(it).length > 0; }
    function picked() { return items.filter(function (it) { return !!it.row; }); }
    function chosenGoals() { return goals.filter(function (g) { return g.on; }); }

    function makeRow(it) {
      var row = document.createElement("li");
      row.className = "panel-item";
      row.setAttribute("data-row", it.id);
      var html = '<span class="panel-icon" aria-hidden="true">' + it.icon + "</span>" +
        '<div class="panel-item-text"><p class="panel-item-name"></p><p class="panel-item-line"></p>';
      if (it.chips.length) html += '<div class="panel-built"><span class="panel-built-label">Built in:</span><ul role="list"></ul></div>';
      html += '</div><button type="button" class="panel-remove"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
        '<path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg></button>';
      row.innerHTML = html;
      row.querySelector(".panel-item-name").textContent = it.name;
      row.querySelector(".panel-item-line").textContent = it.line;
      row.querySelector(".panel-remove").setAttribute("aria-label", "Remove " + it.name);
      var ul = row.querySelector(".panel-built ul");
      it.chips.forEach(function (c) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.className = "built-chip";
        a.href = c.href;
        a.textContent = c.name;
        li.appendChild(a);
        ul.appendChild(li);
      });
      return row;
    }

    /* The email: goals first, then the parts, each on its own line. */
    function mailHref(gs, sel) {
      var lines = [mail.greeting || "Hello Tony,", "", mail.need || "I need a tool for my business."];
      if (gs.length) {
        lines.push("", mail.goals_heading || "What it should do:");
        gs.forEach(function (g) { lines.push("- " + g.label); });
      }
      lines.push("", mail.parts_heading || "Parts it may need:");
      sel.forEach(function (it) { lines.push("- " + it.name); });
      lines.push("", mail.about || "About the business:", "", mail.reach || "Best way to reach me:", "");
      return "mailto:" + contactValue + "?subject=" + encodeURIComponent(mail.subject || "A tool for my business") +
        "&body=" + encodeURIComponent(lines.join("\r\n"));
    }

    function save() {
      try {
        var data = {
          goals: chosenGoals().map(function (g) { return g.id; }),
          picks: items.filter(function (it) { return it.direct; }).map(function (it) { return it.id; })
        };
        if (data.goals.length || data.picks.length) window.sessionStorage.setItem(STORE, JSON.stringify(data));
        else window.sessionStorage.removeItem(STORE);
      } catch (err) { /* storage can be blocked; the picker works without it */ }
    }

    function restore() {
      try {
        var data = JSON.parse(window.sessionStorage.getItem(STORE) || "null");
        if (!data) return;
        (Array.isArray(data.goals) ? data.goals : []).forEach(function (id) { if (goalById[id]) goalById[id].on = true; });
        (Array.isArray(data.picks) ? data.picks : []).forEach(function (id) { if (byId[id]) byId[id].direct = true; });
      } catch (err) { /* ignore */ }
    }

    function update(message) {
      var sel = picked();
      var gs = chosenGoals();
      var n = sel.length;
      countEl.textContent = n + " of " + total;
      root.classList.toggle("has-picks", n > 0);
      empty.hidden = n > 0;
      if (goalBox) {
        goalBox.hidden = gs.length === 0;
        goalList.textContent = "";
        gs.forEach(function (g) {
          var li = document.createElement("li");
          li.textContent = g.label;
          goalList.appendChild(li);
        });
      }
      if (n > 0 && contactOk) {
        send.setAttribute("href", mailHref(gs, sel));
        send.removeAttribute("aria-disabled");
        hint.hidden = true;
      } else {
        send.removeAttribute("href");
        send.setAttribute("aria-disabled", "true");
        hint.hidden = false;
        hint.textContent = contactOk ? emptyHint : "The contact address is not set yet.";
      }
      allBtn.disabled = items.every(function (x) { return x.direct; });
      clearBtn.disabled = n === 0 && gs.length === 0;
      if (bar) {
        bar.hidden = n === 0;
        barCount.textContent = n === 1 ? "1 function picked" : n + " functions picked";
      }
      var summary = n === 0 ? "Nothing picked yet. " + total + " functions on offer." :
        n + " of " + total + " functions picked.";
      if (message !== undefined) status.textContent = (message ? message + " " : "") + summary;
      save();
    }

    function animateIn(row, delay) {
      if (reduced) return;
      row.classList.add("is-new");
      if (delay) row.style.animationDelay = delay + "ms";
      row.addEventListener("animationend", function done() {
        row.classList.remove("is-new");
        row.style.animationDelay = "";
        row.removeEventListener("animationend", done);
      });
    }

    function settle(button) {
      if (reduced) return;
      button.classList.remove("is-settling");
      void button.offsetWidth;  /* restart the animation */
      button.classList.add("is-settling");
    }

    function setShown(it, on, delay, quiet) {
      if (!!it.row === on) return false;
      it.button.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) {
        it.row = makeRow(it);
        /* keep the list in catalogue order */
        var after = null;
        for (var k = items.indexOf(it) + 1; k < items.length; k++) {
          if (items[k].row && items[k].row.parentNode === list) { after = items[k].row; break; }
        }
        list.insertBefore(it.row, after);
        if (!quiet) { animateIn(it.row, delay); settle(it.button); }
      } else {
        if (it.row && it.row.parentNode) it.row.parentNode.removeChild(it.row);
        it.row = null;
      }
      return true;
    }

    /* Show what the goals and the direct picks add up to. */
    function sync(quiet) {
      var added = 0;
      goals.forEach(function (g) { g.button.setAttribute("aria-pressed", g.on ? "true" : "false"); });
      items.forEach(function (it) { if (setShown(it, isOn(it), Math.min(added, 12) * 35, quiet) && isOn(it)) added++; });
    }

    function names(gs) { return gs.map(function (g) { return g.label; }).join(", "); }

    root.addEventListener("click", function (event) {
      var t = event.target;
      var goalBtn = t.closest("button[data-goal]");
      if (goalBtn) {
        var g = goalById[goalBtn.getAttribute("data-goal")];
        g.on = !g.on;
        sync();
        update(g.label + (g.on ? " chosen." : " released."));
        return;
      }
      var tile = t.closest("button[data-pick]");
      if (tile) {
        toggleDirect(byId[tile.getAttribute("data-pick")]);
        return;
      }
      var remove = t.closest(".panel-remove");
      if (remove) {
        var row = remove.closest(".panel-item");
        var gone = byId[row.getAttribute("data-row")];
        var next = row.nextElementSibling || row.previousElementSibling;
        toggleDirect(gone, true);
        if (gone.row) remove.focus();
        else if (next) next.querySelector(".panel-remove").focus();
        else countEl.focus();
        return;
      }
      if (t.closest("[data-pick-all]")) {
        items.forEach(function (x) { x.direct = true; });
        sync();
        update("All picked.");
        return;
      }
      if (t.closest("[data-pick-clear]")) {
        items.forEach(function (x) { x.direct = false; });
        goals.forEach(function (x) { x.on = false; });
        sync();
        update("List cleared.");
        countEl.focus();
        return;
      }
      if (t.closest("[data-pick-send]") && !picked().length) event.preventDefault();
    });

    /* A tile or a remove button changes the visitor's own pick; a goal can still need the function. */
    function toggleDirect(it, removeOnly) {
      var on = removeOnly ? false : !it.direct;
      it.direct = on;
      sync();
      var by = goalsFor(it);
      if (on) update(it.name + " added.");
      else if (it.row && by.length) update(it.name + " stays on your list, because " + names(by) + " needs it. Release that need to take it off.");
      else update(it.name + " removed.");
    }

    /* A chip jump lights up the card or showcase it lands on. */
    document.addEventListener("click", function (event) {
      var chip = event.target.closest && event.target.closest("a.built-chip");
      if (!chip) return;
      var target = document.querySelector(chip.getAttribute("href"));
      if (!target) return;
      target.classList.remove("is-landed");
      void target.offsetWidth;
      target.classList.add("is-landed");
      window.setTimeout(function () { target.classList.remove("is-landed"); }, 2200);
    });

    countEl.setAttribute("tabindex", "-1");
    restore();
    sync(true);
    update();
    /* Coming back by the browser's back button can restore the page from memory; show the saved list again. */
    window.addEventListener("pageshow", function (event) {
      if (!event.persisted) return;
      goals.forEach(function (x) { x.on = false; });
      items.forEach(function (x) { x.direct = false; });
      restore();
      sync(true);
      update();
    });
  })();

  /* ==========================================================================
     Websites page: the starter and the slim "Start" bar. Runs only where the
     page has [data-starter]; without this file the starter is a plain email
     link with the template already in it.
     ========================================================================== */
  (function websitesStarter() {
    var starter = document.querySelector("[data-starter]");
    if (!starter) return;
    var data;
    try { data = JSON.parse(starter.querySelector("[data-starter-data]").textContent); } catch (err) { return; }
    var address = (starter.getAttribute("data-contact") || "").trim();
    if (!/^[^\s@<>"'?&#]+@[^\s@<>"'?&#]+\.[A-Za-z]{2,}$/.test(address)) return;
    var send = starter.querySelector("[data-starter-send]");
    var summaryText = starter.querySelector("[data-starter-summary-text]");
    var noteBox = starter.querySelector("[data-starter-sample]");
    var noteText = starter.querySelector("[data-starter-sample-text]");
    var STORE = "websites-starter";
    var state = { picks: {}, sample: "" };

    function fill(template, values) {
      return String(template || "").replace(/\{(\w+)\}/g, function (m, k) { return values[k] !== undefined ? values[k] : m; });
    }

    /* The picked option labels of one question, in the order they are listed. */
    function labelsOf(q) {
      var chosen = state.picks[q.id] || [];
      var out = [];
      Object.keys(q.options).forEach(function (id) { if (chosen.indexOf(id) >= 0) out.push(q.options[id]); });
      return out;
    }

    function joinLabels(list) {
      return list.map(function (t, i) { return i ? t.charAt(0).toLowerCase() + t.slice(1) : t; }).join(", ");
    }

    function bodyLines() {
      var lines = [];
      data.body.forEach(function (line) {
        if (line.trim() !== "{picks}") { lines.push(line); return; }
        data.questions.forEach(function (q) { lines.push(q.label + ": " + joinLabels(labelsOf(q))); });
        var s = state.sample && data.samples[state.sample];
        if (s && data.sampleLine) lines.push(fill(data.sampleLine, s));
      });
      return lines;
    }

    function mailHref() {
      return "mailto:" + address + "?subject=" + encodeURIComponent(data.subject) +
        "&body=" + encodeURIComponent(bodyLines().join("\r\n"));
    }

    function save() {
      try { sessionStorage.setItem(STORE, JSON.stringify(state)); } catch (err) {}
    }

    function render() {
      each(starter.querySelectorAll("[data-q]"), function (group) {
        var chosen = state.picks[group.getAttribute("data-q")] || [];
        each(group.querySelectorAll("[data-option]"), function (b) {
          b.setAttribute("aria-pressed", chosen.indexOf(b.getAttribute("data-option")) >= 0 ? "true" : "false");
        });
      });
      var s = state.sample && data.samples[state.sample];
      noteBox.hidden = !s;
      if (s) noteText.textContent = fill(data.sampleNote, s);
      var parts = [];
      data.questions.forEach(function (q) {
        var l = labelsOf(q);
        if (l.length) parts.push(q.label + ": " + joinLabels(l) + ".");
      });
      if (s) parts.push(fill(data.sampleLine, s) + ".");
      /* The summary is a polite live region, so it is written only when a pick changes it. */
      var text = parts.length ? parts.join(" ") : data.summaryEmpty;
      if (summaryText.textContent !== text) summaryText.textContent = text;
      send.setAttribute("href", mailHref());
      save();
    }

    starter.addEventListener("click", function (event) {
      var b = event.target.closest("[data-option]");
      if (b) {
        var group = b.closest("[data-q]");
        var qid = group.getAttribute("data-q");
        var id = b.getAttribute("data-option");
        var chosen = (state.picks[qid] || []).slice();
        var at = chosen.indexOf(id);
        if (group.getAttribute("data-kind") === "multiple") {
          if (at >= 0) chosen.splice(at, 1); else chosen.push(id);
        } else {
          chosen = at >= 0 ? [] : [id];
        }
        state.picks[qid] = chosen;
        render();
        return;
      }
      if (event.target.closest("[data-starter-sample-clear]")) {
        state.sample = "";
        render();
        var first = starter.querySelector("[data-option]");
        if (first) first.focus();
      }
    });

    /* #start-heating and the like: the page has an anchor of that name at the starter, so the browser
       goes there by itself (smoothly unless reduced motion is asked for); this notes the sample. */
    function fromHash() {
      var m = /^#start-([a-z0-9-]+)$/.exec(location.hash || "");
      if (!m || !data.samples[m[1]]) return;
      state.sample = m[1];
      render();
    }

    try {
      var saved = JSON.parse(sessionStorage.getItem(STORE) || "null");
      if (saved && typeof saved === "object") {
        data.questions.forEach(function (q) {
          var list = saved.picks && saved.picks[q.id];
          if (Array.isArray(list)) state.picks[q.id] = list.filter(function (id) { return q.options[id]; });
        });
        if (saved.sample && data.samples[saved.sample]) state.sample = saved.sample;
      }
    } catch (err) {}
    render();
    fromHash();
    window.addEventListener("hashchange", fromHash);

    /* The slim bar: shown on a phone once the top has scrolled away, hidden while the starter is in view. */
    var bar = document.querySelector("[data-ws-bar]");
    var hero = document.querySelector(".ws-hero");
    var section = document.getElementById("start");
    if (!bar || !hero || !section || !("IntersectionObserver" in window)) return;
    var heroGone = false, startSeen = false;
    function place() { bar.classList.toggle("is-shown", heroGone && !startSeen); }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { heroGone = !en.isIntersecting; });
      place();
    }, { threshold: 0 }).observe(hero);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { startSeen = en.isIntersecting; });
      place();
    }, { threshold: 0, rootMargin: "0px 0px -15% 0px" }).observe(section);
  })();

  /* ==========================================================================
     Main page: the menus and the Back button. The menus are plain links and
     need nothing from here. This keeps the browser's Back button honest:
     after a jump to a section, the address used to keep the section's name
     (#films), and a page that came back that way could slide on its own to
     that section a moment after showing the visitor where they were.
     - A jump inside the page scrolls to the section and adds a history step
       with the plain address, so Back inside the page still undoes the jump
       and the address never carries a section name to slide back to.
     - A shared link that ends in a section name (#websites) opens there as
       usual; once the page has loaded, the name is taken off the address.
     - Leaving the page stops a slide that is still running, so a page kept
       in memory does not finish it when the visitor comes back.
     ========================================================================== */
  (function stayPut() {
    if (!document.body.classList.contains("page-home")) return;
    if (!window.history || !history.pushState || !history.replaceState) return;
    var plain = function () { return location.pathname + location.search; };
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function targetOf(link) {
      var href = link.getAttribute("href") || "";
      if (href.charAt(0) !== "#" || href.length < 2) return null;
      var id;
      try { id = decodeURIComponent(href.slice(1)); } catch (err) { return null; }
      return document.getElementById(id);
    }

    /* Where focus goes after a jump, as a fragment link would put it: the element itself if it can take
       focus, else the heading that names it, else the element made focusable for this. */
    function focusAfterJump(target) {
      var el = target;
      if (!target.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) {
        var named = target.getAttribute("aria-labelledby");
        var heading = named && document.getElementById(named.split(" ")[0]);
        el = heading || target;
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      }
      try { el.focus({ preventScroll: true }); } catch (err) { el.focus(); }
    }

    document.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var link = event.target.closest && event.target.closest("a[href^='#']");
      if (!link) return;
      var target = targetOf(link);
      if (!target) return;
      event.preventDefault();
      history.pushState(null, "", plain());
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      focusAfterJump(target);
    });

    /* A shared link with a section name: the browser has already opened it there. */
    function cleanAddress() {
      if (location.hash && location.hash.length > 1) history.replaceState(history.state, "", plain());
    }
    if (document.readyState === "complete") window.setTimeout(cleanAddress, 0);
    else window.addEventListener("load", function () { window.setTimeout(cleanAddress, 0); });

    /* Leaving mid-slide: stop where the page is. */
    window.addEventListener("pagehide", function () {
      try { window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: "instant" }); }
      catch (err) { window.scrollTo(window.scrollX, window.scrollY); }
    });
  })();

  /* ---------- Footer year ---------- */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
