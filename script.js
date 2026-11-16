(function () {

  /* =====================================================
     SETTINGS
     ===================================================== */

  var DAY = 86400000;            // milliseconds in one day
  var SAST = 2 * 3600000;        // South Africa is 2 hours ahead of UTC all year (no daylight saving)

  // The two phrases shown above the time in the circle
  var TEXT_LIVE = "SA time";        // shown at the start, while it shows the real time
  var TEXT_TRAVEL = "Time travel";    // shown once the circle has been used

  // Colours: the page goes from LIGHT (midday) to DARK (midnight). Each is [red, green, blue].
  // (Pink tones only: the page never goes dark, so the text stays charcoal-black all day.
  //  The old colours were beige [236, 229, 211] and navy [16, 19, 28], if you ever want them back.)
  var LIGHT = [238, 226, 226];   // pale blush background (midday)
  var DARK = [196, 180, 181];    // the logo's dusty pink background (midnight)

  // The two text colours to choose from
  var INK_LIGHT = [243, 239, 230];   // off-white text, used when the background is dark
  var INK_DARK = [17, 17, 17];       // black text, used when the background is light

  /* =====================================================
     THE PIECES OF THE PAGE THIS FILE CONTROLS (found by their ids in index.html)
     ===================================================== */

  var dial = document.getElementById("sa-dial");     // the big circle
  var knob = document.getElementById("sa-knob");     // the small solid circle
  var hm = document.getElementById("sa-hm");         // the hours and minutes text
  var sec = document.getElementById("sa-sec");       // the seconds text
  var label = document.getElementById("sa-label");   // the "SA time" / "time travel" text
  var root = document.documentElement;               // the whole page (used to change the colours)

  /* =====================================================
     THE STATE: what the script remembers while the page is open
     ===================================================== */

  var offset = 0;           // how far the clock is moved away from the real time (0 = real time)
  var traveling = false;    // false = showing "SA time", true = showing "time travel"
  var dragging = false;     // true while the mouse or finger is held down on the circle
  var lastBg = "";          // the background colour most recently handed to style.css
  var lastInk = "";         // the text colour most recently handed to style.css

  // Has the person asked their device for less movement? (turns off the seconds fading)
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =====================================================
     SMALL HELPER FUNCTIONS
     ===================================================== */

  // Adds a zero in front of single digits: 7 becomes "07"
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // Turns any moment in time into "how many milliseconds since midnight in South Africa"
  function msOfDay(t) { return (((t + SAST) % DAY) + DAY) % DAY; }

  // How bright a colour is (0 = black, 1 = white), used to pick a readable text colour
  function luminance(c) {
    var v = c.map(function (x) {
      x /= 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }

  // How easy it is to read one colour on another (bigger number = easier to read)
  function contrast(a, b) {
    var hi = Math.max(a, b), lo = Math.min(a, b);
    return (hi + 0.05) / (lo + 0.05);
  }

  /* =====================================================
     BACKGROUND AND TEXT COLOUR: controlled by the time of day
     ===================================================== */

  function paint(ms) {
    // Works out how "daytime" it is: 0 at midnight (darkest) up to 1 at noon (lightest)
    var f = 0.5 - 0.5 * Math.cos(2 * Math.PI * ms / DAY);
    f = f * f * (3 - 2 * f);   // makes the change gentler around midday and midnight

    // Mixes the dark and light colours by that amount to get the background colour
    var bg = [0, 1, 2].map(function (i) {
      return Math.round(DARK[i] + (LIGHT[i] - DARK[i]) * f);
    });

    // Picks whichever text colour (black or off-white) is easier to read on this background
    var L = luminance(bg);
    var ink = contrast(L, luminance(INK_DARK)) >= contrast(L, luminance(INK_LIGHT))
      ? INK_DARK : INK_LIGHT;

    // Hands both colours to style.css (it reads them as --bg and --ink).
    // It only does this when the colour has really changed. Changing them makes the browser redraw
    // the whole page, and this function runs every second, so skipping the unnecessary redraws
    // keeps the carousel smooth.
    var bgText = "rgb(" + bg.join(",") + ")";
    var inkText = "rgb(" + ink.join(",") + ")";
    if (bgText !== lastBg) { root.style.setProperty("--bg", bgText); lastBg = bgText; }
    if (inkText !== lastInk) { root.style.setProperty("--ink", inkText); lastInk = inkText; }
  }

  /* =====================================================
     REMEMBERING TIME TRAVEL ACROSS PAGES
     If someone time travels with the circle and then opens the Shop, the Shop shows the colours of
     the time they travelled to, so the whole site matches. The Menu page itself always starts at the
     real time whenever it is opened or refreshed.
     ===================================================== */

  var MEMORY = "corsets-time-offset";   // the name the time travel is saved under (the Shop reads the same name)
  // saves how far the time has been moved, or forgets it once back at the real time
  function saveOffset() {
    try {
      if (traveling) sessionStorage.setItem(MEMORY, String(offset));
      else sessionStorage.removeItem(MEMORY);
    } catch (e) { /* private browsing etc.: the page still works, it just will not remember */ }
  }
  try {
    if (dial && knob) {
      // THE MENU PAGE ALWAYS STARTS AT THE REAL TIME: opening or refreshing it forgets any earlier time travel
      sessionStorage.removeItem(MEMORY);
    } else {
      // Other pages (the Shop) use the time travelled to on the Menu page, if there is one
      var saved = sessionStorage.getItem(MEMORY);
      if (saved !== null && !isNaN(+saved)) { offset = +saved; traveling = true; }
    }
  } catch (e) { /* nothing remembered */ }

  // PAGES WITHOUT THE TIME CIRCLE (the Shop page): no clock, but the background and text colours
  // still follow the time of day (or the time travelled to), exactly like the Menu page
  if (!dial || !knob) {
    paint(msOfDay(Date.now() + offset));
    setInterval(function () { paint(msOfDay(Date.now() + offset)); }, 30000);   // keeps up as the day goes by
    return;
  }

  /* =====================================================
     THE SMALL CIRCLE: where it sits on the big circle
     ===================================================== */

  function moveKnob(ms) {
    // Turns the time into an angle: top = midnight, right = 6am, bottom = noon, left = 6pm
    var a = ms / DAY * 2 * Math.PI;
    var w = dial.clientWidth;      // width of the big circle
    var r = w / 2 - 9;             // how far from the centre the small circle sits (just inside the edge)

    // Places the small circle at that angle
    knob.style.left = (w / 2 + r * Math.sin(a)) + "px";
    knob.style.top = (w / 2 - r * Math.cos(a)) + "px";
  }

  /* =====================================================
     DRAWING EVERYTHING: runs every second and whenever you move the circle
     ===================================================== */

  function render(fadeSeconds) {
    // The time to show = the real time + however far it has been moved
    var ms = msOfDay(Date.now() + offset);
    var h = Math.floor(ms / 3600000);        // hours
    var m = Math.floor(ms / 60000) % 60;     // minutes
    var s = Math.floor(ms / 1000) % 60;      // seconds

    // Writes the time into the circle
    hm.textContent = pad(h) + "." + pad(m);
    sec.textContent = pad(s);

    // Writes the words above the time: "time travel" once used, otherwise "SA time"
    label.textContent = traveling ? TEXT_TRAVEL : TEXT_LIVE;

    // Updates the page colours and the small circle to match the time
    paint(ms);
    moveKnob(ms);

    // Tells screen readers the current time for the small circle
    knob.setAttribute("aria-valuenow", h * 60 + m);
    knob.setAttribute("aria-valuetext", pad(h) + ":" + pad(m));

    // Makes the seconds fade in, stay, then fade out before the next second arrives
    if (fadeSeconds && !reduceMotion && sec.animate) {
      sec.animate(
        [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }],
        { duration: 1000, easing: "linear" }
      );
    }
  }

  /* =====================================================
     THE FIDGET BUBBLE: floats around inside the circle, and gets bumped away
     when the small solid circle comes close
     ===================================================== */

  var bubble = document.getElementById("sa-bubble");
  if (bubble) {
    var BUBBLE_SIZE = 9;      // must match the width in style.css
    var KNOB_SIZE = 11;       // the small solid circle's width
    var PUSH = 0.9;           // how hard a bump pushes it (bigger = flies further)
    var DRIFT = 0.012;        // how much it wanders by itself (0 = stays still)
    var FRICTION = 0.94;      // how quickly it slows down (closer to 1 = slides for longer)

    var bx = 0, by = 28;      // where it starts, measured from the centre of the circle
    var vx = 0, vy = 0;       // its speed
    var wasTouching = false;

    function bubbleFrame() {
      var w = dial.clientWidth;
      var limit = w / 2 - BUBBLE_SIZE / 2 - 3;   // keeps it inside the circle line

      // Where the small solid circle is right now (from the centre)
      var kx = parseFloat(knob.style.left || 0) - w / 2;
      var ky = parseFloat(knob.style.top || 0) - w / 2;

      // Gets bumped away when the small solid circle is close
      var dx = bx - kx, dy = by - ky;
      var dist = Math.sqrt(dx * dx + dy * dy) || 0.01;   // how far apart the two circles are
      var reach = (BUBBLE_SIZE + KNOB_SIZE) / 2 + 6;
      var touching = dist < reach;                       // closer than their edges: they are touching
      if (touching) {
        var force = (reach - dist) / reach * PUSH * 4;   // the closer, the harder the push away
        vx += dx / dist * force;
        vy += dy / dist * force;
        if (!wasTouching && !reduceMotion) {           // a little wobble on each new bump
          bubble.classList.remove("boop");
          void bubble.offsetWidth;
          bubble.classList.add("boop");
        }
      }
      wasTouching = touching;

      // Wanders gently by itself
      if (!reduceMotion) {
        vx += (Math.random() - 0.5) * DRIFT * 2;
        vy += (Math.random() - 0.5) * DRIFT * 2;
      }

      vx *= FRICTION; vy *= FRICTION;
      bx += vx; by += vy;

      // Stays out of the words in the middle, so the time is always readable:
      // the words are treated like a box it bounces off
      var tw = Math.max(label.offsetWidth, hm.parentNode.offsetWidth) / 2 + BUBBLE_SIZE / 2 + 2;
      var th = (label.offsetHeight + hm.parentNode.offsetHeight) / 2 + BUBBLE_SIZE / 2 + 1;
      if (Math.abs(bx) < tw && Math.abs(by) < th) {
        if (tw - Math.abs(bx) < th - Math.abs(by)) { bx = (bx < 0 ? -tw : tw); vx = -vx * 0.6; }
        else { by = (by < 0 ? -th : th); vy = -vy * 0.6; }
      }

      // Bounces off the inside of the circle line
      var d = Math.sqrt(bx * bx + by * by);
      if (d > limit) {
        var nx = bx / d, ny = by / d;
        bx = nx * limit; by = ny * limit;
        var dot = vx * nx + vy * ny;
        vx -= 1.6 * dot * nx; vy -= 1.6 * dot * ny;   // bounce back, losing a little speed
      }

      bubble.style.left = (w / 2 + bx) + "px";
      bubble.style.top = (w / 2 + by) + "px";
      requestAnimationFrame(bubbleFrame);
    }
    requestAnimationFrame(bubbleFrame);
  }

  /* =====================================================
     MOVING THE TIME
     ===================================================== */

  // Jumps the clock to a chosen time of day (given as milliseconds since midnight)
  function setTime(targetMs) {
    traveling = true;    // the circle has now been used, so the text becomes "time travel"
    dial.classList.add("used");   // hides the "drag to time travel" hint for the rest of the visit
    var real = Math.floor(msOfDay(Date.now()) / 1000) * 1000;
    offset = Math.round((targetMs - real) / 1000) * 1000;   // remembers how far from real time we are
    saveOffset();         // so the other pages use this time too
    render(false);
  }

  // Goes back to the real time and the "SA time" text
  function resetToLive() {
    offset = 0;
    traveling = false;
    saveOffset();         // the other pages go back to the real time too
    render(false);
  }

  // Works out the time from where the mouse or finger is on the circle
  function setFromPointer(e) {
    var box = dial.getBoundingClientRect();
    var dx = e.clientX - (box.left + box.width / 2);    // how far left/right of the centre
    var dy = e.clientY - (box.top + box.height / 2);    // how far above/below the centre
    var a = Math.atan2(dx, -dy);                        // the angle, measured clockwise from the top
    if (a < 0) a += 2 * Math.PI;
    // Turns the angle into a time and snaps it to whole minutes
    setTime(Math.round(a / (2 * Math.PI) * 1440) * 60000);
  }

  /* =====================================================
     MOUSE AND TOUCH CONTROLS
     ===================================================== */

  // Press down on the circle: start dragging and jump to that spot
  dial.addEventListener("pointerdown", function (e) {
    dragging = true;
    dial.classList.add("dragging");        // tells style.css to show the closed-hand cursor
    dial.setPointerCapture(e.pointerId);   // keeps following the pointer even if it leaves the circle
    setFromPointer(e);
  });

  // Move while pressed down: the time follows. Going clockwise moves the time forward.
  dial.addEventListener("pointermove", function (e) {
    if (dragging) setFromPointer(e);
  });

  // Let go: stop dragging. The clock keeps running from the time you chose.
  function stopDrag() {
    dragging = false;
    dial.classList.remove("dragging");
  }
  dial.addEventListener("pointerup", stopDrag);
  dial.addEventListener("pointercancel", stopDrag);

  // Double click the circle: back to the real time and "SA time"
  dial.addEventListener("dblclick", resetToLive);

  /* =====================================================
     KEYBOARD CONTROLS (click the small circle or Tab to it first)
     ===================================================== */

  knob.addEventListener("keydown", function (e) {
    // Right/Up arrow = 15 minutes forward, Left/Down arrow = 15 minutes back
    var step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (step) {
      e.preventDefault();
      setTime(msOfDay(Date.now() + offset) + step * 15 * 60000);
    } else if (e.key === "Escape") {
      resetToLive();     // Escape = back to the real time
    }
  });

  /* =====================================================
     KEEPING IT UP TO DATE
     ===================================================== */

  // If the window is resized, put the small circle back in the right spot
  window.addEventListener("resize", function () { render(false); });

  // The clock: redraws once every second, timed to the real tick of the second.
  // It pauses while you are dragging so it does not fight your movement.
  function loop() {
    if (!dragging) render(true);
    setTimeout(loop, 1000 - (Date.now() % 1000));
  }
  loop();   // start the clock

})();


/* =====================================================
   THE CAROUSEL: makes the row of images move
   (index.html holds the images and titles, style.css sets their sizes)

   What it does:
   1. The row drifts sideways on its own.
   2. When it reaches the end it carries straight on from the start (no jump).
   3. Grab it with the mouse or a finger and move it: it follows you.
      Let go while moving and it keeps going fast, then slowly settles
      back to its normal drifting speed.
   ===================================================== */
(function () {

  /* ---------- SETTINGS ---------- */

  var SPEED = 45;         // how fast it drifts on its own, in pixels per second (bigger = faster)
  var MAX_SPEED = 3500;   // the fastest you can fling it, in pixels per second
  var SETTLE = 1.6;       // how quickly it calms back down after a fling (bigger = calms down sooner)
  var DRAG_START = 5;     // how many pixels you must move before it counts as a drag (not a click)
  var STOP_FAST = 14;     // how quickly it stops while the mouse is on a title (bigger = stops sooner)

  /* ---------- THE PIECES OF THE PAGE THIS PART CONTROLS ---------- */

  var track = document.getElementById("carousel-track");   // the window you look through
  var rail = document.getElementById("carousel-rail");     // the long strip of images inside it
  if (!track || !rail) return;

  // Does the person want less movement? Then it will not drift by itself.
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- MAKING THE LOOP ---------- */

  var cards = Array.prototype.slice.call(rail.children);   // the original images
  var count = cards.length;

  // BUILD THE ROLLING TITLES. Each title's word is put in twice, stacked: the second copy waits just
  // below the first. On hover, style.css slides both up one line, which makes the word "roll".
  // This is done BEFORE the copies for the loop are made below, so the copies roll too.
  // (index.html stays simple: you only ever type the word once.)
  Array.prototype.forEach.call(rail.querySelectorAll(".card-title"), function (a) {
    var word = a.textContent;
    a.textContent = "";
    var box = document.createElement("span");
    box.className = "roll";
    var one = document.createElement("span");
    one.textContent = word;
    var two = document.createElement("span");
    two.textContent = word;
    two.setAttribute("aria-hidden", "true");      // screen readers read the word once, not twice
    box.appendChild(one);
    box.appendChild(two);
    a.appendChild(box);
  });

  // Add a second copy of every image after the originals. When the first copy has slid
  // all the way past, the second copy looks exactly the same, so jumping back to the
  // start is invisible. That is how it "starts again" with no gap.
  cards.forEach(function (card) {
    var copy = card.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");              // screen readers skip the copies
    Array.prototype.forEach.call(copy.querySelectorAll("a"), function (a) { a.tabIndex = -1; });   // so does the Tab key
    rail.appendChild(copy);
  });

  // THE MOVING PICTURES (videos). Playing a video costs the device effort, and there are four of them
  // (two pictures, each with a copy for the loop). So a video only plays while it is actually on
  // screen, and none play while the loading animation is running. That keeps the page smooth.
  var videos = Array.prototype.slice.call(rail.querySelectorAll("video"));
  var onScreen = [];                                       // remembers which videos can currently be seen

  var warm = false;   // becomes true just before the loading animation ends (see "corsets:warm" below)
  var locked = false; // true while an article is open (see Part 4): the carousel stands still

  function syncVideos() {
    var loading = (document.documentElement.classList.contains("is-loading") && !warm) || locked;
    videos.forEach(function (v, i) {
      if (onScreen[i] && !loading && !reduceMotion) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});         // ignore "the browser would not let it play"
      } else {
        v.pause();
      }
    });
  }

  videos.forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); });   // start paused; syncVideos() plays them when they are needed

  if ("IntersectionObserver" in window) {
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { onScreen[videos.indexOf(entry.target)] = entry.isIntersecting; });
      syncVideos();
    });
    videos.forEach(function (v) { watcher.observe(v); });
  } else {
    videos.forEach(function (v, i) { onScreen[i] = true; });   // very old browsers: just play them all
  }

  // The loading animation (Part 3) sends "corsets:warm" about one second BEFORE it ends. The videos on
  // screen start playing then, behind the loading screen, so they are already running smoothly when
  // the carousel appears (starting a video is what used to cause a stutter at that moment).
  window.addEventListener("corsets:warm", function () { warm = true; syncVideos(); });
  // It sends "corsets:ready" when it is finished
  window.addEventListener("corsets:ready", syncVideos);

  // Part 4 (the article) sends these when an article opens and closes: the carousel freezes while an
  // article is open (and its moving pictures pause), and carries on when it closes.
  window.addEventListener("corsets:lock", function () { locked = true; velocity = 0; syncVideos(); });
  window.addEventListener("corsets:unlock", function () { locked = false; velocity = reduceMotion ? 0 : SPEED; syncVideos(); });

  /* ---------- MEASURING ---------- */

  var cardWidth = 0;   // width of one image
  var gap = 0;         // space between images
  var loopWidth = 0;   // length of one full set of images (when the row has moved this far, it wraps)

  function measure() {
    cardWidth = cards[0].getBoundingClientRect().width;
    gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    loopWidth = count * (cardWidth + gap);
  }

  /* ---------- THE STATE: what the script remembers ---------- */

  var pos = 0;           // how far the row has slid to the left, in pixels
  var velocity = 0;      // how fast it is moving right now (pixels per second, positive = to the left)
  var dragging = false;  // true while you are holding and moving it
  var pressed = false;   // true from the moment you press down
  var paused = false;    // true while the mouse is on a title or a title is selected (so it can be clicked)
  var movedByDrag = false;   // remembers that a drag happened, so a click is not triggered afterwards

  var startX = 0;        // where the press began
  var lastX = 0;         // where the pointer was a moment ago
  var lastTime = 0;      // when that was
  var dragVelocity = 0;  // how fast your hand was moving

  measure();
  // Start so that images 1 and 2 are in front, with a quarter of the last image on the left
  // and a quarter of image 3 on the right.
  pos = loopWidth - (0.25 * cardWidth + gap);
  velocity = reduceMotion ? 0 : SPEED;

  // If the window is resized, keep the row in the same place relative to the new image size
  window.addEventListener("resize", function () {
    var share = pos / loopWidth;
    measure();
    pos = share * loopWidth;
  });

  /* ---------- GRABBING IT (mouse and touch) ---------- */

  // Press down: remember where, but do not start dragging yet (so a plain click on a title still works)
  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;   // only the left mouse button
    if (locked) return;                                        // an article is open: no grabbing
    pressed = true;
    movedByDrag = false;
    startX = lastX = e.clientX;
    lastTime = performance.now();
    dragVelocity = 0;
  });

  // Move: once you have moved a few pixels, the row follows your hand
  track.addEventListener("pointermove", function (e) {
    if (!pressed) return;

    if (!dragging) {
      if (Math.abs(e.clientX - startX) < DRAG_START) return;   // not a drag yet
      dragging = true;
      movedByDrag = true;
      track.classList.add("dragging");                         // closed-hand cursor (style.css)
      track.setPointerCapture(e.pointerId);                    // keep following even if the pointer leaves the window
    }

    var now = performance.now();
    var dx = e.clientX - lastX;                                // how far your hand moved since last time
    var seconds = Math.max(now - lastTime, 1) / 1000;

    pos -= dx;                                                 // moving your hand right pulls the row right
    // Work out how fast your hand is moving (smoothed so one jerky move does not spoil it)
    dragVelocity = dragVelocity * 0.6 + (-dx / seconds) * 0.4;

    lastX = e.clientX;
    lastTime = now;
  });

  // Let go: if your hand was still moving, the row keeps that speed (a fling)
  function release() {
    if (!pressed) return;
    pressed = false;
    if (dragging) {
      dragging = false;
      track.classList.remove("dragging");
      var idle = performance.now() - lastTime;                 // if you held still before letting go, no fling
      velocity = idle > 80 ? 0 : Math.max(-MAX_SPEED, Math.min(MAX_SPEED, dragVelocity));
    }
  }
  track.addEventListener("pointerup", release);
  track.addEventListener("pointercancel", release);

  // After a drag, ignore the click that would otherwise open a title's link
  track.addEventListener("click", function (e) {
    if (movedByDrag) {
      e.preventDefault();
      e.stopPropagation();
      movedByDrag = false;
    }
  }, true);

  /* ---------- PAUSING SO A TITLE CAN BE CLICKED ---------- */

  // While the mouse is on a title, or a title is selected with the keyboard, the row glides to a stop
  // the mouse on a title: pause. Off the title: carry on.
  rail.addEventListener("pointerover", function (e) {
    if (e.target.closest && e.target.closest(".card-title")) paused = true;
  });
  rail.addEventListener("pointerout", function (e) {
    if (e.target.closest && e.target.closest(".card-title")) paused = false;
  });
  // a title selected with the keyboard (Tab): pause too
  track.addEventListener("focusin", function () { paused = true; });
  track.addEventListener("focusout", function () { paused = false; });

  /* ---------- THE MOVEMENT: runs on every screen refresh ---------- */

  var previous = performance.now();

  function frame(now) {
    var dt = Math.min((now - previous) / 1000, 0.05);   // time since the last frame (capped so a hidden tab does not cause a jump)
    previous = now;

    // While the loading animation is running, the carousel waits (it starts drifting when loading ends)
    if (!dragging && !locked && !document.documentElement.classList.contains("is-loading")) {
      // The speed it is heading towards: the normal drift, or zero while paused / for reduced motion
      var target = (paused || reduceMotion) ? 0 : SPEED;
      // Ease the current speed towards that target. This is what makes a fling slowly calm down.
      // When the mouse is on a title it stops much faster (STOP_FAST), so the picture does not slide
      // out from under the mouse while it is popping up.
      var rate = paused ? STOP_FAST : SETTLE;
      velocity += (target - velocity) * (1 - Math.exp(-rate * dt));
      pos += velocity * dt;
    }

    // WRAPPING: once the first set of images has fully passed, jump back by exactly one set.
    // The second set looks identical, so nobody can see the jump. This works in both directions.
    pos = ((pos % loopWidth) + loopWidth) % loopWidth;

    // Slide the strip. A negative number moves it to the left.
    rail.style.transform = "translate3d(" + (-pos) + "px, 0, 0)";

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

})();



