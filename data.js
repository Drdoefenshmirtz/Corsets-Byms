/* =====================================================
   CORSETS BY MS: THE DATA LAYER  (data.js)

   Every part of the site that needs data talks to this ONE file:
   the Shop (which pieces to show), the admin dashboard (admin.html), and later
   the orders, appointments and homepage carousel.

   RIGHT NOW: "browser mode". Everything is stored inside the browser you are using
   (localStorage), starting from the pieces that were built into shop.html (SEED below).
   Nothing to install, but each browser has its OWN copy, and the logins are for show only.

   WHEN THE SITE GOES LIVE: this file is swapped for a Supabase version with the
   SAME functions (CorsetsData.products.list, .save, and so on), so the Shop and the
   dashboard do not need to change. Use "Download backup" in the dashboard to carry
   the data across.
   ===================================================== */
(function () {

  var MODE = "browser";                 // "browser" now; "supabase" once connected
  var SHOW_DEV_LABELS = false;          // true shows the "Development mode" labels and the test logins on the sign-in page
  var KEY = "corsets-db-v1";            // where the data is kept in the browser
  var SESSION = "corsets-admin-session";

  /* ---------- THE ADMIN LOGINS (browser mode only: for testing, NOT secure) ----------
     role "owner"  = MS: everything, including the team
     role "majuta" = Majuta Smart Solutions: everything, for support and updates
     role "staff"  = products (add, edit, hide, reorder), orders and appointments; cannot delete pieces or manage the team */
  var DEV_USERS = [
    { email: "ms@corsetsbyms.dev",     password: "corsets", name: "MS",     role: "owner" },
    { email: "majuta@corsetsbyms.dev", password: "corsets", name: "Majuta", role: "majuta" },
    { email: "staff@corsetsbyms.dev",  password: "corsets", name: "Staff",  role: "staff" }
  ];

  /* ---------- THE SIZE LISTS each piece can use (the same as the product view in script.js) ---------- */
  var SIZE_TYPES = {
    corset:   { label: "Corsets and tops (XXS-XS, S-M, L-XL)" },
    pants:    { label: "Women's trousers (24 to 36)" },
    men:      { label: "Men's tops (S to XXL)" },
    menpants: { label: "Men's trousers (waist 28 to 38)" },
    onesize:  { label: "One size" }
  };
  var DEPTS = { women: "Women", men: "Men", misc: "Miscellaneous" };

  /* ---------- THE STARTING PIECES: copied from shop.html, used the first time (and after "Reset") ---------- */
  var SEED = [{"id": "w1", "dept": "women", "name": "Heritage Corset", "price": 2450, "sizes": "corset", "desc": "A structured, hand-boned corset in a bold heritage print, finished with a high front split skirt. Made to be worn as the centre of the look.", "img": "images/shop-hero-960.jpg", "hidden": false, "order": 1}, {"id": "w2", "dept": "women", "name": "Studio Bustier", "price": 1650, "sizes": "corset", "desc": "A softly structured bustier with hand-placed beading, cut to sit cleanly over tailored trousers or a full skirt.", "img": "images/image-3.jpg", "hidden": false, "order": 2}, {"id": "w3", "dept": "women", "name": "Bridal Corset", "price": 3800, "sizes": "corset", "desc": "A fitted bridal corset in deep red satin, boned for shape and lined for comfort, made for the ceremony through to the last dance.", "img": "images/image-2.jpg", "hidden": false, "order": 3}, {"id": "w4", "dept": "women", "name": "Occasion Corset", "price": 2200, "sizes": "corset", "desc": "A bright occasion corset in printed cotton, shaped through the waist and finished with a sweetheart neckline.", "img": "images/image-5.jpg", "hidden": false, "order": 4}, {"id": "w5", "dept": "women", "name": "Heritage Bodice", "price": 1800, "sizes": "corset", "desc": "A strapless print bodice paired with a tiered skirt, made for celebrations and family occasions.", "img": "images/heritage.jpg", "hidden": false, "order": 5}, {"id": "w6", "dept": "women", "name": "Atelier Trouser", "price": 1950, "sizes": "pants", "desc": "High-waisted wide-leg trousers with a corset-shaped waistband, cut in textured denim and finished with a deep turn-up.", "img": "images/atelier.jpg", "hidden": false, "order": 6}, {"id": "w7", "dept": "women", "name": "Scarlet Satin Corset", "price": 2600, "sizes": "corset", "desc": "A red satin corset with a sculpted dipped neckline and visible boning, paired with a fitted pencil skirt in the same satin.", "img": "images/scarlet.jpg", "hidden": false, "order": 7}, {"id": "w8", "dept": "women", "name": "Pearl Sequin Corset", "price": 2100, "sizes": "corset", "desc": "A blush corset top covered in rose-gold sequins and finished with hand-sewn pearl drops, shaped through the waist with a softly curved hem.", "img": "images/pearl.jpg", "hidden": false, "order": 8}, {"id": "m1", "dept": "men", "name": "Atelier Blazer", "price": 3200, "sizes": "men", "desc": "A structured cream blazer with a sculpted sash that sweeps across the back from shoulder to waist, cut with a clean, boxy shoulder.", "img": "images/men-1.jpg", "hidden": false, "order": 1}, {"id": "m2", "dept": "men", "name": "Studio Zip Jacket", "price": 1850, "sizes": "men", "desc": "A pale blue funnel-neck jacket with a full-length zip, gathered cuffs and a relaxed cropped body.", "img": "images/men-2.jpg", "hidden": false, "order": 2}, {"id": "m3", "dept": "men", "name": "Heritage Linen Vest", "price": 2400, "sizes": "men", "desc": "A wide, sleeveless linen vest worn over high-waisted, button-fly wide-leg trousers in the same natural linen.", "img": "images/men-3.jpg", "hidden": false, "order": 3}, {"id": "m4", "dept": "men", "name": "Atelier Wrap Trouser", "price": 1600, "sizes": "menpants", "desc": "Wide-leg grey trousers with a crossover wrap front and a single button at the waist.", "img": "images/men-4.jpg", "hidden": false, "order": 4}, {"id": "m5", "dept": "men", "name": "Studio Denim Jacket", "price": 1900, "sizes": "men", "desc": "A cropped black denim jacket with contrast topstitching, chest pockets and a structured shoulder.", "img": "images/men-5.jpg", "hidden": false, "order": 5}, {"id": "m6", "dept": "men", "name": "Occasion Bomber", "price": 2800, "sizes": "men", "desc": "A heavy black bomber with an asymmetric double-breasted front, rounded sleeves and a cropped banded hem.", "img": "images/men-6.jpg", "hidden": false, "order": 6}, {"id": "m1", "dept": "misc", "name": "Studio Onyx Brooch", "price": 450, "sizes": "onesize", "desc": "A silver pin brooch strung with hematite beads, fine chains and an onyx heart, finished with a small heart drop.", "img": "images/acc-1.jpg", "hidden": false, "order": 1}, {"id": "m2", "dept": "misc", "name": "Heritage Pearl Brooch", "price": 550, "sizes": "onesize", "desc": "A gold pin brooch with cascading chains, freshwater pearls and a filigree clover charm.", "img": "images/acc-2.jpg", "hidden": false, "order": 2}, {"id": "m3", "dept": "misc", "name": "Atelier Charm Brooch Set", "price": 1200, "sizes": "onesize", "desc": "A set of three gold charm brooches with pearl drops, a dove, a moon and filigree pendants, made to be worn together or apart.", "img": "images/acc-3.jpg", "hidden": false, "order": 3}, {"id": "m4", "dept": "misc", "name": "Occasion Tassel Brooch", "price": 500, "sizes": "onesize", "desc": "A gold pin brooch with a beaded pearl swag and a fall of fine chain tassels ending in a baroque pearl.", "img": "images/acc-4.jpg", "hidden": false, "order": 4}, {"id": "m5", "dept": "misc", "name": "Atelier Leather Corset Belt", "price": 1850, "sizes": "corset", "desc": "A tan leather corset belt with a ruffled peplum, gilded flower clasps and a matching chain-strap pouch.", "img": "images/acc-5.jpg", "hidden": false, "order": 5}, {"id": "m6", "dept": "misc", "name": "Occasion Chain Brooch", "price": 650, "sizes": "onesize", "desc": "A long gold lapel brooch with a heart charm and a shower of fine chains, made to dress up a blazer or a corset.", "img": "images/acc-6.jpg", "hidden": false, "order": 6}];

  /* ---------- THE STARTING HOMEPAGE SLIDES: copied from index.html (the carousel) ---------- */
  var SLIDES = [{"id": "s1", "title": "Heritage", "href": "/article-heritage", "headline": "heritage corsets", "meta1": "Collection|2026", "meta2": "Design|Corsets & couture", "media": {"type": "image", "src": "images/heritage.jpg", "alt": "A woman in a strapless print corset top and tiered skirt at an umbondo celebration"}, "article": ["Heritage is where Corsets by MS began: structured bodices cut and boned by hand, shaped to hold the figure and then forgotten the moment they are worn. Every piece starts from a classic silhouette and is refined over several fittings.", "Steel and cotton coutil give the shape, soft linings give the comfort. The result is a corset made to be seen, not hidden."], "hidden": false, "order": 1}, {"id": "s2", "title": "Bridal", "href": "/article-bridal", "headline": "bridal in red", "meta1": "Bestseller|2026", "meta2": "Design|Bridal & ceremony", "media": {"type": "video", "poster": "images/image-2.jpg", "sources": ["images/image-2.mp4", "images/image-2.webm"], "alt": ""}, "article": ["Bridal in red is a celebration of colour. Instead of white, a fitted red corset dress and a hand-finished veil, made to move with the bride from the ceremony to the very last photograph.", "Each dress is made to measure, with the embroidery chosen together so that the day feels like her own."], "hidden": false, "order": 2}, {"id": "story", "title": "Story", "href": "story.html", "page": "story.html", "headline": "the story of ms", "meta1": "About|Corsets by MS", "meta2": "Made|By hand in South Africa", "media": {"type": "image", "src": "images/shop-hero-960.jpg", "alt": "A model in a blue-striped corset gown with a thigh-high slit, standing in a garden"}, "article": [], "hidden": false, "order": 3}, {"id": "s3", "title": "Studio", "href": "/article-studio", "headline": "studio sessions", "meta1": "Editorial|2026", "meta2": "Design|Tailoring & fit", "media": {"type": "image", "src": "images/image-3.jpg", "alt": ""}, "article": ["Studio sessions are where a design meets the person who will wear it. Soft light, a plain wall and nothing to hide behind: just the line of the garment and how it sits.", "We use these sessions to check the fit, adjust the tailoring and capture the pieces exactly as they look in real life."], "hidden": false, "order": 4}, {"id": "s4", "title": "Atelier", "href": "/article-atelier", "headline": "inside the atelier", "meta1": "Process|2026", "meta2": "Design|Sketches & patterns", "media": {"type": "image", "src": "images/atelier.jpg", "alt": "A woman in high-waisted corset-waist trousers and a white T-shirt in front of steel ring sculptures at night"}, "article": ["Inside the atelier, every garment begins as a sketch. Pencil lines on craft paper turn into patterns, and the patterns into the first rough toile pinned on the stand.", "It is slow, careful work, and it is the reason each piece fits the way it does. Nothing leaves the atelier until it has been tried, adjusted and tried again."], "hidden": false, "order": 5}, {"id": "s5", "title": "Occasion", "href": "/article-occasion", "headline": "occasion wear", "meta1": "Collection|2026", "meta2": "Design|Evening & occasion", "media": {"type": "image", "src": "images/image-5.jpg", "alt": ""}, "article": ["Occasion wear is made for the evenings that matter: engagements, galas, birthdays and everything in between. Clean lines, a defined waist and fabric that catches the light.", "Choose a piece from the collection or book an appointment and we will make something just for you."], "hidden": false, "order": 6}];

  /* ---------- READING AND WRITING THE BROWSER COPY ---------- */
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY) || "null"); if (d && d.products) return d; } catch (e) {}
    return { version: 1, products: JSON.parse(JSON.stringify(SEED)) };
  }
  var db = load();
  // older browser copies (from before orders and appointments existed) get the new lists added
  if (!db.orders) db.orders = [];
  if (!db.appointments) db.appointments = [];
  if (!db.nextOrder) db.nextOrder = 1001;
  if (!db.slides) db.slides = JSON.parse(JSON.stringify(SLIDES));   // the homepage carousel
  // THE STORY SLIDE (added later): browsers that already have their own copy get it slotted in after the second slide,
  // once only (so if someone deletes it in the admin, it stays deleted)
  if (!db.addedStory) {
    if (!db.slides.some(function (x) { return x.id === "story"; })) {
      var st = JSON.parse(JSON.stringify(SLIDES.filter(function (x) { return x.id === "story"; })[0]));
      var ordered = db.slides.slice().sort(function (a, b) { return a.order - b.order; });
      ordered.splice(Math.min(2, ordered.length), 0, st);
      ordered.forEach(function (x, i) { x.order = i + 1; });
      db.slides = ordered;
    }
    db.addedStory = true;
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch (e) { throw new Error("The browser is out of space for photos. Try smaller photos, or remove some."); }
  }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  function done(x) { return Promise.resolve(copy(x)); }   // answers come back "later" (a promise), like the real service will

  /* ---------- LOGINS ---------- */
  var auth = {
    signIn: function (email, password) {
      var u = DEV_USERS.filter(function (x) { return x.email === String(email).trim().toLowerCase() && x.password === password; })[0];
      if (!u) return Promise.reject(new Error("That email and password don't match."));
      var me = { email: u.email, name: u.name, role: u.role };
      try { sessionStorage.setItem(SESSION, JSON.stringify(me)); } catch (e) {}
      return done(me);
    },
    signOut: function () { try { sessionStorage.removeItem(SESSION); } catch (e) {} return done(true); },
    current: function () { try { return JSON.parse(sessionStorage.getItem(SESSION) || "null"); } catch (e) { return null; } },
    // what each role may do
    can: function (what, user) {
      user = user || auth.current(); if (!user) return false;
      if (user.role === "owner" || user.role === "majuta") return true;
      return ["products.edit", "products.hide", "products.reorder", "orders", "appointments"].indexOf(what) > -1;   // staff cannot delete or see Team
    },
    devUsers: function () { return DEV_USERS.map(function (u) { return { email: u.email, password: u.password, role: u.role }; }); }
  };

  /* ---------- PRODUCTS ---------- */
  function sorted(list) { return list.slice().sort(function (a, b) { return a.order - b.order; }); }
  var products = {
    // all pieces (optionally one department; hidden ones only when asked)
    list: function (opts) {
      opts = opts || {};
      var l = db.products.filter(function (p) { return (!opts.dept || p.dept === opts.dept) && (opts.includeHidden || !p.hidden); });
      return done(sorted(l));
    },
    listSync: function (opts) {                                 // the same, answered straight away (used by the Shop while it loads)
      opts = opts || {};
      return copy(sorted(db.products.filter(function (p) { return (!opts.dept || p.dept === opts.dept) && (opts.includeHidden || !p.hidden); })));
    },
    // add a new piece or update one (a piece without an id is new)
    save: function (p) {
      var item = copy(p);
      item.price = Math.max(0, Math.round(+item.price || 0));
      if (!item.id) {
        item.id = uid("p");
        item.order = db.products.filter(function (x) { return x.dept === item.dept; }).reduce(function (m, x) { return Math.max(m, x.order); }, 0) + 1;
        db.products.push(item);
      } else {
        var i = db.products.findIndex(function (x) { return x.id === item.id; });
        var old = db.products[i];
        if (old && old.dept !== item.dept) item.order = db.products.filter(function (x) { return x.dept === item.dept; }).reduce(function (m, x) { return Math.max(m, x.order); }, 0) + 1;
        db.products[i] = item;
      }
      save(); return done(item);
    },
    remove: function (id) { db.products = db.products.filter(function (x) { return x.id !== id; }); save(); return done(true); },
    // set the order of a department's pieces (ids in the new order)
    reorder: function (dept, ids) {
      ids.forEach(function (id, n) { var p = db.products.filter(function (x) { return x.id === id; })[0]; if (p) p.order = n + 1; });
      save(); return done(true);
    }
  };

  /* ---------- HOMEPAGE SLIDES (the carousel) ----------
     each slide: title (the one word above the oval), headline, meta1 and meta2 (the two small captions,
     written "Heading|Text"), article (a list of paragraphs), and media: a photo { type: "image", src }
     or a moving picture { type: "video", poster, sources: [mp4, webm] } */
  var slides = {
    list: function (opts) { opts = opts || {}; return done(sorted(db.slides.filter(function (s) { return opts.includeHidden || !s.hidden; }))); },
    listSync: function (opts) { opts = opts || {}; return copy(sorted(db.slides.filter(function (s) { return opts.includeHidden || !s.hidden; }))); },
    save: function (s) {
      var item = copy(s);
      if (!item.id) { item.id = uid("s"); item.order = db.slides.reduce(function (m, x) { return Math.max(m, x.order); }, 0) + 1; db.slides.push(item); }
      else { var i = db.slides.findIndex(function (x) { return x.id === item.id; }); db.slides[i] = item; }
      save(); return done(item);
    },
    remove: function (id) { db.slides = db.slides.filter(function (x) { return x.id !== id; }); save(); return done(true); },
    reorder: function (ids) { ids.forEach(function (id, n) { var s = db.slides.filter(function (x) { return x.id === id; })[0]; if (s) s.order = n + 1; }); save(); return done(true); }
  };

  /* ---------- ORDERS: every "Order on WhatsApp" from the bag is saved here too ----------
     status: "new", "confirmed", "making", "delivered" or "cancelled" */
  var ORDER_STATUS = { "new": "New", confirmed: "Confirmed", making: "Making", delivered: "Delivered", cancelled: "Cancelled" };
  var orders = {
    create: function (o) {
      var item = copy(o);
      item.id = uid("o"); item.number = db.nextOrder++; item.createdAt = new Date().toISOString(); item.status = "new";
      db.orders.push(item); save(); return done(item);
    },
    list: function () { return done(db.orders.slice().sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; })); },
    setStatus: function (id, status) { var o = db.orders.filter(function (x) { return x.id === id; })[0]; if (o) { o.status = status; save(); } return done(o || null); },
    remove: function (id) { db.orders = db.orders.filter(function (x) { return x.id !== id; }); save(); return done(true); }
  };

  /* ---------- APPOINTMENTS: every booking from the appointments panel is saved here ----------
     status: "new", "confirmed", "done" or "cancelled" */
  var APPT_STATUS = { "new": "New", confirmed: "Confirmed", done: "Done", cancelled: "Cancelled" };
  var appointments = {
    create: function (a) {
      var item = copy(a);
      item.id = uid("a"); item.createdAt = new Date().toISOString(); item.status = "new";
      db.appointments.push(item); save(); return done(item);
    },
    list: function () { return done(db.appointments.slice().sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; })); },
    setStatus: function (id, status) { var o = db.appointments.filter(function (x) { return x.id === id; })[0]; if (o) { o.status = status; save(); } return done(o || null); },
    remove: function (id) { db.appointments = db.appointments.filter(function (x) { return x.id !== id; }); save(); return done(true); }
  };

  /* ---------- PHOTOS: shrunk to at most 1000 x 1333 so the browser copy stays small ---------- */
  function savePhoto(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) return reject(new Error("Please choose a photo (JPG or PNG)."));
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var s = Math.min(1, 1000 / img.width, 1333 / img.height);
          var c = document.createElement("canvas");
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = function () { reject(new Error("That photo could not be read.")); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- BACKUP: download everything as a file, or load one (moves data between browsers, and into Supabase later) ---------- */
  var backup = {
    exportJSON: function () { return JSON.stringify(db, null, 1); },
    importJSON: function (text) {
      var d = JSON.parse(text); if (!d || !Array.isArray(d.products)) throw new Error("That file isn't a Corsets by MS backup.");
      db = d; save(); return true;
    },
    reset: function () { db = { version: 1, products: copy(SEED), orders: db.orders, appointments: db.appointments, nextOrder: db.nextOrder, slides: copy(SLIDES) }; save(); return true; }   // resets the pieces and the homepage slides (orders and bookings are kept)
  };

  /* ---------- THE SHOP: draws each department's pieces from the data (same markup as before) ---------- */
  function rand(n) { return "R " + Number(n).toLocaleString("en-US"); }
  function renderShop() {
    var grids = document.querySelectorAll(".cs-grid[data-dept]");
    if (!grids.length) return;
    Array.prototype.forEach.call(grids, function (g) {
      var list = products.listSync({ dept: g.getAttribute("data-dept") });
      g.textContent = "";
      list.forEach(function (p) {
        var a = document.createElement("a");
        a.className = "cs-card"; a.href = "#"; a.setAttribute("data-type", p.sizes); a.setAttribute("data-desc", p.desc || ""); a.setAttribute("data-id", p.id);
        a.innerHTML = '<span class="cs-img"><img alt=""></span><span class="cs-meta"><span></span><span></span></span>';
        a.querySelector("img").src = p.img || "";
        var m = a.querySelectorAll(".cs-meta > span");
        m[0].textContent = p.name; m[1].textContent = rand(p.price);
        g.appendChild(a);
      });
    });
  }

  window.CorsetsData = {
    mode: MODE, showDevLabels: SHOW_DEV_LABELS, depts: DEPTS, sizeTypes: SIZE_TYPES,
    auth: auth, products: products, slides: slides, orders: orders, appointments: appointments,
    orderStatus: ORDER_STATUS, apptStatus: APPT_STATUS, savePhoto: savePhoto, backup: backup, renderShop: renderShop,
    formatPrice: rand,
    // re-reads the browser copy (when another tab of this browser has changed it)
    reload: function () { db = load(); if (!db.orders) db.orders = []; if (!db.appointments) db.appointments = []; if (!db.nextOrder) db.nextOrder = 1001; if (!db.slides) db.slides = copy(SLIDES); }
  };

  /* ---------- THE HOMEPAGE: draws the carousel slides from the data (same markup as before) ---------- */
  function renderHome() {
    var rail = document.getElementById("carousel-rail");
    if (!rail) return;
    var list = slides.listSync();
    if (!list.length) return;                                    // no slides showing: keep the built-in ones
    rail.textContent = "";
    list.forEach(function (s) {
      var card = document.createElement("article"); card.className = "card";
      var m = s.media || {};
      if (m.type === "video") {
        var v = document.createElement("video");
        v.poster = m.poster || ""; v.autoplay = true; v.muted = true; v.loop = true; v.setAttribute("playsinline", ""); v.preload = "auto";
        v.setAttribute("aria-label", m.alt || s.title);
        (m.sources || []).forEach(function (src) {
          var so = document.createElement("source"); so.src = src; so.type = /\.webm$/.test(src) ? "video/webm" : "video/mp4"; v.appendChild(so);
        });
        card.appendChild(v);
      } else {
        var img = document.createElement("img"); img.src = m.src || ""; img.alt = m.alt || ""; img.draggable = false; card.appendChild(img);
      }
      // a slide with its own page (the Story) opens that page instead of an article
      if (s.page) card.setAttribute("data-page", s.page);
      var a = document.createElement("a"); a.className = "card-title"; a.href = s.page || s.href || "#";
      a.setAttribute("data-headline", s.headline || s.title.toLowerCase());
      a.setAttribute("data-meta-1", s.meta1 || ""); a.setAttribute("data-meta-2", s.meta2 || "");
      a.textContent = s.title; card.appendChild(a);
      var art = document.createElement("div"); art.className = "card-article"; art.hidden = true;
      (s.article || []).forEach(function (p) { var el = document.createElement("p"); el.textContent = p; art.appendChild(el); });
      card.appendChild(art);
      rail.appendChild(card);
    });
  }

  // Replace the built-in pieces and slides with the ones from the data (before script.js runs).
  // If anything goes wrong, the built-in ones stay: the Shop and the homepage never go blank.
  try { renderShop(); } catch (e) {}
  try { renderHome(); } catch (e) {}
})();
