/* =====================================================
   THE STORY PAGE: all the movement on story.html
   One loop (tick) runs every frame. It reads how far you have scrolled through each section
   (0 = just arrived, 1 = about to leave) and moves that section's pieces to match.
   ===================================================== */
(function () {
  "use strict";
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;   // "less movement" switched on
  var PHONE = window.matchMedia("(max-width: 760px)").matches;
  var $ = function (id) { return document.getElementById(id); };
  var vh = window.innerHeight, vw = window.innerWidth;

  // small helpers
  function clamp(v, a, b) { return Math.max(a === undefined ? 0 : a, Math.min(b === undefined ? 1 : b, v)); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }                       // fast start, soft landing
  // how far through a tall section we are: 0 when its top reaches the top of the screen, 1 when its bottom reaches the bottom
  function progress(el) { var r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - vh)); }

  /* =====================================================
     THE TITLE: "the story of ms" split into letters that rise one by one
     ===================================================== */
  var title = $("title"), letters = [];
  title.innerHTML = title.textContent.split(" ").map(function (w) {
    return '<span class="w" aria-hidden="true">' + w.split("").map(function (c) { return '<span class="l">' + c + "</span>"; }).join("") + "</span>";
  }).join(" ");
  letters = Array.prototype.slice.call(title.querySelectorAll(".l"));
  letters.forEach(function (l, i) { l.style.setProperty("--i", i); });
  // as soon as the page is ready, the letters rise (style.css: .st-title.is-in)
  requestAnimationFrame(function () { requestAnimationFrame(function () { title.classList.add("is-in"); $("open").classList.add("is-in"); }); });

  /* =====================================================
     THE TEXT THAT FILLS IN: every word gets its own span
     ===================================================== */
  var fill = $("fill");
  fill.innerHTML = fill.textContent.trim().split(/\s+/).map(function (w) { return '<span class="wd">' + w + "</span>"; }).join(" ");
  var words = Array.prototype.slice.call(fill.querySelectorAll(".wd"));

  /* =====================================================
     HOW IT WORKS: drag the row of steps sideways (with a little glide when you let go)
     ===================================================== */
  var track = $("track"), tx = 0, vx = 0, dragging = false, lastX = 0;
  function maxShift() { return Math.min(0, track.parentElement.clientWidth - track.scrollWidth); }
  track.addEventListener("pointerdown", function (e) { dragging = true; lastX = e.clientX; vx = 0; track.classList.add("is-dragging"); track.setPointerCapture(e.pointerId); });
  track.addEventListener("pointermove", function (e) { if (!dragging) return; var dx = e.clientX - lastX; lastX = e.clientX; tx += dx; vx = dx; });
  ["pointerup", "pointercancel"].forEach(function (ev) { track.addEventListener(ev, function () { dragging = false; track.classList.remove("is-dragging"); }); });
  track.addEventListener("wheel", function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); tx -= e.deltaX; } }, { passive: false });
  track.style.overflow = "visible";

  /* =====================================================
     VIDEOS: only play while they are on screen (saves battery and data)
     ===================================================== */
  var videos = Array.prototype.slice.call(document.querySelectorAll("main video"));
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) { v.preload = "auto"; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else v.pause();
      });
    }, { rootMargin: "200px 0px" });
    videos.forEach(function (v) { v.pause(); io.observe(v); });
  }

  /* =====================================================
     THE LOOP: every frame, move everything to match the scroll
     ===================================================== */
  var craft = $("craft"), grow = $("grow"), endSec = $("end");
  var panels = Array.prototype.slice.call(document.querySelectorAll(".st-panel"));
  var cards = Array.prototype.slice.call(document.querySelectorAll(".st-card"));
  var fabs = Array.prototype.slice.call(document.querySelectorAll(".st-fab-media"));
  var growFrame = $("grow-frame"), quote = $("quote"), hint = $("scroll-hint"), endInner = $("end-inner");
  cards.forEach(function (c, i) { c.style.setProperty("--i", i); });

  var t0 = performance.now();
  function tick(now) {
    var t = REDUCE ? 0 : (now - t0) / 1000;
    var y = window.scrollY;

    // 1. THE OPENING: the "Scroll" hint fades as you start to scroll
    if (now - t0 > 2000) hint.style.opacity = clamp(1 - y / (vh * 0.25));   // (left to the opening fade for the first 2 seconds)

    // 2. THE WORDS fill in as they pass the lower part of the screen
    words.forEach(function (w) {
      var r = w.getBoundingClientRect().top;
      w.style.setProperty("--o", (0.16 + 0.84 * clamp((vh * 0.82 - r) / (vh * 0.4))).toFixed(3));
    });

    // 3. THE CRAFT: the three panels rise one after another
    var pc = progress(craft);
    craft.style.setProperty("--s", (1.15 - 0.15 * pc).toFixed(3));
    panels.forEach(function (p, i) { p.style.setProperty("--y", ((1 - ease(clamp((pc - i * 0.2) / 0.38))) * 100).toFixed(2) + "%"); });

    // 4. THE CARDS: a card shrinks back slightly as the next one slides over it
    cards.forEach(function (c, i) {
      var next = cards[i + 1]; if (!next) return;
      var d = clamp(1 - (next.getBoundingClientRect().top - c.getBoundingClientRect().top) / (vh * 0.55));
      c.style.setProperty("--sc", (1 - 0.06 * d).toFixed(4)); c.style.setProperty("--br", (1 - 0.12 * d).toFixed(3));
    });

    // 5. THE GROWING PHOTO: the oval opens to fill the screen, then the quote appears
    var pg = progress(grow), g0 = clamp((pg - 0.05) / 0.65), g = g0 * g0 * (3 - 2 * g0);
    growFrame.style.setProperty("--rx", (16 + g * 86).toFixed(2) + "%");
    growFrame.style.setProperty("--ry", (26 + g * 76).toFixed(2) + "%");
    growFrame.style.setProperty("--s", (1.25 - 0.25 * g).toFixed(3));
    var qo = clamp((pg - 0.6) / 0.2).toFixed(3);
    quote.style.setProperty("--o", qo); growFrame.style.setProperty("--o", qo);   // the quote, and a soft shade behind it

    // 6. THE FABRICS drift at different speeds
    fabs.forEach(function (f) {
      var r = f.getBoundingClientRect(), off = (r.top + r.height / 2) - vh / 2;
      f.style.setProperty("--y", (off * parseFloat(f.getAttribute("data-speed"))).toFixed(1) + "px");
    });

    // 7. THE STEPS: glide after a drag, and stay inside the edges
    if (!dragging) { tx += vx; vx *= 0.92; }
    var mn = maxShift(); if (tx > 0) { tx *= 0.85; vx = 0; } if (tx < mn) { tx = mn + (tx - mn) * 0.85; vx = 0; }
    track.style.transform = "translate3d(" + tx.toFixed(1) + "px,0,0)";

    // 8. THE ENDING: the booking link rises in as it comes into view
    var er = endSec.getBoundingClientRect().top;
    endInner.style.setProperty("--o", (REDUCE ? 1 : clamp((vh * 0.92 - er) / (vh * 0.4))).toFixed(3));
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", function () { vh = window.innerHeight; vw = window.innerWidth; });
  requestAnimationFrame(tick);
})();