/* =====================================================
   PART 3 OF 3: THE LOADING ANIMATION
   What happens, in order:
   1. A blank page in the page colour. A thin line along the bottom starts to fill.
   2. The Corsets by MS logo appears in the middle of the screen and holds for a moment.
   3. Your photos start flashing INSIDE the logo circle, behind the MS and "Corsets by" lettering.
   4. When everything has loaded (and the minimum time has passed) the lettering fades away,
      the circle stops on the first photo and stretches into the first oval slide.
   5. The other slides slide in from the right, the menu writes itself in at the top and the
      carousel starts drifting.
   ===================================================== */
(function () {

  /* ---------- SETTINGS ---------- */

  var MIN_TIME = 1700;     // the shortest the loading animation will last, in milliseconds (1000 = 1 second)
  var FLASH_START = 150;   // how long after the start the logo appears
  var LOGO_HOLD = 600;     // how long the logo shows on its own before the photos start flashing inside it
  var FLASH_EVERY = 280;   // how long each photo shows while flashing (bigger = calmer)
  var TINT_FLASHING = 0.55;// how dark the logo colour stays over the photos while they flash (0 = none, 1 = solid)
  var LETTERS_OUT = 300;   // how long the lettering takes to fade away before the circle grows
  var GROW_TIME = 950;     // how long the card takes to grow into the first slide (keep it the same as "0.95s" below)
  var REVEAL_TIME = 1900;  // how long the slide-in lasts before the animation is switched off

  /* ---------- THE PIECES OF THE PAGE THIS PART CONTROLS ---------- */

  var html = document.documentElement;
  var loader = document.getElementById("loader");
  var card = document.getElementById("loader-card");
  var tint = document.getElementById("loader-tint");
  var logo = document.getElementById("loader-logo");
  var line = document.getElementById("loader-line");
  var rail = document.getElementById("carousel-rail");

  // If the page is not in loading mode (or something is missing), do nothing
  if (!html.classList.contains("is-loading") || !loader || !card || !line || !rail || !tint || !logo) {
    html.classList.remove("is-loading");
    return;
  }

  // People who prefer less motion skip the whole animation
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    html.classList.remove("is-loading");
    return;
  }

  // The original slides (the copies the carousel added are marked aria-hidden, so they are left out)
  var slides = Array.prototype.slice.call(rail.querySelectorAll(".card:not([aria-hidden])"));

  // The picture of each slide: the image file, or the poster picture for the moving ones
  var sources = slides.map(function (s) {
    var img = s.querySelector("img");
    var vid = s.querySelector("video");
    return img ? img.getAttribute("src") : (vid ? vid.getAttribute("poster") : "");
  });

  // The order the photos flash in: the last one first, finishing on the first slide's photo
  var order = sources.slice(1).reverse().concat(sources[0]);

  /* ---------- WAITING FOR THE PHOTOS TO LOAD ---------- */

  var photosLoaded = false;
  var minTimePassed = false;

  Promise.all(sources.map(function (src) {
    return new Promise(function (done) {
      var im = new Image();
      im.onload = im.onerror = function () {
        // "decode" makes the browser unpack the picture now, during the loading screen, so it does not
        // have to do it later when the carousel appears. If decode is not available, just carry on.
        if (im.decode) { im.decode().then(done, done); } else { done(); }
      };
      im.src = src;                      // a missing file still counts as finished, so loading never gets stuck
    });
  })).then(function () { photosLoaded = true; });

  setTimeout(function () { minTimePassed = true; }, MIN_TIME);

  /* ---------- THE THIN LINE ---------- */

  // Next frame: start filling the line slowly towards 88%
  requestAnimationFrame(function () {
    line.style.transition = "transform 2.8s cubic-bezier(0.2, 0.6, 0.2, 1)";
    line.style.transform = "scaleX(0.88)";
  });

  /* ---------- THE SMALL FLASHING CARD ---------- */

  var step = -1;          // which photo is showing (-1 = none yet: just the logo)
  var growing = false;

  // The size of the logo circle: 40% of the smaller side of the screen, between 200 and 320 pixels
  function circleSize() {
    return Math.max(200, Math.min(320, Math.min(window.innerWidth, window.innerHeight) * 0.4));
  }

  // The carousel loops, so every slide exists twice (the original and a copy). At the start the copy of
  // the first slide is the one on screen. This finds whichever of the two is on screen, and marks it
  // with the class "hero" so style.css can treat it as the slide the small card turns into.
  var heroSlide = null;
  function findHero() {
    var copyOfFirst = rail.children[slides.length];            // the copy of slide 1
    var a = slides[0].getBoundingClientRect().left;
    var b = copyOfFirst ? copyOfFirst.getBoundingClientRect().left : -99999;
    heroSlide = (b >= 0 && (a < 0 || b < a)) ? copyOfFirst : slides[0];
    heroSlide.classList.add("hero");
    return heroSlide;
  }

  // Where the first slide's picture will end up (its position and size on screen)
  function target() {
    return (heroSlide || findHero()).querySelector("img, video").getBoundingClientRect();
  }

  // Shows the logo in the middle of the screen, then starts the photos flashing inside it
  function showFlash() {
    target();                         // measures the first slide now, so it is ready later
    var d = circleSize();
    card.style.width = d + "px";
    card.style.height = d + "px";
    card.style.left = (window.innerWidth / 2 - d / 2) + "px";   // centred left to right
    card.style.top = (window.innerHeight / 2 - d / 2) + "px";    // centred top to bottom
    card.style.transition = "opacity 0.7s ease, transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1)";
    void card.offsetWidth;            // lets the browser register the start before it fades in
    card.style.opacity = "1";
    card.style.transform = "none";

    // After the logo has had its moment, the photos start flashing inside it
    setTimeout(function () {
      tint.style.opacity = TINT_FLASHING;
      tick();
    }, LOGO_HOLD);
  }

  // Puts the current photo inside the circle (behind the lettering)
  function setFlash() {
    card.style.backgroundImage = "url('" + order[step % order.length] + "')";
  }

  function tick() {
    if (growing) return;
    // Ready? Then stop flashing, show the first slide's photo and grow into place
    // (it only stops after the last photo in the flashing order, so it lands on the first slide's photo)
    if (minTimePassed && photosLoaded && step % order.length === order.length - 1) {
      grow();
      return;
    }
    step++;                          // otherwise: the next photo...
    setFlash();                      // ...shows in the circle...
    setTimeout(tick, FLASH_EVERY);   // ...and it checks again after the next flash
  }

  /* ---------- GROWING INTO THE FIRST SLIDE ---------- */

  function grow() {
    growing = true;
    window.dispatchEvent(new Event("corsets:warm"));   // lets the moving pictures on screen start now, behind the loading screen

    // The line finishes filling up
    line.style.transition = "transform 0.6s ease-out";
    line.style.transform = "scaleX(1)";

    // The lettering and the dark tint fade away, leaving the first slide's photo in the circle
    card.style.backgroundImage = "url('" + sources[0] + "')";
    logo.style.opacity = "0";
    tint.style.opacity = "0";

    // Then the circle stretches into an oval and grows to exactly the first slide's position and size
    setTimeout(function () {
      var t = target();                                        // the first slide's exact spot and size
      var ease = " 0.95s cubic-bezier(0.76, 0, 0.24, 1)";       // 0.95 seconds, slow at both ends
      card.style.transition = "left" + ease + ", top" + ease + ", width" + ease + ", height" + ease + ", border-radius" + ease;
      card.style.left = t.left + "px";
      card.style.top = t.top + "px";
      card.style.width = t.width + "px";
      card.style.height = t.height + "px";
      card.style.borderRadius = "50%";   /* stays round: the logo circle stretches straight into the oval slide */
      setTimeout(handOver, GROW_TIME + 50);                    // once grown, the real carousel takes over
    }, LETTERS_OUT);
  }

  /* ---------- HAND-OVER TO THE REAL CAROUSEL ---------- */

  function handOver() {
    // Each slide waits a little longer the further to the right it is, so they arrive one after another
    // Only the slides that can actually be seen get the slide-in animation (animating slides that are
    // off screen would be wasted effort and makes the page lag). Those slides get the class "enter".
    var first = heroSlide.getBoundingClientRect().left;   // where the first slide is
    var entering = [];
    Array.prototype.forEach.call(rail.querySelectorAll(".card"), function (c) {
      var r = c.getBoundingClientRect();
      if (c !== heroSlide && r.right > 0 && r.left < window.innerWidth) {   // a slide on screen, other than the first
        // its wait: further right = later, at most 0.6 seconds
        var d = Math.max(0, Math.min(0.6, (r.left - first) / window.innerWidth * 0.5));
        c.style.setProperty("--d", d.toFixed(2) + "s");
        c.classList.add("enter");
        entering.push(c);
      }
    });

    html.classList.add("reveal");          // starts the slide-in (style.css)
    html.classList.remove("is-loading");   // removes the loading screen and lets the carousel start drifting
    window.dispatchEvent(new Event("corsets:ready"));   // tells Part 2 it may now play the moving pictures
    // after the slide-in, the helper classes are removed again
    setTimeout(function () {
      html.classList.remove("reveal");
      heroSlide.classList.remove("hero");
      entering.forEach(function (c) { c.classList.remove("enter"); });
    }, REVEAL_TIME);
  }

  // Show the logo a moment after the page opens
  setTimeout(function () {
    // two animation frames, so the carousel has been measured and placed first
    requestAnimationFrame(function () { requestAnimationFrame(showFlash); });
  }, FLASH_START);

})();



