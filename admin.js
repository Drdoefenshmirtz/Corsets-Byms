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
  if (D.mode === "browser") {
    D.auth.devUsers().forEach(function (u) {
      var li = document.createElement("li");
      li.textContent = u.email + "  ·  " + u.role;
      li.addEventListener("click", function () { $("login-form").email.value = u.email; $("login-form").password.value = u.password; });
      $("dev-users").appendChild(li);
    });
  } else { $("dev-box").hidden = true; $("mode-pill").hidden = true; }

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
    drawDepts(); drawList(); drawTeam();
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
    file.text().then(function (t) { D.backup.importJSON(t); drawDepts(); drawList(); toast("Backup loaded"); })
      .catch(function (err) { toast(err.message); });
    this.value = "";
  });
  $("reset").addEventListener("click", function () {
    var b = this;
    if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Tap again to reset everything"; return; }
    D.backup.reset(); b.dataset.armed = ""; b.textContent = "Reset to starting pieces"; drawDepts(); drawList(); toast("Back to the starting pieces");
  });

  // already signed in (this browser tab)? go straight in
  var already = D.auth.current();
  if (already) start(already);
})();
