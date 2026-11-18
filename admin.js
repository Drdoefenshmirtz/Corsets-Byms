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
    Array.prototype.forEach.call(document.querySelectorAll("[data-need=team]"), function (b) { b.hidden = !D.auth.can("team", me); });
    requestAnimationFrame(moveLine);
    drawDepts(); drawList(); drawTeam(); drawInboxes(); drawSlides();
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