/* =====================================================
   PART 4 OF 4: CLICKING AN IMAGE OPENS AN ARTICLE
   (the look of everything is in style.css under "CLICKING AN IMAGE")

   Opening, in order:
   1. The carousel freezes. A copy of the clicked picture is placed exactly over it.
   2. The other images squash to a thin line and vanish, one after another.
   3. The copy of the picture slides out and grows to the big spot on the right.
   4. The headline and the two small captions rise into place on the left, and the article text
      rises in under the picture. The picture then becomes part of the article, so it scrolls up
      with the text.
   Closing (Escape or the browser's Back button) plays it backwards.
   If the article has been scrolled down, it glides back to the top first.
   ===================================================== */
(function () {

  /* ---------- SETTINGS (all in milliseconds; 1000 = 1 second) ---------- */

  var COLLAPSE_WAIT = 750;   // how long after the click the picture starts to move (the images squash first)
  var GROW_TIME = 1000;      // how long the picture takes to grow (keep it the same as the "1s" in .flyer in style.css)
  var TEXT_WAIT = 200;       // how long after the picture has landed the text starts rising
  var STAGGER = 0.25;        // how much later the images on the right squash than those on the left (seconds)

  /* ---------- THE PIECES OF THE PAGE THIS PART CONTROLS ---------- */

  var html = document.documentElement;                    // the whole page
  var rail = document.getElementById("carousel-rail");    // the row of images
  var article = document.getElementById("article");          // the article layer
  var slot = document.getElementById("article-slot");        // the spot the big picture lands in
  var titleBox = document.getElementById("article-title");   // the headline
  var metaBox = document.getElementById("article-meta");     // the two small captions
  var copyBox = document.getElementById("article-copy");     // the article text
  var flyer = document.getElementById("flyer");              // the copy of the picture that flies
  var bar = document.querySelector(".menu-bar");             // the menu (the article starts just below it)
  if (!rail || !article || !slot || !titleBox || !metaBox || !copyBox || !flyer) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var k = reduceMotion ? 0 : 1;        // 0 = no waiting at all (for people who prefer less motion)

  var chosen = null;     // the image that was clicked
  var media = null;      // its picture
  var affected = [];     // the other images that squashed away
  var isOpen = false;    // an article is open (or opening)
  var busy = false;      // true while the opening or closing animation is running
  var pushed = false;    // true if opening added an entry to the browser history

  /* ---------- SMALL HELPERS ---------- */

  // The word on a title. (Part 2 puts each title in twice for the rolling effect, so read the first copy.)
  function wordOf(a) {
    var first = a.querySelector(".roll > span");
    return (first ? first.textContent : a.textContent).trim();
  }

  // Fills in the headline from the title's data-headline (or the title word itself)
  function fillText(a) {
    var headline = a.getAttribute("data-headline") || wordOf(a);
    titleBox.textContent = "";
    // each word goes in its own box, so the words can rise one after another (--i is each word's turn)
    headline.split(/\s+/).forEach(function (word, i, all) {
      var w = document.createElement("span");
      w.className = "w";
      var inner = document.createElement("span");
      inner.textContent = word;
      inner.style.setProperty("--i", i);
      w.appendChild(inner);
      titleBox.appendChild(w);
      if (i < all.length - 1) titleBox.appendChild(document.createTextNode(" "));   // a space between words
    });

    // The two small captions: "Heading|Text" each. The heading is the first line, the text the second.
    metaBox.textContent = "";
    [a.getAttribute("data-meta-1"), a.getAttribute("data-meta-2")].forEach(function (value) {
      if (!value) return;
      var col = document.createElement("div");   // one caption
      // each line in its own box, so the lines can rise one after another
      value.split("|").forEach(function (line, i) {
        var m = document.createElement("span");
        m.className = "m";
        var inner = document.createElement("span");
        inner.textContent = line.trim();
        inner.style.setProperty("--i", i);
        m.appendChild(inner);
        col.appendChild(m);
      });
      metaBox.appendChild(col);
    });
  }

  // Fills in the article text under the picture from the card's hidden <div class="card-article">
  function fillCopy(card) {
    var src = card.querySelector(".card-article");
    copyBox.innerHTML = src ? src.innerHTML : "";
  }

  // Makes a copy of the picture (a moving picture keeps moving)
  function copyOfMedia(from) {
    var c = from.cloneNode(true);
    if (c.tagName === "VIDEO") {                // a video copy: silent, looping, at the same moment, playing
      c.muted = true;
      c.loop = true;
      c.setAttribute("playsinline", "");
      c.currentTime = from.currentTime || 0;
      var pr = c.play();
      if (pr && pr.catch) pr.catch(function () {});   // if the browser refuses to play, nothing breaks
    }
    return c;
  }

  // Puts the flying picture exactly over a rectangle
  function placeFlyer(r) {
    flyer.style.left = r.left + "px";
    flyer.style.top = r.top + "px";
    flyer.style.width = r.width + "px";
    flyer.style.height = r.height + "px";
  }

  // Where the big picture should end up: the invisible "article-slot" box
  function slotRect() { return slot.getBoundingClientRect(); }

  /* ---------- OPENING ---------- */

  function open(card) {
    if (busy || isOpen) return;     // already opening or open: ignore the click
    busy = true;
    isOpen = true;
    chosen = card;
    media = card.querySelector("img, video");
    var a = card.querySelector(".card-title");

    // 1. Freeze the carousel and put a copy of the picture exactly over the clicked one
    window.dispatchEvent(new Event("corsets:lock"));
    var start = media.getBoundingClientRect();
    flyer.textContent = "";
    var copy = media.cloneNode(true);
    if (copy.tagName === "VIDEO") {            // a moving picture keeps moving in the article
      copy.muted = true;
      copy.loop = true;
      copy.setAttribute("playsinline", "");
      copy.currentTime = media.currentTime || 0;
      var p = copy.play();
      if (p && p.catch) p.catch(function () {});
    }
    flyer.appendChild(copy);
    flyer.style.transition = "none";   // placed instantly (no movement yet)...
    placeFlyer(start);                 // ...exactly over the clicked picture...
    flyer.style.display = "block";     // ...and shown

    // Prepare the article text and the spot for the picture (just below the menu bar)
    fillText(a);
    fillCopy(card);
    article.scrollTop = 0;                                    // the article starts at the top
    article.style.setProperty("--article-top", (bar.getBoundingClientRect().bottom + 16) + "px");
    article.setAttribute("aria-hidden", "false");             // screen readers can now read the article
    html.classList.add("article-open");                       // style.css: the article layer is in use
    card.classList.add("chosen");                             // style.css: hides the clicked picture and its title

    // 2. The other images that can be seen squash away, left to right
    var all = Array.prototype.slice.call(rail.querySelectorAll(".card"));
    affected = all.filter(function (c) {          // only the images that are on screen

      var r = c.getBoundingClientRect();
      return c !== card && r.right > 0 && r.left < window.innerWidth;
    });
    affected.forEach(function (c) {
      var left = Math.max(0, c.getBoundingClientRect().left);
      c.style.setProperty("--d", (left / window.innerWidth * STAGGER).toFixed(2) + "s");   // further right = later
      c.classList.remove("expand");
      c.classList.add("collapse");
    });

    // Add an entry to the browser history, so the Back button closes the article
    try {
      history.pushState({ article: true }, "", "#" + wordOf(a).toLowerCase().replace(/[^a-z0-9]+/g, "-"));
      pushed = true;
    } catch (err) { pushed = false; }

    // 3. After the images have gone, the picture grows to its big spot
    setTimeout(function () {
      article.classList.add("solid");               // the article background fills in
      flyer.style.transition = "";                 // use the movement set in style.css
      placeFlyer(slotRect());
      // 4. When it has landed, the picture is handed to the article itself (so it scrolls with the text)
      //    and the text rises into place
      setTimeout(function () {
        slot.textContent = "";
        slot.appendChild(copyOfMedia(flyer.firstChild));   // the picture moves into the article...
        flyer.style.display = "none";                       // ...and the flying copy is hidden
        article.classList.add("show");                      // the text rises in
        busy = false;                                       // opening finished
        article.focus({ preventScroll: true });             // the keyboard now works inside the article
      }, GROW_TIME * k + TEXT_WAIT * k);
    }, COLLAPSE_WAIT * k);
  }

  /* ---------- CLOSING (the same thing backwards) ---------- */

  function close() {
    if (busy || !isOpen) return;    // nothing open, or already moving: ignore
    busy = true;

    // If the article has been scrolled down, glide back to the top first
    var wait = 0;
    if (article.scrollTop > 2) {
      article.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      wait = 550 * k;
    }

    setTimeout(function () {
      // Hand the picture back to the flying copy, exactly where it is
      var r = slotRect();
      flyer.textContent = "";
      flyer.appendChild(copyOfMedia(slot.firstChild || media));
      flyer.style.transition = "none";
      placeFlyer(r);
      flyer.style.display = "block";
      slot.textContent = "";                      // the article's own copy is removed
      void flyer.offsetWidth;                     // lets the browser register the spot before it moves

      // The text sinks away first
      article.classList.remove("show");

      setTimeout(function () {
        // Then the picture shrinks back to where it came from, and the images unfold again
        article.classList.remove("solid");         // the article background fades
        flyer.style.transition = "";
        placeFlyer(media.getBoundingClientRect()); // the picture flies back to its spot in the row
        affected.forEach(function (c) {
          c.classList.remove("collapse");
          c.classList.add("expand");
        });

        setTimeout(function () {
          // Tidy up: everything back to normal and the carousel carries on drifting
          affected.forEach(function (c) { c.classList.remove("expand"); c.style.removeProperty("--d"); });
          chosen.classList.remove("chosen");
          flyer.style.display = "none";
          flyer.textContent = "";
          article.setAttribute("aria-hidden", "true");
          html.classList.remove("article-open");
          affected = [];
          chosen = null;
          isOpen = false;
          busy = false;
          window.dispatchEvent(new Event("corsets:unlock"));   // tells the carousel it may move again
        }, (GROW_TIME + 100) * k);
      }, 600 * k);
    }, wait);
  }

  // Closing from the page itself (the Escape key): go "back" in the history, which closes it
  function requestClose() {
    if (!isOpen || busy) return;
    if (pushed) { pushed = false; history.back(); } else { close(); }
  }

  /* ---------- WHAT STARTS IT ALL ---------- */

  // A click on any image or its title opens that image's article
  rail.addEventListener("click", function (e) {
    var card = e.target.closest && e.target.closest(".card");
    if (!card) return;
    // Let the browser do its normal thing for "open in a new tab" style clicks
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();      // do not follow the title's link: the article opens here instead
    open(card);
  });

  // The browser's Back button
  window.addEventListener("popstate", function () { if (isOpen) { pushed = false; close(); } });

  // The Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) requestClose();
  });

})();



