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

  /* ---------- READING AND WRITING THE BROWSER COPY ---------- */
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY) || "null"); if (d && d.products) return d; } catch (e) {}
    return { version: 1, products: JSON.parse(JSON.stringify(SEED)) };
  }
  var db = load();
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
      return ["products.edit", "products.hide", "products.reorder", "orders", "appointments"].indexOf(what) > -1;
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
    reset: function () { db = { version: 1, products: copy(SEED) }; save(); return true; }
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
    mode: MODE, depts: DEPTS, sizeTypes: SIZE_TYPES,
    auth: auth, products: products, savePhoto: savePhoto, backup: backup, renderShop: renderShop,
    formatPrice: rand
  };

  // On the Shop page: replace the built-in pieces with the ones from the data (before script.js runs)
  try { renderShop(); } catch (e) { /* if anything goes wrong, the built-in pieces stay: the Shop never goes blank */ }
})();
