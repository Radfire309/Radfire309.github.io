/* visits v1. Counts a visit and keeps nothing about the visitor: no cookie, nothing read from the page,
   nothing sent that could tell one person from another. The same file on every site; the page names its
   site in data-site. The rules are in the Teamchers repository, docs/VISITS.md. */
(function () {
  "use strict";
  var me = document.currentScript;
  if (!me) return;
  var site = me.getAttribute("data-site") || "";
  var url = me.getAttribute("data-endpoint") || "https://www.teamchers.com/v/hit/";
  var nav = navigator;
  var L = null;
  var S = null;
  try {
    L = window.localStorage;
    S = window.sessionStorage;
  } catch (e) {}

  /* The owner's switch: ?count=off on any page stops counting in this browser, ?count=on starts it again. */
  try {
    var q = new URLSearchParams(location.search).get("count");
    if (q === "off") L.setItem("visits-off", "1");
    if (q === "on") L.removeItem("visits-off");
    if (L.getItem("visits-off") === "1") return;
  } catch (e) {}

  if (!site || !window.fetch) return;
  if (nav.doNotTrack === "1" || window.doNotTrack === "1" || nav.globalPrivacyControl === true) return;
  if (nav.webdriver) return;

  /* The page that linked here: its host name only, and only a public one. An address made of numbers or
     a name on someone's own network is never sent. */
  var ref = "";
  var inside = false;
  try {
    var host = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "";
    inside = host !== "" && host === location.hostname;
    var homely = /^[0-9.]+$/.test(host) || /\.(local|lan|home|internal|localhost)$/.test(host);
    if (host && !inside && host.indexOf(".") > 0 && !homely) ref = host;
  } catch (e) {}

  /* Today, in the counter's own time zone, so a day here and a day there are the same day. */
  var today;
  try {
    today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
  } catch (e) {
    var d = new Date();
    today = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  /* "Counted today" stays in this browser and is never sent. It only decides the two flags below. A
     browser that keeps no notes is counted when it arrives from elsewhere, and not again as it moves
     from page to page of this site. */
  var visitor = inside ? 0 : 1;
  var visit = inside ? 0 : 1;
  try {
    visitor = L.getItem("visits-day") === today ? 0 : 1;
    if (visitor) L.setItem("visits-day", today);
  } catch (e) {}
  try {
    visit = S.getItem("visits-seen") === "1" ? 0 : 1;
    if (visit) S.setItem("visits-seen", "1");
  } catch (e) {}
  if (visitor) visit = 1;

  var body = JSON.stringify({
    v: 1,
    site: site,
    path: location.pathname.slice(0, 120),
    ref: ref.slice(0, 80),
    phone: window.matchMedia && window.matchMedia("(max-width: 767px)").matches ? 1 : 0,
    visit: visit,
    visitor: visitor
  });
  try {
    fetch(url, {
      method: "POST",
      body: body,
      mode: "cors",
      credentials: "omit",
      keepalive: true,
      headers: { "Content-Type": "text/plain" }
    }).catch(function () {});
  } catch (e) {}
})();