/* =====================================================
   THE SHOP: "SHOP CORSETS" on the photo glides down to the corsets
   ===================================================== */
(function () {
  var cta = document.getElementById("hero-cta"), hero = document.getElementById("shop-hero");
  if (!cta || !hero) return;                                     // not on the Shop page: do nothing
  cta.addEventListener("click", function (e) {
    e.preventDefault();                                          // stops the instant jump...
    var smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;   // ...glides instead (unless "reduce motion" is on)
    window.scrollTo({ top: hero.offsetHeight, behavior: smooth ? "smooth" : "auto" });   // to just below the photo
  });
})();

/* =====================================================
   THE SHOP: THE MENU SWITCH. The photo stays in place while the corsets section slides over it,
   so the menu turns back into the normal bar ("past-hero") once that section reaches the top.
   ===================================================== */
(function () {
  var sheet = document.getElementById("shop-products"), bar = document.querySelector(".menu-bar");
  if (!sheet) return;                                            // not on the Shop page: do nothing
  function check() {
    // has the top of the corsets section reached the bottom of the menu bar?
    document.body.classList.toggle("past-hero", sheet.getBoundingClientRect().top <= (bar ? bar.offsetHeight : 80));
  }
  window.addEventListener("scroll", check, { passive: true });   // check while scrolling
  window.addEventListener("resize", check);                     // and when the window changes size
  check();                                                       // and once straight away
})();

