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

  /* THE PAGE CONTENT the admin can edit: the contact details (Settings), the Help & policies page,
     the Story page and the Shop's words. These starting values are exactly what the pages show today. */
  var CONTENT = {"settings": {"whatsapp": "27000000000", "email": "hello@corsetsbyms.co.za", "instagram": "https://www.instagram.com/", "tiktok": "https://www.tiktok.com/"}, "policies": {"faqs": [{"q": "How do I place an order?", "a": "Add your pieces to the bag, enter your name and phone number, and tap Order on WhatsApp. Your order arrives with MS as a WhatsApp message, and she will reply to confirm sizes, payment and delivery."}, {"q": "How do I pay?", "a": "Once your order is confirmed we send you payment details. We accept [EFT / card / other methods to be confirmed]. Your order goes ahead once payment has cleared."}, {"q": "How do I find my size?", "a": "Corsets come in XXS–XS, S–M and L–XL, and pants from size 24 to 36. If you are between sizes, or want a piece made to your exact measurements, send us a message or book an appointment and we will help you choose."}, {"q": "Can I have a piece made to measure?", "a": "Yes. Book an appointment from the homepage and we will talk through the occasion, the fabric and the fit. Made-to-measure pieces usually take [number] weeks, with [number] fittings along the way."}, {"q": "How long does delivery take?", "a": "Ready-to-wear pieces are sent within [number] working days of payment. We deliver across South Africa by [courier name] for [delivery fee], and you can also collect from [area / by arrangement]."}, {"q": "Do you deliver outside South Africa?", "a": "[Not at the moment / Yes, to selected countries – to be confirmed.] Message us on WhatsApp and we will let you know what is possible."}, {"q": "How do I care for my corset?", "a": "Spot clean or hand wash gently in cold water, never tumble dry, and store it flat or hanging so the boning keeps its shape. [Care details to be confirmed for each fabric.]"}, {"q": "Can I return or exchange something?", "a": "Ready-to-wear pieces can be returned or exchanged in their original condition. Made-to-measure pieces are made for you alone, so they cannot be returned, but we will always put right anything that is faulty. See the Returns policy for the details."}], "returns": {"updated": "[date]", "sections": [{"h": "ready-to-wear pieces", "p": "If you change your mind, you can return a ready-to-wear piece within [7] days of receiving it. It must be unworn, unwashed and in its original condition, with any tags still attached. We will refund you, or exchange it for another size or piece, once it has reached us and been checked."}, {"h": "made-to-measure pieces", "p": "Made-to-measure pieces are cut and sewn to your own measurements, so they cannot be returned for a change of mind. If something is not right with the fit, tell us within [number] days of collection and we will alter it."}, {"h": "accessories", "p": "Accessories can be returned within [7] days if unused and in their original packaging. For hygiene reasons, [earrings / other items to be confirmed] cannot be returned."}, {"h": "faulty pieces", "p": "If a piece arrives damaged or develops a fault from the way it was made, message us with a photo. We will repair, replace or refund it, in line with your rights under the Consumer Protection Act."}, {"h": "how to return something", "p": "Send us a WhatsApp message with your order number and the reason for the return, and we will arrange the next step. [Who pays for return delivery – to be confirmed.] Refunds are paid within [number] working days to the account you paid from."}]}, "privacy": {"updated": "[date]", "sections": [{"h": "who we are", "p": "Corsets by MS is a South African fashion label run by [MS’s full name or business name]. We respect your privacy and handle your personal information in line with the Protection of Personal Information Act (POPIA)."}, {"h": "what we collect", "p": "When you place an order we collect your name, your phone number and the pieces you choose. When you book an appointment we collect your name, your contact details and the answers you give in the booking form. We do not ask for your ID number, and we never see your card details."}, {"h": "how we use it", "p": "Only to arrange your order or appointment: to confirm it, to make and deliver your piece, and to keep in touch about it. We do not sell your information, and we do not send marketing messages unless you ask us to."}, {"h": "who we share it with", "p": "Orders and bookings are sent to us through WhatsApp, so WhatsApp handles those messages under its own privacy policy. We share your delivery details with our courier, and with no one else unless the law requires it."}, {"h": "cookies and your browser", "p": "This site does not use cookies, and we do not track you or show you adverts. Your browser remembers your bag, and your name and phone number if you have ordered before, so you do not have to enter them again. This stays on your own device, and you can clear it at any time by clearing your browser’s site data."}, {"h": "how long we keep it", "p": "We keep order and appointment records for as long as we need them to look after your order, and for as long as the law requires for our business records [number of years], and then delete them."}, {"h": "your rights", "p": "You can ask to see the information we hold about you, ask us to correct it, or ask us to delete it. Contact our Information Officer, [name], at [email address] or on WhatsApp. If you are unhappy with how we handle your information, you can complain to the Information Regulator of South Africa."}]}, "terms": {"updated": "[date]", "sections": [{"h": "about these terms", "p": "These terms apply when you browse this site or buy from Corsets by MS, [business name and registration number], [address]. By placing an order you agree to them."}, {"h": "prices", "p": "Prices are shown in South African rand and [include VAT / are not subject to VAT – to be confirmed]. Delivery is charged separately and confirmed with your order. We may change prices from time to time, but the price confirmed for your order will not change."}, {"h": "orders and payment", "p": "Sending an order on WhatsApp is a request to buy. Your order is accepted once we confirm it and your payment has cleared. If a piece is no longer available we will let you know and refund anything you have paid."}, {"h": "made-to-measure work", "p": "Made-to-measure pieces need a deposit of [percentage] before work begins, with the balance due before collection. Timelines are agreed at your consultation and depend on your fittings."}, {"h": "delivery", "p": "We deliver within South Africa using [courier name]. Delivery times are estimates. Once a parcel has been delivered to the address you gave us, it is your responsibility."}, {"h": "colours and photos", "p": "We photograph our pieces as accurately as we can, but colours can look different on different screens, and because each piece is finished by hand, small variations are part of its character."}, {"h": "our designs", "p": "All designs, photos and text on this site belong to Corsets by MS and may not be copied or used without our permission."}, {"h": "the law", "p": "These terms are governed by the law of South Africa, and nothing in them takes away your rights under the Consumer Protection Act or the Electronic Communications and Transactions Act. We may update these terms, and the version on this page is the one that applies."}]}}, "story": {"title": "the story of ms", "edgeLeft": "Made by hand", "edgeRight": "South Africa", "wordsKicker": "Who we are", "words": "Every corset begins with a conversation. MS measures, cuts and sews each piece by hand, shaping fabric into structure that holds you as if it was always yours. No two bodies are the same, so no two corsets are either.", "craftKicker": "The craft", "craftBg": {"video": "story/standin/montage.mp4", "poster": "story/standin/montage.jpg", "photo": ""}, "craft": [{"title": "measure", "text": "Every measurement taken by hand, then taken again. The fit starts here.", "media": {"video": "story/standin/measure.mp4", "poster": "story/standin/measure.jpg", "photo": ""}}, {"title": "cut", "text": "A pattern drawn for one person only, cut from fabric chosen together.", "media": {"video": "story/standin/cut.mp4", "poster": "story/standin/cut.jpg", "photo": ""}}, {"title": "sew", "text": "Boned, lined and finished stitch by stitch, until it holds its shape on its own.", "media": {"video": "story/standin/sew.mp4", "poster": "story/standin/sew.jpg", "photo": ""}}], "cardsKicker": "In numbers", "cards": [{"big": "1:1", "text": "Every piece is cut to one person's measurements."}, {"big": "100%", "text": "Measured, cut, boned and finished by hand."}, {"big": "3", "text": "Fittings, on average, before a corset is ready."}, {"big": "48h", "text": "Every booking gets a reply within 48 hours."}], "quote": {"text": "“a corset should hold you the way a good friend does: firmly, and never too tight.”", "cite": "MS, founder", "photo": "images/shop-hero-1920.jpg"}, "fabricsKicker": "The fabrics", "fabricsHeading": "every thread chosen", "fabricsText": "The fabric, the thread and the finish are chosen with you, then worked by hand until the detail is right. Every piece is lined so it feels as good as it looks.", "fabrics": [{"video": "story/standin/yarn.mp4", "poster": "story/standin/yarn.jpg", "photo": ""}, {"video": "story/standin/embroidery.mp4", "poster": "story/standin/embroidery.jpg", "photo": ""}], "stepsKicker": "How it works", "steps": [{"title": "consultation", "text": "We talk about the occasion, the fabric and the shape you have in mind.", "media": {"video": "story/standin/sketch.mp4", "poster": "story/standin/sketch.jpg", "photo": ""}}, {"title": "measurements", "text": "A full set of measurements, so the pattern is drawn for you and nobody else.", "media": {"video": "story/standin/pattern.mp4", "poster": "story/standin/pattern.jpg", "photo": ""}}, {"title": "fittings", "text": "The corset is tried, adjusted and tried again until it sits exactly right.", "media": {"video": "story/standin/fitting.mp4", "poster": "story/standin/fitting.jpg", "photo": ""}}, {"title": "collection", "text": "The finishing touches, a final fitting, and it is yours to wear.", "media": {"video": "story/standin/finished.mp4", "poster": "story/standin/finished.jpg", "photo": ""}}], "endHeading": "now, let’s make yours", "endButton": "Book an appointment"}, "shop": {"heroMain": "2026 Corsets collection", "heroSub": "Made by hand in South Africa", "heroPhoto": "", "lineWomen": "Structured, boned and fitted by hand.", "lineMen": "Tailored, sculpted and finished by hand.", "lineMisc": "Finishing touches, chosen to complete the look."}};

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
  // THE PAGE CONTENT (added later): browsers that already have a copy get the starting content,
  // and any part added since (e.g. a new section) is filled in without touching what was edited
  if (!db.content) db.content = JSON.parse(JSON.stringify(CONTENT));
  Object.keys(CONTENT).forEach(function (k) { if (!db.content[k]) db.content[k] = JSON.parse(JSON.stringify(CONTENT[k])); });
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
      return ["products.edit", "products.hide", "products.reorder", "orders", "appointments", "story", "shoppage"].indexOf(what) > -1;   // staff cannot delete or see Team
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
  function savePhoto(file, maxW, maxH) {
    maxW = maxW || 1000; maxH = maxH || 1333;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) return reject(new Error("Please choose a photo (JPG or PNG)."));
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var s = Math.min(1, maxW / img.width, maxH / img.height);
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

  /* ---------- PAGE CONTENT: get and save one part at a time ("settings", "policies", "story" or "shop") ---------- */
  var content = {
    get: function (k) { return done(db.content[k]); },
    getSync: function (k) { return copy(db.content[k]); },
    save: function (k, v) { db.content[k] = copy(v); save(); return done(v); },
    original: function (k) { return copy(CONTENT[k]); }       // the starting version, for "put back the original"
  };

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
    auth: auth, products: products, slides: slides, orders: orders, appointments: appointments, content: content,
    orderStatus: ORDER_STATUS, apptStatus: APPT_STATUS, savePhoto: savePhoto, backup: backup, renderShop: renderShop,
    formatPrice: rand,
    // re-reads the browser copy (when another tab of this browser has changed it)
    reload: function () { db = load(); if (!db.orders) db.orders = []; if (!db.appointments) db.appointments = []; if (!db.nextOrder) db.nextOrder = 1001; if (!db.slides) db.slides = copy(SLIDES); if (!db.content) db.content = copy(CONTENT); }
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

  /* =====================================================
     PUTTING THE EDITED CONTENT ON THE PAGES
     Each one only acts on the page that has its parts, so data.js can be loaded on every page.
     ===================================================== */
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function setText(sel, t) { var el = document.querySelector(sel); if (el && t != null) el.textContent = t; }

  // CONTACT DETAILS: every link marked data-link="whatsapp|email|instagram|tiktok" points to the saved details
  // (a link with nothing saved is hidden)
  function applySettings() {
    var s = db.content.settings || {}, wa = String(s.whatsapp || "").replace(/\D/g, "");
    Array.prototype.forEach.call(document.querySelectorAll("a[data-link]"), function (a) {
      var t = a.getAttribute("data-link");
      var url = t === "whatsapp" ? (wa ? "https://wa.me/" + wa : "") : t === "email" ? (s.email ? "mailto:" + s.email : "") : (s[t] || "");
      a.hidden = !url; if (url) a.href = url;
    });
  }

  // HELP & POLICIES (info.html)
  function renderPolicies() {
    var faqs = document.getElementById("faqs"); if (!faqs || !document.querySelector(".in-tabs")) return;
    var p = db.content.policies;
    faqs.innerHTML = (p.faqs || []).map(function (f) { return "<details><summary>" + esc(f.q) + "</summary>\n<p>" + esc(f.a) + "</p></details>"; }).join("\n");
    ["returns", "privacy", "terms"].forEach(function (id) {
      var el = document.getElementById(id), d = p[id]; if (!el || !d) return;
      el.innerHTML = '<p class="in-updated">Last updated: ' + esc(d.updated) + "</p>\n" +
        (d.sections || []).map(function (x) { return "<h2>" + esc(x.h) + "</h2>\n<p>" + esc(x.p) + "</p>"; }).join("\n");
    });
  }

  // THE STORY PAGE (story.html): runs before story.js, which then adds the movement
  function media(m, playNow) {
    m = m || {};
    if (m.photo) return '<img src="' + esc(m.photo) + '" alt="">';                         // a photo uploaded in the admin
    return '<video src="' + esc(m.video) + '" poster="' + esc(m.poster) + '" muted loop ' + (playNow ? "autoplay " : 'preload="none" ') + 'playsinline aria-hidden="true"></video>';
  }
  function renderStory() {
    if (!document.querySelector(".st-craft")) return;
    var s = db.content.story;
    setText("#title", s.title); document.getElementById("title").setAttribute("aria-label", s.title);
    setText(".st-edge-l", s.edgeLeft); setText(".st-edge-r", s.edgeRight);
    setText(".st-words .st-kicker", s.wordsKicker); setText("#fill", s.words);
    // the craft: the moving background and the three panels
    var bg = document.querySelector(".st-craft-bg");
    if (bg) bg.outerHTML = s.craftBg && s.craftBg.photo ? '<img class="st-craft-bg" src="' + esc(s.craftBg.photo) + '" alt="" aria-hidden="true">'
      : '<video class="st-craft-bg" src="' + esc(s.craftBg.video) + '" poster="' + esc(s.craftBg.poster) + '" muted loop autoplay playsinline aria-hidden="true"></video>';
    setText(".st-craft-kicker", s.craftKicker);
    document.querySelector(".st-panels").innerHTML = (s.craft || []).map(function (c, i) {
      return '<article class="st-panel"><div class="st-panel-media">' + media(c.media, true) + '</div><span class="st-num">' + ("0" + (i + 1)).slice(-2) +
        "</span><h2>" + esc(c.title) + "</h2><p>" + esc(c.text) + "</p></article>";
    }).join("");
    // the number cards
    var cards = document.getElementById("cards");
    cards.innerHTML = '<p class="st-kicker">' + esc(s.cardsKicker) + "</p>" + (s.cards || []).map(function (c) {
      return '<div class="st-card"><span class="st-big">' + esc(c.big) + "</span><p>" + esc(c.text) + "</p></div>";
    }).join("");
    // the growing photo and the quote
    var gimg = document.querySelector("#grow-frame img"); if (gimg && s.quote.photo) gimg.src = s.quote.photo;
    setText("#quote p", s.quote.text); setText("#quote cite", s.quote.cite);
    // the fabrics
    setText(".st-fab-text .st-kicker", s.fabricsKicker); setText(".st-fab-text .st-h2", s.fabricsHeading); setText(".st-fab-text p:last-child", s.fabricsText);
    Array.prototype.forEach.call(document.querySelectorAll(".st-fab-media"), function (el, i) { if (s.fabrics[i]) el.innerHTML = media(s.fabrics[i], true); });
    // how it works
    setText(".st-steps-head .st-kicker", s.stepsKicker);
    document.getElementById("track").innerHTML = (s.steps || []).map(function (c, i) {
      return '<article class="st-step"><div class="st-step-media">' + media(c.media, false) + '</div><span class="st-num">' + ("0" + (i + 1)).slice(-2) +
        "</span><h3>" + esc(c.title) + "</h3><p>" + esc(c.text) + "</p></article>";
    }).join("");
    // the ending
    setText("#end-inner .st-h2", s.endHeading);
    var cta = document.querySelector("#end-inner .st-cta .roll");
    if (cta) cta.innerHTML = "<span>" + esc(s.endButton) + '</span><span aria-hidden="true">' + esc(s.endButton) + "</span>";
  }

  // THE SHOP'S WORDS AND OPENING PHOTO (shop.html)
  function renderShopPage() {
    var line = document.getElementById("cs-line"); if (!line) return;
    var s = db.content.shop;
    setText(".hc-main", s.heroMain); setText(".hc-sub", s.heroSub);
    line.setAttribute("data-women", s.lineWomen); line.setAttribute("data-men", s.lineMen); line.setAttribute("data-misc", s.lineMisc);
    line.textContent = s.lineWomen;
    if (s.heroPhoto) {                                   // a new opening photo uploaded in the admin replaces the built-in ones
      var pic = document.querySelector(".shop-hero picture");
      if (pic) pic.outerHTML = '<picture><img src="' + esc(s.heroPhoto) + '" alt=""></picture>';
    }
  }

  // Replace the built-in pieces and slides with the ones from the data (before script.js runs).
  // If anything goes wrong, the built-in ones stay: the Shop and the homepage never go blank.
  try { renderShop(); } catch (e) {}
  try { renderHome(); } catch (e) {}
  try { renderShopPage(); } catch (e) {}
  try { renderStory(); } catch (e) {}
  try { renderPolicies(); } catch (e) {}
  try { applySettings(); } catch (e) {}
})();
