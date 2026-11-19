/* =====================================================
   THE ADMIN DASHBOARD (admin.html)
   Signing in, the tabs, the list of pieces and the piece editor.
   It only ever talks to CorsetsData (data.js), so it keeps working unchanged
   when data.js is switched from "browser mode" to the live Supabase service.
   ===================================================== */
(function () {
  var D = window.CorsetsData;
  var $ = function (id) { return document.getElementById(id); };
  var html = document.documentElement;
  var me = null;                 // who is signed in
  var dept = "women";            // the department showing under Products
  var editing = null;            // the piece open in the editor (null = a new piece)
  var photo = "";                // the editor's photo (a file path or an uploaded photo)

  /* ---------- SMALL MESSAGES at the bottom ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, 2400);
  }

  /* =====================================================
     SIGNING IN
     ===================================================== */
  // browser mode: list the test logins (tap one to fill in the form)
  if (D.mode === "browser" && D.showDevLabels) {
    D.auth.devUsers().forEach(function (u) {
      var li = document.createElement("li");
      li.textContent = u.email + "  ·  " + u.role;
      li.addEventListener("click", function () { $("login-form").email.value = u.email; $("login-form").password.value = u.password; });
      $("dev-users").appendChild(li);
    });
  } else { $("dev-box").hidden = true; $("mode-pill").hidden = true; }   // looks like the live site (no developer labels)

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    D.auth.signIn(f.email.value, f.password.value).then(start).catch(function (err) {
      $("login-error").textContent = err.message; $("login-error").hidden = false;
    });
  });
  $("sign-out").addEventListener("click", function () { D.auth.signOut().then(function () { location.reload(); }); });

  var ROLE = { owner: "Owner", majuta: "Majuta", staff: "Staff" };
  function start(user) {
    me = user;
    $("login").hidden = true; $("app").hidden = false;
    $("who").textContent = user.name + " · " + ROLE[user.role];
    // Team is only for the owner and Majuta
    // each tab marked data-need only shows for the roles allowed it (Team, Policies and Settings: MS and Majuta)
    Array.prototype.forEach.call(document.querySelectorAll("[data-need]"), function (b) { b.hidden = !D.auth.can(b.getAttribute("data-need"), me); });
    requestAnimationFrame(moveLine);
    drawDepts(); drawList(); drawTeam(); drawInboxes(); drawSlides();
    Object.keys(EDITORS).forEach(function (k) { if (D.auth.can(k, me)) openEditor(k); });
  }

  /* =====================================================
     THE TABS (a line slides under the one you are on)
     ===================================================== */
  function moveLine() {
    var on = document.querySelector(".tabs button.is-on"), line = document.querySelector(".tabs-line");
    if (!on) return;
    line.style.setProperty("--x", on.offsetLeft + "px"); line.style.setProperty("--w", on.offsetWidth);
  }
  Array.prototype.forEach.call(document.querySelectorAll(".tabs button"), function (b) {
    b.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll(".tabs button"), function (x) { x.classList.toggle("is-on", x === b); });
      Array.prototype.forEach.call(document.querySelectorAll(".panel"), function (p) { p.hidden = p.getAttribute("data-panel") !== b.getAttribute("data-tab"); });
      moveLine();
    });
  });
  window.addEventListener("resize", moveLine);

  /* =====================================================
     PRODUCTS
     ===================================================== */
  // the department buttons, each with how many pieces it has
  function drawDepts() {
    var box = $("depts"); box.textContent = "";
    Object.keys(D.depts).forEach(function (d) {
      var n = D.products.listSync({ dept: d, includeHidden: true }).length;
      var b = document.createElement("button"); b.type = "button";
      b.className = d === dept ? "is-on" : "";
      b.innerHTML = '<span></span><span class="n"></span>';
      b.firstChild.textContent = D.depts[d]; b.lastChild.textContent = n;
      b.addEventListener("click", function () { dept = d; drawDepts(); drawList(); });
      box.appendChild(b);
    });
  }

  // the list of pieces in the department
  function drawList() {
    D.products.list({ dept: dept, includeHidden: true }).then(function (list) {
      var box = $("list"); box.textContent = "";
      if (!list.length) { box.innerHTML = '<p class="soon">No pieces here yet. Tap "+ Add piece" to add the first one.</p>'; return; }
      list.forEach(function (p, i) {
        var row = document.createElement("div");
        row.className = "row" + (p.hidden ? " is-hidden" : ""); row.style.setProperty("--r", i);
        row.innerHTML =
          '<div class="row-move"><button type="button" aria-label="Move up">↑</button><button type="button" aria-label="Move down">↓</button></div>' +
          '<div class="row-img"><img alt=""></div>' +
          '<div class="row-name"><span class="nm"></span><small></small></div>' +
          '<div class="row-price"></div><div class="row-sizes"></div>' +
          '<div class="row-actions"><button type="button" class="link" data-act="hide"></button><button type="button" class="link" data-act="edit">Edit</button></div>';
        if (p.img) row.querySelector("img").src = p.img; else row.querySelector("img").remove();
        row.querySelector(".nm").textContent = p.name;
        if (p.hidden) { var b = document.createElement("span"); b.className = "badge"; b.textContent = "Hidden"; row.querySelector(".row-name").appendChild(b); }
        row.querySelector("small").textContent = (p.desc || "").slice(0, 70) + ((p.desc || "").length > 70 ? "…" : "");
        row.querySelector(".row-price").textContent = D.formatPrice(p.price);
        row.querySelector(".row-sizes").textContent = (D.sizeTypes[p.sizes] || {}).label || "";
        row.querySelector('[data-act="hide"]').textContent = p.hidden ? "Show" : "Hide";
        // move up / down
        var ups = row.querySelectorAll(".row-move button");
        ups[0].disabled = i === 0; ups[1].disabled = i === list.length - 1;
        ups[0].addEventListener("click", function () { move(list, i, -1); });
        ups[1].addEventListener("click", function () { move(list, i, 1); });
        // hide / show
        row.querySelector('[data-act="hide"]').addEventListener("click", function () {
          p.hidden = !p.hidden; D.products.save(p).then(function () { drawList(); toast(p.hidden ? "Hidden from the Shop" : "Showing in the Shop"); });
        });
        row.querySelector('[data-act="edit"]').addEventListener("click", function () { openEditor(p); });
        box.appendChild(row);
      });
    });
  }
  function move(list, i, step) {
    var ids = list.map(function (p) { return p.id; });
    var j = i + step; var t = ids[i]; ids[i] = ids[j]; ids[j] = t;
    D.products.reorder(dept, ids).then(function () { drawList(); toast("Order updated"); });
  }

  /* =====================================================
     THE PIECE EDITOR
     ===================================================== */
  var form = $("editor-form");
  // fill the Department and Sizes choices
  Object.keys(D.depts).forEach(function (d) { var o = document.createElement("option"); o.value = d; o.textContent = D.depts[d]; $("f-dept").appendChild(o); });
  Object.keys(D.sizeTypes).forEach(function (s) { var o = document.createElement("option"); o.value = s; o.textContent = D.sizeTypes[s].label; $("f-sizes").appendChild(o); });

  function setPhoto(src) {
    photo = src || "";
    $("photo-img").hidden = !photo; $("photo-empty").hidden = !!photo;
    if (photo) $("photo-img").src = photo;
  }
  function openEditor(p) {
    editing = p || null;
    $("editor-title").textContent = p ? "edit piece" : "new piece";
    form.name.value = p ? p.name : "";
    form.price.value = p ? p.price : "";
    form.dept.value = p ? p.dept : dept;
    form.sizes.value = p ? p.sizes : (dept === "men" ? "men" : dept === "misc" ? "onesize" : "corset");
    form.desc.value = p ? (p.desc || "") : "";
    form.visible.checked = p ? !p.hidden : true;
    setPhoto(p ? p.img : "");
    $("form-error").hidden = true;
    var del = $("delete-piece");
    del.hidden = !p || !D.auth.can("products.delete", me);       // only the owner and Majuta can delete
    del.textContent = "Delete piece"; del.dataset.armed = "";
    $("editor").setAttribute("aria-hidden", "false");
    html.classList.add("editing");
    setTimeout(function () { form.name.focus(); }, 400);
  }
  function closeEditor() { html.classList.remove("editing"); $("editor").setAttribute("aria-hidden", "true"); }
  $("add-piece").addEventListener("click", function () { openEditor(null); });
  Array.prototype.forEach.call(document.querySelectorAll("#editor [data-close]"), function (c) { c.addEventListener("click", closeEditor); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && html.classList.contains("editing")) closeEditor(); });

  // the photo: tap to choose, or drop a file onto the oval
  $("photo-input").addEventListener("change", function () { usePhoto(this.files[0]); this.value = ""; });
  var drop = $("photo-drop");
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("is-over"); }); });
  drop.addEventListener("drop", function (e) { usePhoto(e.dataTransfer.files[0]); });
  function usePhoto(file) { if (!file) return; D.savePhoto(file).then(setPhoto).catch(function (err) { toast(err.message); }); }

  // SAVE
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var err = !form.name.value.trim() ? "Please give the piece a name." : !(+form.price.value > 0) ? "Please add a price." : "";
    if (err) { $("form-error").textContent = err; $("form-error").hidden = false; return; }
    var p = editing ? JSON.parse(JSON.stringify(editing)) : {};
    p.name = form.name.value.trim(); p.price = +form.price.value; p.dept = form.dept.value; p.sizes = form.sizes.value;
    p.desc = form.desc.value.trim(); p.hidden = !form.visible.checked; p.img = photo;
    try {
      D.products.save(p).then(function (saved) {
        dept = saved.dept; closeEditor(); drawDepts(); drawList(); toast(editing ? "Saved" : "Piece added");
      });
    } catch (ex) { $("form-error").textContent = ex.message; $("form-error").hidden = false; }
  });

  // DELETE: tap once to arm, tap again to delete (owner and Majuta only)
  $("delete-piece").addEventListener("click", function () {
    var b = this;
    if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Tap again to delete"; return; }
    D.products.remove(editing.id).then(function () { closeEditor(); drawDepts(); drawList(); toast("Piece deleted"); });
  });

  /* =====================================================
     HOMEPAGE: the carousel slides
     ===================================================== */
  function slideThumb(sl) { var m = sl.media || {}; return m.type === "video" ? m.poster : m.src; }
  function drawSlides() {
    D.slides.list({ includeHidden: true }).then(function (list) {
      var box = $("slides"); box.textContent = "";
      if (!list.length) { box.innerHTML = '<p class="empty">No slides yet. Tap "+ Add slide".</p>'; return; }
      list.forEach(function (sl, i) {
        var row = document.createElement("div"); row.className = "row" + (sl.hidden ? " is-hidden" : ""); row.style.setProperty("--r", i);
        row.innerHTML =
          '<div class="row-move"><button type="button" aria-label="Move up">↑</button><button type="button" aria-label="Move down">↓</button></div>' +
          '<div class="row-img"><img alt=""></div>' +
          '<div class="row-name"><span class="nm"></span><small></small></div>' +
          '<div class="row-price"></div><div class="row-sizes"></div>' +
          '<div class="row-actions"><button type="button" class="link" data-act="hide"></button><button type="button" class="link" data-act="edit">Edit</button></div>';
        var th = slideThumb(sl); if (th) row.querySelector("img").src = th; else row.querySelector("img").remove();
        row.querySelector(".nm").textContent = sl.title;
        if (sl.media && sl.media.type === "video") { var t = document.createElement("span"); t.className = "row-tag"; t.textContent = "Moving picture"; row.querySelector(".row-name").appendChild(t); }
        if (sl.page) { var pg = document.createElement("span"); pg.className = "row-tag"; pg.textContent = "Opens the Story page"; row.querySelector(".row-name").appendChild(pg); }
        if (i === 0) { var f = document.createElement("span"); f.className = "row-tag"; f.textContent = "Opening photo"; row.querySelector(".row-name").appendChild(f); }
        if (sl.hidden) { var b = document.createElement("span"); b.className = "badge"; b.textContent = "Hidden"; row.querySelector(".row-name").appendChild(b); }
        row.querySelector("small").textContent = (sl.headline || "") + ((sl.article || []).length ? " · " + sl.article.length + (sl.article.length === 1 ? " paragraph" : " paragraphs") : "");
        row.querySelector('[data-act="hide"]').textContent = sl.hidden ? "Show" : "Hide";
        var mv = row.querySelectorAll(".row-move button");
        mv[0].disabled = i === 0; mv[1].disabled = i === list.length - 1;
        [[0, -1], [1, 1]].forEach(function (x) {
          mv[x[0]].addEventListener("click", function () {
            var ids = list.map(function (y) { return y.id; }); var j = i + x[1]; var t2 = ids[i]; ids[i] = ids[j]; ids[j] = t2;
            D.slides.reorder(ids).then(function () { drawSlides(); toast("Order updated"); });
          });
        });
        row.querySelector('[data-act="hide"]').addEventListener("click", function () {
          sl.hidden = !sl.hidden; D.slides.save(sl).then(function () { drawSlides(); toast(sl.hidden ? "Hidden from the homepage" : "Showing on the homepage"); });
        });
        row.querySelector('[data-act="edit"]').addEventListener("click", function () { openSlide(sl); });
        box.appendChild(row);
      });
    });
  }

  // THE SLIDE EDITOR
  var sform = $("slide-form"), slideEditing = null, slideMedia = null;
  function setSlideMedia(m) {
    slideMedia = m;
    var th = m ? slideThumb({ media: m }) : "";
    $("slide-img").hidden = !th; $("slide-empty").hidden = !!th; if (th) $("slide-img").src = th;
    $("slide-photo-hint").textContent = m && m.type === "video"
      ? "This slide is a moving picture. Choosing a photo replaces it with a still photo."
      : "Tall photos work best (2 wide by 3 high).";
  }
  function splitCap(v) { var p = String(v || "").split("|"); return [p[0] || "", p.slice(1).join("|") || ""]; }
  function openSlide(sl) {
    slideEditing = sl || null;
    $("slide-title").textContent = sl ? "edit slide" : "new slide";
    sform.title.value = sl ? sl.title : ""; sform.headline.value = sl ? sl.headline : "";
    var c1 = splitCap(sl && sl.meta1), c2 = splitCap(sl && sl.meta2);
    sform.m1h.value = c1[0]; sform.m1t.value = c1[1]; sform.m2h.value = c2[0]; sform.m2t.value = c2[1];
    sform.article.value = sl ? (sl.article || []).join("\n\n") : "";
    sform.alt.value = sl && sl.media ? (sl.media.alt || "") : "";
    sform.visible.checked = sl ? !sl.hidden : true;
    setSlideMedia(sl ? sl.media : null);
    $("slide-error").hidden = true;
    var del = $("delete-slide"); del.hidden = !sl || !D.auth.can("records.delete", me); del.textContent = "Delete slide"; del.dataset.armed = "";
    $("slide-editor").setAttribute("aria-hidden", "false"); html.classList.add("editing-slide");
    setTimeout(function () { sform.title.focus(); }, 400);
  }
  function closeSlide() { html.classList.remove("editing-slide"); $("slide-editor").setAttribute("aria-hidden", "true"); }
  $("add-slide").addEventListener("click", function () { openSlide(null); });
  Array.prototype.forEach.call(document.querySelectorAll("#slide-editor [data-close]"), function (c) { c.addEventListener("click", closeSlide); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && html.classList.contains("editing-slide")) closeSlide(); });
  function useSlidePhoto(file) { if (!file) return; D.savePhoto(file).then(function (src) { setSlideMedia({ type: "image", src: src, alt: sform.alt.value }); }).catch(function (err) { toast(err.message); }); }
  $("slide-input").addEventListener("change", function () { useSlidePhoto(this.files[0]); this.value = ""; });
  var sdrop = $("slide-drop");
  ["dragenter", "dragover"].forEach(function (ev) { sdrop.addEventListener(ev, function (e) { e.preventDefault(); sdrop.classList.add("is-over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { sdrop.addEventListener(ev, function (e) { e.preventDefault(); sdrop.classList.remove("is-over"); }); });
  sdrop.addEventListener("drop", function (e) { useSlidePhoto(e.dataTransfer.files[0]); });

  sform.addEventListener("submit", function (e) {
    e.preventDefault();
    var err = !sform.title.value.trim() ? "Please give the slide a title." : !slideMedia ? "Please add a photo." : "";
    if (err) { $("slide-error").textContent = err; $("slide-error").hidden = false; return; }
    var sl = slideEditing ? JSON.parse(JSON.stringify(slideEditing)) : { href: "#" };
    sl.title = sform.title.value.trim();
    sl.headline = sform.headline.value.trim() || sl.title.toLowerCase();
    var cap = function (h, t) { h = h.trim(); t = t.trim(); return h || t ? h + "|" + t : ""; };
    sl.meta1 = cap(sform.m1h.value, sform.m1t.value); sl.meta2 = cap(sform.m2h.value, sform.m2t.value);
    sl.article = sform.article.value.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
    sl.media = JSON.parse(JSON.stringify(slideMedia)); sl.media.alt = sform.alt.value.trim();
    sl.hidden = !sform.visible.checked;
    try { D.slides.save(sl).then(function () { closeSlide(); drawSlides(); toast(slideEditing ? "Saved" : "Slide added"); }); }
    catch (ex) { $("slide-error").textContent = ex.message; $("slide-error").hidden = false; }
  });
  $("delete-slide").addEventListener("click", function () {
    var b = this;
    if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Tap again to delete"; return; }
    D.slides.remove(slideEditing.id).then(function () { closeSlide(); drawSlides(); toast("Slide deleted"); });
  });

  /* =====================================================
     THE PAGE EDITORS
     Each editor is a plan (a list of fields) that the form below is built from. Field types:
       text, long (several lines), photo (one photo), media (a video that can be swapped for a photo),
       list (repeating items: reorder, add and remove), group (a box of fields), head (a section title).
     ===================================================== */
  var MEDIA = [{ k: "media", type: "media" }];
  var EDITORS = {
    story: { fields: [
      { type: "head", label: "the opening" },
      { k: "title", label: "Title" },
      { k: "edgeLeft", label: "Small words, bottom left" },
      { k: "edgeRight", label: "Small words, bottom right" },
      { type: "head", label: "who we are", sub: "The paragraph that darkens word by word as you scroll." },
      { k: "wordsKicker", label: "Small heading" },
      { k: "words", label: "Story", type: "long", rows: 6 },
      { type: "head", label: "the craft", sub: "Three panels that rise over a moving background." },
      { k: "craftKicker", label: "Small heading" },
      { k: "craftBg", label: "Background", type: "media", wide: true },
      { k: "craft", label: "Panels", type: "list", fixed: true, item: "panel", fields: [{ k: "title", label: "Word" }, { k: "text", label: "Line", type: "long", rows: 2 }].concat(MEDIA) },
      { type: "head", label: "in numbers", sub: "The cards that stack as you scroll." },
      { k: "cardsKicker", label: "Small heading" },
      { k: "cards", label: "Cards", type: "list", item: "card", blank: { big: "", text: "" }, fields: [{ k: "big", label: "Big number or word" }, { k: "text", label: "Line", type: "long", rows: 2 }] },
      { type: "head", label: "the quote", sub: "The photo that opens to fill the screen, with a quote over it." },
      { k: "quote", type: "group", label: "Quote and photo", fields: [{ k: "photo", label: "Photo", type: "photo" }, { k: "text", label: "Quote", type: "long", rows: 3 }, { k: "cite", label: "Who said it" }] },
      { type: "head", label: "the fabrics" },
      { k: "fabricsKicker", label: "Small heading" },
      { k: "fabricsHeading", label: "Heading" },
      { k: "fabricsText", label: "Text", type: "long", rows: 3 },
      { k: "fabrics", label: "The two pictures", type: "list", fixed: true, item: "picture", fields: [{ k: "", type: "media" }] },
      { type: "head", label: "how it works", sub: "The row of steps you can drag sideways." },
      { k: "stepsKicker", label: "Small heading" },
      { k: "steps", label: "Steps", type: "list", item: "step", blank: { title: "", text: "", media: { video: "", poster: "", photo: "" } }, fields: [{ k: "title", label: "Step" }, { k: "text", label: "Line", type: "long", rows: 2 }].concat(MEDIA) },
      { type: "head", label: "the ending" },
      { k: "endHeading", label: "Heading" },
      { k: "endButton", label: "Button" }
    ] },
    shoppage: { key: "shop", fields: [
      { type: "head", label: "the opening photo" },
      { k: "heroPhoto", label: "Photo", type: "photo", wide: true, big: true, empty: "The built-in photo (the heritage corset in the garden)" },
      { k: "heroMain", label: "Caption" },
      { k: "heroSub", label: "Small line under it" },
      { type: "head", label: "the line above the pieces", sub: "One calm line at the top of each department." },
      { k: "lineWomen", label: "Women" },
      { k: "lineMen", label: "Men" },
      { k: "lineMisc", label: "Miscellaneous" }
    ] },
    policies: { fields: [
      { type: "head", label: "FAQs" },
      { k: "faqs", label: "Questions", type: "list", item: "question", blank: { q: "", a: "" }, fields: [{ k: "q", label: "Question" }, { k: "a", label: "Answer", type: "long", rows: 3 }] },
      { type: "head", label: "returns policy" },
      { k: "returns", type: "group", fields: [{ k: "updated", label: "Last updated" }, { k: "sections", label: "Sections", type: "list", item: "section", blank: { h: "", p: "" }, fields: [{ k: "h", label: "Heading" }, { k: "p", label: "Text", type: "long", rows: 4 }] }] },
      { type: "head", label: "privacy policy" },
      { k: "privacy", type: "group", fields: [{ k: "updated", label: "Last updated" }, { k: "sections", label: "Sections", type: "list", item: "section", blank: { h: "", p: "" }, fields: [{ k: "h", label: "Heading" }, { k: "p", label: "Text", type: "long", rows: 4 }] }] },
      { type: "head", label: "terms & conditions" },
      { k: "terms", type: "group", fields: [{ k: "updated", label: "Last updated" }, { k: "sections", label: "Sections", type: "list", item: "section", blank: { h: "", p: "" }, fields: [{ k: "h", label: "Heading" }, { k: "p", label: "Text", type: "long", rows: 4 }] }] }
    ] },
    settings: { fields: [
      { type: "head", label: "contact details" },
      { k: "whatsapp", label: "WhatsApp number", input: "tel", hint: "Country code first, then the number, digits only. For example 27821234567." },
      { k: "email", label: "Email", input: "email" },
      { type: "head", label: "social links" },
      { k: "instagram", label: "Instagram link", input: "url", hint: "The full link, e.g. https://www.instagram.com/corsetsbyms" },
      { k: "tiktok", label: "TikTok link", input: "url", hint: "The full link, e.g. https://www.tiktok.com/@corsetsbyms" }
    ] }
  };
  var drafts = {}, savedCopies = {};
  function dataKey(name) { return EDITORS[name].key || name; }

  function markDirty(name, dirty) {
    var st = document.querySelector('[data-state="' + name + '"]');
    st.textContent = dirty ? "Unsaved changes" : "All saved"; st.classList.toggle("is-dirty", dirty);
  }
  function openEditor(name) {
    D.content.get(dataKey(name)).then(function (data) {
      drafts[name] = data; savedCopies[name] = JSON.stringify(data);
      var box = $("cf-" + name); box.textContent = "";
      build(box, EDITORS[name].fields, data, function () { markDirty(name, JSON.stringify(drafts[name]) !== savedCopies[name]); }, name);
      markDirty(name, false);
    });
  }

  // BUILDS A FORM from a plan, writing every change straight into the draft (obj)
  function build(box, fields, obj, changed, name) {
    fields.forEach(function (f) {
      if (f.type === "head") {
        var h = document.createElement("h3"); h.className = "cf-head"; h.textContent = f.label; box.appendChild(h);
        if (f.sub) { var sb = document.createElement("p"); sb.className = "cf-sub"; sb.textContent = f.sub; box.appendChild(sb); }
        return;
      }
      if (f.type === "group") {
        var g = document.createElement("div"); g.className = "cf-group";
        if (f.label) { var gl = document.createElement("p"); gl.className = "cf-label"; gl.textContent = f.label; g.appendChild(gl); }
        build(g, f.fields, obj[f.k], changed, name); box.appendChild(g); return;
      }
      if (f.type === "list") { box.appendChild(buildList(f, obj, changed, name)); return; }
      if (f.type === "media") { box.appendChild(buildMedia(f, f.k ? obj[f.k] : obj, changed)); return; }
      if (f.type === "photo") { box.appendChild(buildPhoto(f, obj, changed)); return; }
      // text and long text
      var l = document.createElement("label"); l.className = "field";
      var sp = document.createElement("span"); sp.textContent = f.label; l.appendChild(sp);
      var inp = document.createElement(f.type === "long" ? "textarea" : "input");
      if (f.type === "long") inp.rows = f.rows || 3; else inp.type = f.input || "text";
      inp.value = obj[f.k] == null ? "" : obj[f.k];
      inp.addEventListener("input", function () { obj[f.k] = inp.value; changed(); });
      l.appendChild(inp);
      if (f.hint) { var hn = document.createElement("small"); hn.className = "hint"; hn.style.display = "block"; hn.style.margin = "6px 0 0"; hn.textContent = f.hint; l.appendChild(hn); }
      box.appendChild(l);
    });
  }
  // a repeating list (FAQs, steps, cards...): reorder with the arrows, add and remove (unless it is a fixed set)
  function buildList(f, obj, changed, name) {
    var wrap = document.createElement("div"); wrap.className = "cf-list";
    function draw() {
      wrap.textContent = "";
      if (f.label) { var lb = document.createElement("p"); lb.className = "cf-label"; lb.textContent = f.label; wrap.appendChild(lb); }
      var arr = obj[f.k];
      arr.forEach(function (it, i) {
        var card = document.createElement("div"); card.className = "cf-item";
        var bar = document.createElement("div"); bar.className = "cf-item-bar";
        bar.innerHTML = '<span class="cf-n"></span><button type="button" aria-label="Move up">↑</button><button type="button" aria-label="Move down">↓</button>';
        bar.querySelector(".cf-n").textContent = f.item + " " + (i + 1);
        var b = bar.querySelectorAll("button");
        b[0].disabled = i === 0; b[1].disabled = i === arr.length - 1;
        [[0, -1], [1, 1]].forEach(function (x) { b[x[0]].addEventListener("click", function () { var j = i + x[1]; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; changed(); draw(); }); });
        if (!f.fixed) {
          var rm = document.createElement("button"); rm.type = "button"; rm.className = "link danger"; rm.textContent = "Remove";
          rm.addEventListener("click", function () {
            if (!rm.dataset.armed) { rm.dataset.armed = "1"; rm.textContent = "Tap again to remove"; return; }
            arr.splice(i, 1); changed(); draw();
          });
          bar.appendChild(rm);
        }
        card.appendChild(bar);
        build(card, f.fields, it, changed, name);
        wrap.appendChild(card);
      });
      if (!f.fixed) {
        var add = document.createElement("button"); add.type = "button"; add.className = "pill ghost cf-add"; add.textContent = "+ Add " + f.item;
        add.addEventListener("click", function () { arr.push(JSON.parse(JSON.stringify(f.blank || {}))); changed(); draw(); });
        wrap.appendChild(add);
      }
    }
    draw();
    return wrap;
  }
  // a video that can be swapped for a photo (videos can be uploaded once Supabase is connected)
  function buildMedia(f, m, changed) {
    var row = document.createElement("div"); row.className = "cf-media" + (f.wide ? " wide" : "");
    function draw() {
      row.innerHTML = '<div class="cf-thumb"><img alt=""></div><div><p class="cf-what"></p><div class="cf-btns"></div></div>';
      var src = m.photo || m.poster; if (src) row.querySelector("img").src = src; else row.querySelector("img").remove();
      row.querySelector(".cf-what").innerHTML = (f.label ? "<b>" + f.label + "</b><br>" : "") + (m.photo ? "A photo" : m.video ? "A moving picture" : "Nothing yet") +
        '<small>' + (m.photo ? "Uploaded here." : m.video ? m.video.split("/").pop() : "") + "</small>";
      var btns = row.querySelector(".cf-btns");
      var up = document.createElement("label"); up.className = "link"; up.innerHTML = (m.photo ? "Choose another photo" : "Use a photo instead") + '<input type="file" accept="image/*" hidden>';
      up.querySelector("input").addEventListener("change", function () {
        D.savePhoto(this.files[0]).then(function (src) { m.photo = src; changed(); draw(); }).catch(function (err) { toast(err.message); });
      });
      btns.appendChild(up);
      if (m.photo && m.video) {
        var back = document.createElement("button"); back.type = "button"; back.className = "link"; back.textContent = "Back to the moving picture";
        back.addEventListener("click", function () { m.photo = ""; changed(); draw(); });
        btns.appendChild(back);
      }
    }
    draw();
    return row;
  }
  // one photo (the quote photo, the Shop's opening photo)
  function buildPhoto(f, obj, changed) {
    var row = document.createElement("div"); row.className = "cf-media" + (f.wide ? " wide" : "");
    function draw() {
      var v = obj[f.k];
      row.innerHTML = '<div class="cf-thumb"><img alt=""></div><div><p class="cf-what"></p><div class="cf-btns"></div></div>';
      if (v) row.querySelector("img").src = v; else row.querySelector("img").remove();
      row.querySelector(".cf-what").innerHTML = "<b>" + f.label + "</b><small>" + (v ? (v.indexOf("data:") === 0 ? "Uploaded here." : v.split("/").pop()) : (f.empty || "")) + "</small>";
      var btns = row.querySelector(".cf-btns");
      var up = document.createElement("label"); up.className = "link"; up.innerHTML = "Choose a photo" + '<input type="file" accept="image/*" hidden>';
      up.querySelector("input").addEventListener("change", function () {
        var p = f.big ? D.savePhoto(this.files[0], 2000, 1400) : D.savePhoto(this.files[0]);
        p.then(function (src) { obj[f.k] = src; changed(); draw(); }).catch(function (err) { toast(err.message); });
      });
      btns.appendChild(up);
      if (v && f.empty) {
        var clr = document.createElement("button"); clr.type = "button"; clr.className = "link"; clr.textContent = "Use the built-in photo";
        clr.addEventListener("click", function () { obj[f.k] = ""; changed(); draw(); });
        btns.appendChild(clr);
      }
    }
    draw();
    return row;
  }

  // the date in words, for "Last updated" (e.g. 19 November 2026)
  function today() { return new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }); }

  // SAVE
  Array.prototype.forEach.call(document.querySelectorAll("[data-save]"), function (btn) {
    btn.addEventListener("click", function () {
      var name = btn.getAttribute("data-save"), d = drafts[name]; if (!d) return;
      if (name === "policies") {                  // a policy whose text changed gets today's date (unless the date was changed by hand)
        var before = JSON.parse(savedCopies[name]);
        ["returns", "privacy", "terms"].forEach(function (id) {
          if (JSON.stringify(d[id].sections) !== JSON.stringify(before[id].sections) && d[id].updated === before[id].updated) d[id].updated = today();
        });
      }
      if (name === "settings") d.whatsapp = String(d.whatsapp || "").replace(/\D/g, "");   // digits only
      try {
        D.content.save(dataKey(name), d).then(function () { toast("Saved. The site shows it straight away."); openEditor(name); });
      } catch (ex) { toast(ex.message); }
    });
  });
  // PUT BACK THE ORIGINAL (loads the starting version into the form; nothing changes until Save)
  Array.prototype.forEach.call(document.querySelectorAll("[data-original]"), function (btn) {
    btn.addEventListener("click", function () {
      var name = btn.getAttribute("data-original");
      if (!btn.dataset.armed) { btn.dataset.armed = "1"; btn.textContent = "Tap again: load the original"; setTimeout(function () { btn.dataset.armed = ""; btn.textContent = "Put back the original"; }, 4000); return; }
      btn.dataset.armed = ""; btn.textContent = "Put back the original";
      drafts[name] = D.content.original(dataKey(name));
      var box = $("cf-" + name); box.textContent = "";
      build(box, EDITORS[name].fields, drafts[name], function () { markDirty(name, true); }, name);
      markDirty(name, true); toast("The original is loaded. Save to keep it.");
    });
  });
  // leaving with unsaved changes asks first
  window.addEventListener("beforeunload", function (e) {
    var dirty = Object.keys(drafts).some(function (n) { return JSON.stringify(drafts[n]) !== savedCopies[n]; });
    if (dirty) { e.preventDefault(); e.returnValue = ""; }
  });

  /* =====================================================
     ORDERS AND APPOINTMENTS (the inboxes)
     Each row shows who, what, how much and the status; tap it to open the details,
     change the status, or contact the customer on WhatsApp, phone or email.
     ===================================================== */
  var orderFilter = "all", apptFilter = "all";
  var openRows = {};                                           // which rows are open (kept open after a redraw)

  function when(iso) {                                         // "18 Nov, 14:32"
    var d = new Date(iso);
    return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  }
  function waLink(phone, text) {                               // a WhatsApp link to the customer (South African numbers get +27)
    var n = String(phone || "").replace(/\D/g, ""); if (!n) return "";
    if (n.charAt(0) === "0") n = "27" + n.slice(1);
    return "https://wa.me/" + n + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function filters(box, statuses, list, current, pick) {     // the status buttons, each with how many
    box.textContent = "";
    [["all", "All"]].concat(Object.keys(statuses).map(function (k) { return [k, statuses[k]]; })).forEach(function (s) {
      var n = s[0] === "all" ? list.length : list.filter(function (x) { return x.status === s[0]; }).length;
      var b = document.createElement("button"); b.type = "button"; b.className = s[0] === current ? "is-on" : "";
      b.innerHTML = '<span></span><span class="n"></span>'; b.firstChild.textContent = s[1]; b.lastChild.textContent = n;
      b.addEventListener("click", function () { pick(s[0]); });
      box.appendChild(b);
    });
  }
  function statusPill(statuses, s) { var sp = document.createElement("span"); sp.className = "status s-" + s; sp.textContent = statuses[s] || s; return sp; }
  // one inbox row: the summary line and the details underneath
  function inboxRow(id, i, sumHTML, fill, detail) {
    var row = document.createElement("div"); row.className = "inbox-row" + (openRows[id] ? " is-open" : ""); row.style.setProperty("--r", i);
    var sum = document.createElement("button"); sum.type = "button"; sum.className = "inbox-sum"; sum.innerHTML = sumHTML; fill(sum);
    sum.setAttribute("aria-expanded", String(!!openRows[id]));
    sum.addEventListener("click", function () { openRows[id] = !openRows[id]; row.classList.toggle("is-open", openRows[id]); sum.setAttribute("aria-expanded", String(openRows[id])); });
    var d = document.createElement("div"); d.className = "inbox-detail"; var inner = document.createElement("div"); inner.appendChild(detail); d.appendChild(inner);
    row.appendChild(sum); row.appendChild(d); return row;
  }
  // the status choice (and Delete for the owner and Majuta) on the right of the details
  function sidePanel(statuses, rec, setStatus, remove, extra) {
    var side = document.createElement("div"); side.className = "side";
    side.innerHTML = '<h4>Status</h4><label class="field"><select></select></label>';
    var sel = side.querySelector("select");
    Object.keys(statuses).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = statuses[k]; sel.appendChild(o); });
    sel.value = rec.status;
    sel.addEventListener("change", function () { setStatus(rec.id, sel.value).then(function () { drawInboxes(); toast("Status: " + statuses[sel.value]); }); });
    if (extra) side.appendChild(extra);
    if (D.auth.can("records.delete", me)) {
      var del = document.createElement("button"); del.type = "button"; del.className = "link danger"; del.textContent = "Delete";
      del.addEventListener("click", function () {
        if (!del.dataset.armed) { del.dataset.armed = "1"; del.textContent = "Tap again to delete"; return; }
        remove(rec.id).then(function () { delete openRows[rec.id]; drawInboxes(); toast("Deleted"); });
      });
      side.appendChild(del);
    }
    return side;
  }
  function contactLinks(name, phone, email, waText) {
    var c = document.createElement("div"); c.className = "contact";
    if (phone) {
      var w = document.createElement("a"); w.className = "pill ghost"; w.textContent = "WhatsApp"; w.href = waLink(phone, waText); w.target = "_blank"; w.rel = "noopener"; c.appendChild(w);
      var t = document.createElement("a"); t.className = "pill ghost"; t.textContent = "Call"; t.href = "tel:" + phone.replace(/\s/g, ""); c.appendChild(t);
    }
    if (email) { var m = document.createElement("a"); m.className = "pill ghost"; m.textContent = "Email"; m.href = "mailto:" + email; c.appendChild(m); }
    return c;
  }

  function drawOrders(list) {
    filters($("order-filters"), D.orderStatus, list, orderFilter, function (f) { orderFilter = f; drawInboxes(); });
    var box = $("orders"); box.textContent = "";
    var shown = list.filter(function (o) { return orderFilter === "all" || o.status === orderFilter; });
    if (!shown.length) { box.innerHTML = '<p class="empty">No orders here yet. Orders placed from the bag will appear here.</p>'; return; }
    shown.forEach(function (o, i) {
      var pieces = o.items.reduce(function (n, it) { return n + it.qty; }, 0);
      var detail = document.createElement("div"); detail.className = "inbox-body";
      var ul = document.createElement("ul"); ul.className = "items";
      o.items.forEach(function (it) {
        var li = document.createElement("li");
        li.innerHTML = '<span class="ov"><img alt=""></span><span><span class="n"></span><small></small></span><span class="p"></span>';
        if (it.img) li.querySelector("img").src = it.img; else li.querySelector("img").remove();
        li.querySelector(".n").textContent = it.name;
        li.querySelector("small").textContent = (it.size ? (it.size === "One size" ? "One size" : "Size " + it.size) + " · " : "") + "× " + it.qty + " · " + (D.depts[it.dept] || "");
        li.querySelector(".p").textContent = D.formatPrice(it.price * it.qty);
        ul.appendChild(li);
      });
      detail.appendChild(ul);
      var extra = document.createElement("div");
      var tot = document.createElement("p"); tot.className = "total"; tot.textContent = "Total " + D.formatPrice(o.total);
      extra.appendChild(tot);
      extra.appendChild(contactLinks(o.customer.name, o.customer.phone, "", "Hi " + o.customer.name + ", thank you for your Corsets by MS order #" + o.number + "."));
      detail.appendChild(sidePanel(D.orderStatus, o, D.orders.setStatus, D.orders.remove, extra));
      box.appendChild(inboxRow(o.id, i,
        '<span class="no"></span><span class="who"><span class="nm"></span><small></small></span><span class="what"></span><span class="amt"></span><span class="st"></span><span class="plus">+</span>',
        function (s) {
          s.querySelector(".no").textContent = "#" + o.number;
          s.querySelector(".nm").textContent = o.customer.name;
          s.querySelector("small").textContent = when(o.createdAt) + " · " + o.customer.phone;
          s.querySelector(".what").textContent = pieces + (pieces === 1 ? " piece: " : " pieces: ") + o.items.map(function (it) { return it.name; }).join(", ");
          s.querySelector(".amt").textContent = D.formatPrice(o.total);
          s.querySelector(".st").appendChild(statusPill(D.orderStatus, o.status));
        }, detail));
    });
  }

  function drawAppts(list) {
    filters($("appt-filters"), D.apptStatus, list, apptFilter, function (f) { apptFilter = f; drawInboxes(); });
    var box = $("appts"); box.textContent = "";
    var shown = list.filter(function (a) { return apptFilter === "all" || a.status === apptFilter; });
    if (!shown.length) { box.innerHTML = '<p class="empty">No bookings here yet. Requests from "Book appointment" will appear here.</p>'; return; }
    shown.forEach(function (a, i) {
      var get = function (q) { var x = a.answers.filter(function (y) { return y.q.toLowerCase() === q; })[0]; return x ? x.a : ""; };
      var detail = document.createElement("div"); detail.className = "inbox-body";
      var dl = document.createElement("dl"); dl.className = "answers";
      a.answers.forEach(function (x) {
        if (!x.a) return;
        var dt = document.createElement("dt"); dt.textContent = x.q; var dd = document.createElement("dd");
        // dates (2027-01-16) are shown as "Saturday, 16 January 2027"
        dd.textContent = /^\d{4}-\d{2}-\d{2}$/.test(x.a) ? new Date(x.a + "T12:00").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : x.a;
        dl.appendChild(dt); dl.appendChild(dd);
      });
      detail.appendChild(dl);
      detail.appendChild(sidePanel(D.apptStatus, a, D.appointments.setStatus, D.appointments.remove,
        contactLinks(a.name, a.phone, a.email, "Hi " + a.name + ", thank you for your Corsets by MS appointment request.")));
      var dateWanted = get("preferred date");
      box.appendChild(inboxRow(a.id, i,
        '<span class="no"></span><span class="who"><span class="nm"></span><small></small></span><span class="what"></span><span class="amt"></span><span class="st"></span><span class="plus">+</span>',
        function (s) {
          s.querySelector(".no").textContent = when(a.createdAt).split(",")[0];
          s.querySelector(".nm").textContent = a.name || "(no name)";
          s.querySelector("small").textContent = a.phone || a.email || "";
          s.querySelector(".what").textContent = get("i’d like") || get("appointment") || "Appointment request";
          s.querySelector(".amt").textContent = dateWanted ? new Date(dateWanted).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "";
          s.querySelector(".st").appendChild(statusPill(D.apptStatus, a.status));
        }, detail));
    });
  }

  // redraws both inboxes and the "new" counts on the tabs
  function drawInboxes() {
    Promise.all([D.orders.list(), D.appointments.list()]).then(function (r) {
      drawOrders(r[0]); drawAppts(r[1]);
      var no = r[0].filter(function (o) { return o.status === "new"; }).length;
      var na = r[1].filter(function (a) { return a.status === "new"; }).length;
      $("n-orders").textContent = no || ""; $("n-appts").textContent = na || "";
      moveLine();
    });
  }
  // new orders or bookings placed in another tab of this browser show up straight away
  window.addEventListener("storage", function (e) { if (me && e.key === "corsets-db-v1") { D.reload && D.reload(); drawInboxes(); drawDepts(); drawList(); } });

  /* =====================================================
     TEAM AND BACKUP (owner and Majuta)
     ===================================================== */
  function drawTeam() {
    var box = $("team"); box.textContent = "";
    D.auth.devUsers().forEach(function (u) {
      var r = document.createElement("div"); r.className = "team-row";
      r.innerHTML = '<span></span><span class="role"></span><span></span>';
      r.children[0].textContent = u.email; r.children[1].textContent = ROLE[u.role];
      r.children[2].textContent = u.email === me.email ? "You" : "";
      box.appendChild(r);
    });
  }
  $("dl-backup").addEventListener("click", function () {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([D.backup.exportJSON()], { type: "application/json" }));
    a.download = "corsets-by-ms-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click(); toast("Backup downloaded");
  });
  $("up-backup").addEventListener("change", function () {
    var file = this.files[0]; if (!file) return;
    file.text().then(function (t) { D.backup.importJSON(t); D.reload(); drawDepts(); drawList(); drawSlides(); drawInboxes(); toast("Backup loaded"); })
      .catch(function (err) { toast(err.message); });
    this.value = "";
  });
  $("reset").addEventListener("click", function () {
    var b = this;
    if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Tap again to reset everything"; return; }
    D.backup.reset(); b.dataset.armed = ""; b.textContent = "Reset to starting pieces"; drawDepts(); drawList(); drawSlides(); toast("Back to the starting pieces and slides");
  });

  // already signed in (this browser tab)? go straight in
  var already = D.auth.current();
  if (already) start(already);
})();