/* =====================================================
   THE CART (corset on a hanger). When "Add to bag" is built, it calls CorsetsBag.add():
   the corset fills in, sways on its hook, and the count appears on the swing tag.
   ===================================================== */
window.CorsetsBag = (function () {
  var cart = document.getElementById("cart"), count = document.getElementById("cart-count"), n = 0;   // n = pieces in the bag
  var items = [];                                                // what is in the bag: name, size and price of each piece
  function add(qty, item) {
    if (!cart) return;                                           // no cart on this page: do nothing
    if (item) items.push(item);                                  // remembers the piece (for the bag page, when it is built)
    n += qty || 1; count.textContent = n;                        // adds the pieces and writes the number on the swing tag
    cart.classList.toggle("has-items", n > 0);                   // fills in the corset and shows the tag
    cart.setAttribute("aria-label", "Bag, " + n + (n === 1 ? " item" : " items"));   // what screen readers say
    cart.classList.remove("sway"); void cart.offsetWidth; cart.classList.add("sway");  // restarts the swing
  }
  return { add: add, items: function () { return items.slice(); } };
})();

/* =====================================================
   THE SHOP: ROLLING NAMES AND PRICES. Each corset's name and price is put in twice, stacked, so on
   hover style.css can slide both up one line and make the words "roll", like the homepage titles.
   (shop.html stays simple: you only ever type the name and price once.)
   ===================================================== */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll(".cs-meta > span"), function (el) {
    var word = el.textContent;                        // the name or price as typed in shop.html
    el.textContent = "";
    var box = document.createElement("span");
    box.className = "roll";                           // the one-line window the words roll through
    var one = document.createElement("span");
    one.textContent = word;                           // the copy you see
    var two = document.createElement("span");
    two.textContent = word;                           // the copy waiting underneath
    two.setAttribute("aria-hidden", "true");          // screen readers read it once, not twice
    box.appendChild(one); box.appendChild(two);
    el.appendChild(box);
  });
})();

/* =====================================================
   THE PRODUCT VIEW (Shop): clicking a piece opens it like the homepage articles, with its
   details, sizes and an "Add to bag" button connected to the hanger cart.
   (the look is in style.css under THE PRODUCT VIEW)
   ===================================================== */
(function () {

  /* ---------- SETTINGS ---------- */
  var SIZES = {
    corset: ["XXS-XS", "S-M", "L-XL"],                 // sizes for corsets and tops
    pants: [24, 26, 28, 30, 32, 34, 36],               // sizes for trousers
    men: ["S", "M", "L", "XL", "XXL"],                 // sizes for men's tops and jackets
    menpants: [28, 30, 32, 34, 36, 38],                // waist sizes for men's trousers
    onesize: ["One size"]                              // accessories: one size only (chosen for you)
  };
  var COLLAPSE_WAIT = 750;   // how long after the click the photo starts to fly (the pieces squash first)
  var GROW_TIME = 1000;      // how long the flight takes (the same as the "1s" in .flyer in style.css)
  var TEXT_WAIT = 150;       // how long after landing the details rise in
  var STAGGER = 0.25;        // how much later the pieces on the right squash than those on the left (seconds)

  /* ---------- THE PIECES OF THE PAGE THIS PART CONTROLS ---------- */
  var html = document.documentElement;
  var grid = document.querySelector(".cs-grid");                 // the grid on show (Women to start; changes when Men is clicked)
  var grids = document.querySelectorAll(".cs-grid");             // all the grids: Women and Men
  var layer = document.getElementById("product");               // the product layer
  var slot = document.getElementById("product-slot");           // where the big oval lands
  var flyer = document.getElementById("p-flyer");               // the copy of the photo that flies
  var titleBox = document.getElementById("pd-title");           // the name
  var priceBox = document.getElementById("pd-price");           // the price
  var descBox = document.getElementById("pd-desc");             // the description
  var sizeBox = document.getElementById("pd-sizes");            // the size pills
  var addBtn = document.getElementById("pd-add");               // "Add to bag"
  var closeBtn = document.getElementById("pd-close");           // "Back to women"
  var bar = document.querySelector(".menu-bar");
  if (!grid || !layer || !slot || !flyer) return;               // not on the Shop page: do nothing

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var k = reduceMotion ? 0 : 1;          // 0 = no waiting at all (for people who prefer less motion)
  var chosen = null, img = null, affected = [], isOpen = false, busy = false, pushed = false;
  var piece = null;                      // the open piece: { name, price }
  var size = null;                       // the size chosen

  // the text of a name or price (the rolling hover puts each in twice, so read the first copy)
  function textOf(el) { var f = el.querySelector(".roll > span"); return (f ? f.textContent : el.textContent).trim(); }

  // puts the flying photo exactly over a rectangle
  function placeFlyer(r) { flyer.style.left = r.left + "px"; flyer.style.top = r.top + "px"; flyer.style.width = r.width + "px"; flyer.style.height = r.height + "px"; }

  // fills in the name (each word in its own box so they rise in turn), price, description and sizes
  function fill(card) {
    var parts = card.querySelectorAll(".cs-meta > span");
    piece = { name: textOf(parts[0]), price: parts[1] ? textOf(parts[1]) : "" };
    titleBox.textContent = "";
    piece.name.split(/\s+/).forEach(function (word, i, all) {
      var w = document.createElement("span"); w.className = "w";
      var inner = document.createElement("span"); inner.textContent = word; inner.style.setProperty("--i", i);
      w.appendChild(inner); titleBox.appendChild(w);
      if (i < all.length - 1) titleBox.appendChild(document.createTextNode(" "));   // a space between words
    });
    priceBox.textContent = piece.price;
    descBox.textContent = card.getAttribute("data-desc") || "";
    // "Made by hand in South Africa" only shows on pieces MS makes, not on the accessories (Miscellaneous)
    var note = document.querySelector(".pd-note"), g = card.closest(".cs-grid");
    if (note) note.hidden = !!(g && g.getAttribute("data-dept") === "misc");
    // the size pills: corset sizes, or trouser sizes if data-type="pants"
    size = null; sizeBox.textContent = "";
    (SIZES[card.getAttribute("data-type")] || SIZES.corset).forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "pd-size"; b.textContent = s; b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {                                         // choosing a size
        size = String(s);
        Array.prototype.forEach.call(sizeBox.children, function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        addBtn.textContent = "Add to bag";
      });
      sizeBox.appendChild(b);
    });
    if (sizeBox.children.length === 1) sizeBox.children[0].click();   // only one size (accessories): it is chosen for you
    addBtn.textContent = "Add to bag";
  }

  /* ---------- OPENING ---------- */
  function open(card) {
    if (busy || isOpen) return;          // already opening or open: ignore the click
    busy = true; isOpen = true; chosen = card;
    grid = card.closest(".cs-grid");                        // the grid this piece is in
    var back = document.getElementById("pd-back-dept");     // "Back to women" or "Back to men"
    if (back) back.textContent = grid.getAttribute("data-label") || grid.getAttribute("data-dept") || "women";
    img = card.querySelector(".cs-img img");

    // 1. put a copy of the photo exactly over the clicked one
    var start = card.querySelector(".cs-img").getBoundingClientRect();
    flyer.textContent = "";
    flyer.appendChild(img.cloneNode(true));
    flyer.style.transition = "none"; placeFlyer(start); flyer.style.display = "block";

    // get the details ready, and the spot for the photo just below the menu bar
    fill(card);
    layer.scrollTop = 0;
    layer.style.setProperty("--product-top", ((bar ? bar.getBoundingClientRect().bottom : 72) + 16) + "px");
    layer.setAttribute("aria-hidden", "false");
    html.classList.add("product-open");                     // style.css: the product layer is in use
    card.classList.add("chosen");                           // hides the clicked photo and its name

    // 2. the other pieces on screen squash away, left to right
    affected = Array.prototype.filter.call(grid.querySelectorAll(".cs-card"), function (c) {
      var r = c.getBoundingClientRect();
      return c !== card && r.bottom > 0 && r.top < window.innerHeight;
    });
    affected.forEach(function (c) {
      var left = Math.max(0, c.getBoundingClientRect().left);
      c.style.setProperty("--d", (left / window.innerWidth * STAGGER).toFixed(2) + "s");   // further right = later
      c.classList.remove("expand"); c.classList.add("collapse");
    });

    // the browser's Back button closes the piece again
    try { history.pushState({ product: true }, "", "#" + piece.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")); pushed = true; } catch (e) { pushed = false; }

    // 3. after the pieces have gone, the photo flies to the big spot
    setTimeout(function () {
      layer.classList.add("solid");                         // the page colour covers the grid
      flyer.style.transition = "";                          // use the movement set in style.css
      placeFlyer(slot.getBoundingClientRect());
      // 4. when it has landed, the photo moves into the product view and the details rise in
      setTimeout(function () {
        slot.textContent = ""; slot.appendChild(img.cloneNode(true));
        flyer.style.display = "none";
        layer.classList.add("show");
        busy = false;
        layer.focus({ preventScroll: true });               // the keyboard now works inside the product view
      }, GROW_TIME * k + TEXT_WAIT * k);
    }, COLLAPSE_WAIT * k);
  }

  /* ---------- CLOSING (the same thing backwards) ---------- */
  function close() {
    if (busy || !isOpen) return;
    busy = true;
    var wait = 0;
    if (layer.scrollTop > 2) { layer.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); wait = 500 * k; }   // phones: back to the top first
    setTimeout(function () {
      // hand the photo back to the flying copy, exactly where it is
      flyer.textContent = ""; flyer.appendChild(img.cloneNode(true));
      flyer.style.transition = "none"; placeFlyer(slot.getBoundingClientRect()); flyer.style.display = "block";
      slot.textContent = "";
      void flyer.offsetWidth;                               // lets the browser register the spot before it moves
      layer.classList.remove("show");                       // the details sink away first
      setTimeout(function () {
        layer.classList.remove("solid");                    // the grid shows again...
        flyer.style.transition = "";
        placeFlyer(chosen.querySelector(".cs-img").getBoundingClientRect());   // ...the photo flies home...
        affected.forEach(function (c) { c.classList.remove("collapse"); c.classList.add("expand"); });   // ...and the pieces unfold
        setTimeout(function () {
          // tidy up: everything back to normal
          affected.forEach(function (c) { c.classList.remove("expand"); c.style.removeProperty("--d"); });
          chosen.classList.remove("chosen");
          flyer.style.display = "none"; flyer.textContent = "";
          layer.setAttribute("aria-hidden", "true");
          html.classList.remove("product-open");
          affected = []; chosen = null; isOpen = false; busy = false;
        }, (GROW_TIME + 100) * k);
      }, 500 * k);
    }, wait);
  }

  // closing from the page itself: go "back" in the history, which closes it (keeps Back working)
  function requestClose() {
    if (!isOpen || busy) return;
    if (pushed) { pushed = false; history.back(); } else close();
  }

  /* ---------- ADD TO BAG ---------- */
  addBtn.addEventListener("click", function () {
    if (!size) {                                            // no size chosen yet: ask for one, with a little shake
      addBtn.textContent = "Choose a size first";
      addBtn.classList.remove("nudge"); void addBtn.offsetWidth; addBtn.classList.add("nudge");
      return;
    }
    if (window.CorsetsBag) window.CorsetsBag.add(1, { name: piece.name, size: size, price: piece.price });   // the hanger fills and sways
    addBtn.textContent = "Added to bag \u2713";
    setTimeout(function () { if (isOpen) addBtn.textContent = "Add to bag"; }, 1800);   // back to normal after a moment
  });

  /* ---------- WHAT OPENS AND CLOSES IT ---------- */
  Array.prototype.forEach.call(grids, function (g) {
    g.addEventListener("click", function (e) {              // clicking a piece opens it
      var card = e.target.closest(".cs-card");
      if (!card) return;
      e.preventDefault(); open(card);
    });
  });
  closeBtn.addEventListener("click", requestClose);         // "Back to women"
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") requestClose(); });   // the Escape key
  window.addEventListener("popstate", function () { if (isOpen) { pushed = false; close(); } });   // the browser's Back button

  /* ---------- MEN AND WOMEN IN THE MENU ----------
     Clicking one glides down to the pieces. If the other department is showing, its pieces squash away
     and the new ones unfold in their place (the same squash as opening a piece). The tab you are on is underlined. */
  var hero = document.getElementById("shop-hero");
  var tabs = document.querySelectorAll(".menu-bar a[data-dept]");
  var switching = false;
  function showDept(name) {
    var next = document.getElementById("dept-" + name);
    if (!next || switching) return;
    Array.prototype.forEach.call(tabs, function (t) {        // underline the tab you are on
      if (t.getAttribute("data-dept") === name) t.setAttribute("aria-current", "true"); else t.removeAttribute("aria-current");
    });
    var current = Array.prototype.filter.call(grids, function (g) { return !g.hidden; })[0];
    if (current === next) return;                            // already showing
    switching = true;
    var line = document.getElementById("cs-line");           // the statement line above the pieces
    if (line) line.classList.add("swap");                    // it fades out while the pieces swap...
    var out = current ? Array.prototype.slice.call(current.querySelectorAll(".cs-card")) : [];
    out.forEach(function (c, i) { c.style.setProperty("--d", (i % 3 * 0.08).toFixed(2) + "s"); c.classList.add("collapse"); });   // 1. fold the old pieces away
    setTimeout(function () {
      out.forEach(function (c) { c.classList.remove("collapse"); c.style.removeProperty("--d"); });
      if (current) current.hidden = true;                    // 2. swap the grids
      next.hidden = false;
      if (line) { line.textContent = line.getAttribute("data-" + name) || line.textContent; line.classList.remove("swap"); }   // ...and fades back in with the new words
      var inn = Array.prototype.slice.call(next.querySelectorAll(".cs-card"));
      inn.forEach(function (c, i) { c.style.setProperty("--d", (i % 3 * 0.08).toFixed(2) + "s"); c.classList.add("expand"); });   // 3. unfold the new ones
      setTimeout(function () {
        inn.forEach(function (c) { c.classList.remove("expand"); c.style.removeProperty("--d"); });
        switching = false;
      }, reduceMotion ? 0 : 950);
    }, reduceMotion || !out.length ? 0 : 900);
  }
  // MEN AND MISCELLANEOUS HAVE NO OPENING PHOTO: while either is showing, the women's corset photo at the top
  // is hidden ("no-hero" on the page, see style.css), so they open straight onto their statement and pieces.
  // "dept-men" also swaps the corset on the hanger for the bomber jacket.
  function setDeptMode(name) {
    var wasNoHero = document.body.classList.contains("no-hero");
    var wasGarment = document.body.classList.contains("dept-men") ? "men" : document.body.classList.contains("dept-misc") ? "misc" : "women";
    var noHero = name !== "women";
    document.body.classList.toggle("no-hero", noHero);
    document.body.classList.toggle("dept-men", name === "men");     // the bomber jacket on the hanger
    document.body.classList.toggle("dept-misc", name === "misc");   // the bracelet on the hanger
    if (noHero || wasNoHero) window.scrollTo(0, 0);                        // Men/Misc: top of the pieces. Back to Women: top, on the model's photo
    try { history.replaceState(history.state, "", noHero ? "#" + name : location.pathname + location.search); } catch (e) {}   // shop.html#men / #misc open directly
    window.dispatchEvent(new Event("scroll"));                             // lets the menu switch to the normal bar straight away
    var cart = document.getElementById("cart");                            // the hanger swings when what hangs on it changes
    if (cart && wasGarment !== name) { cart.classList.remove("sway"); void cart.offsetWidth; cart.classList.add("sway"); }
  }
  Array.prototype.forEach.call(tabs, function (t) {
    t.addEventListener("click", function (e) {
      e.preventDefault();
      if (isOpen) { requestClose(); return; }                // if a piece is open, the tab first takes you back to the pieces
      var name = t.getAttribute("data-dept");
      if (name !== "women" || document.body.classList.contains("no-hero")) {   // switching to or from Men/Misc: no glide, the page jumps into place
        setDeptMode(name);
        showDept(name);
        return;
      }
      var top = hero ? hero.offsetHeight : 0;
      var far = Math.abs(window.scrollY - top) > 40;
      window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });   // Women: glide down to the pieces...
      setTimeout(function () { showDept(name); }, far && !reduceMotion ? 700 : 0);   // ...then swap
    });
  });
  // opening the page as shop.html#men or shop.html#misc goes straight there (handy for links from the homepage later)
  var start = location.hash.slice(1);
  if ((start === "men" || start === "misc") && document.getElementById("dept-" + start)) {
    setDeptMode(start);
    Array.prototype.forEach.call(grids, function (g) { g.hidden = g.getAttribute("data-dept") !== start; });
    var ln = document.getElementById("cs-line");
    if (ln) ln.textContent = ln.getAttribute("data-" + start);   // that department's statement line
    Array.prototype.forEach.call(tabs, function (t) {
      if (t.getAttribute("data-dept") === start) t.setAttribute("aria-current", "true"); else t.removeAttribute("aria-current");
    });
  }
})();
