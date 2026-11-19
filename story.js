/* =====================================================
   THE STORY PAGE: all the movement on story.html
   One loop (tick) runs every frame. It reads how far you have scrolled through each section
   (0 = just arrived, 1 = about to leave) and moves that section's pieces to match.
   The two 3D scenes (SILK and LACE) only draw while they are on screen.
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
  function easeBack(t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }   // a small overshoot (the bow)
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

  /* =====================================================
     THE TEXT THAT FILLS IN: every word gets its own span
     ===================================================== */
  var fill = $("fill");
  fill.innerHTML = fill.textContent.trim().split(/\s+/).map(function (w) { return '<span class="wd">' + w + "</span>"; }).join(" ");
  var words = Array.prototype.slice.call(fill.querySelectorAll(".wd"));

  /* =====================================================
     THE STITCH: a dashed thread with a needle at its tip, down the left of the page
     ===================================================== */
  var SVGNS = "http://www.w3.org/2000/svg";
  var stitch = $("stitch"), stitchStart = 0, stitchEnd = 0, stitchX = function () { return 0; };
  var thread, clipRect, needle;
  function buildStitch() {
    var docH = document.documentElement.scrollHeight;
    var startEl = document.querySelector(".st-words"), endEl = $("lace");
    stitchStart = startEl.offsetTop + 40;
    stitchEnd = endEl.offsetTop;
    var base = PHONE ? 12 : 34, amp = PHONE ? 4 : 9;
    stitchX = function (y) { return base + amp * Math.sin(y / 170); };          // a gentle wander from side to side
    var d = "M" + stitchX(stitchStart).toFixed(1) + " " + stitchStart;
    for (var y = stitchStart + 30; y <= stitchEnd; y += 30) d += " L" + stitchX(y).toFixed(1) + " " + y;
    stitch.setAttribute("height", docH); stitch.style.height = docH + "px";
    stitch.setAttribute("viewBox", "0 0 60 " + docH);
    stitch.innerHTML =
      '<defs><clipPath id="stitch-clip"><rect x="-20" y="0" width="100" height="0"/></clipPath>' +
      '<linearGradient id="needle-steel" x1="0" x2="1"><stop offset="0" stop-color="#8d8d93"/><stop offset=".45" stop-color="#f4f4f6"/><stop offset="1" stop-color="#77777d"/></linearGradient></defs>' +
      '<path d="' + d + '" fill="none" stroke="#7d1a26" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="9 8" clip-path="url(#stitch-clip)"/>' +
      // the needle: a thin steel shape with an eye, pointing down the thread
      '<g id="needle"><path d="M-2.2 -46 Q0 -50 2.2 -46 L1.3 6 L0 16 L-1.3 6 Z" fill="url(#needle-steel)" stroke="#6d6d72" stroke-width=".4"/>' +
      '<ellipse cx="0" cy="-40" rx=".8" ry="3" fill="#eee2e2"/></g>';
    thread = stitch.querySelector("path");
    clipRect = stitch.querySelector("#stitch-clip rect");
    needle = $("needle");
  }

  /* =====================================================
     THE CRIMSON SCARF (the opening)
     The photo of the red silk scarf (story/scarf.webp) laid on a finely divided 3D surface.
     Waves run through it so it floats and ripples like real fabric, the light moves across the folds,
     it leans towards the mouse and ripples where the mouse passes. As you scroll it billows up and
     flies away, revealing "the story of ms".
     ===================================================== */
  var silk = null;
  function makeSilk() {
    var canvas = $("silk");
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, premultipliedAlpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PHONE ? 1.5 : 2));
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    var ASPECT = 1600 / 1475;                                 // the scarf photo's width / height
    var uniforms = {
      uMap: { value: null }, uT: { value: 0 }, uAmp: { value: 0.22 }, uLift: { value: 0 },
      uMouse: { value: new THREE.Vector2(-9, -9) }, uEnergy: { value: 0 }, uOpacity: { value: 0 }
    };
    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: [
        "uniform float uT, uAmp, uLift, uEnergy; uniform vec2 uMouse;",
        "varying vec2 vUv; varying float vShade;",
        // the folds: three waves of different sizes and speeds running through the fabric
        "float folds(vec2 p) {",
        "  return sin(p.x * 5.0 + uT * 1.5) * 0.5",
        "       + sin(p.y * 4.2 - uT * 1.1 + p.x * 2.0) * 0.35",
        "       + sin((p.x + p.y) * 9.0 + uT * 2.3) * 0.12;",
        "}",
        "void main() {",
        "  vUv = uv;",
        // the loose ends move more than the twisted knot in the middle-right of the scarf
        "  float free = 0.3 + 1.1 * smoothstep(0.05, 0.55, distance(uv, vec2(0.66, 0.42)));",
        "  float a = uAmp * free;",
        "  float z = folds(uv) * a;",
        // the ripple where the mouse passes
        "  float d = distance(uv, uMouse);",
        "  z += uEnergy * 0.16 * exp(-d * d * 30.0) * cos(d * 38.0 - uT * 6.0);",
        // flying away: the lower part billows towards you as it lifts
        "  z += uLift * 1.6 * pow(1.0 - uv.y, 2.0);",
        // how steep the fold is here: used to move the light across the fabric
        "  float e = 0.01;",
        "  vShade = (folds(uv + vec2(e, 0.0)) - folds(uv)) / e * a * 0.11 + (folds(uv + vec2(0.0, e)) - folds(uv)) / e * a * 0.05;",
        "  vec3 pos = position; pos.z += z; pos.x += z * 0.12; pos.y += z * 0.06;",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform sampler2D uMap; uniform float uOpacity;",
        "varying vec2 vUv; varying float vShade;",
        "void main() {",
        "  vec4 c = texture2D(uMap, vUv);",
        "  c.rgb *= 1.0 + clamp(vShade, -0.35, 0.45);",          // brighter on the folds that face the light
        "  gl_FragColor = vec4(c.rgb, c.a * uOpacity);",
        "}"
      ].join("\n")
    });
    var geo = new THREE.PlaneGeometry(ASPECT, 1, PHONE ? 70 : 120, PHONE ? 64 : 110);
    var mesh = new THREE.Mesh(geo, mat); scene.add(mesh);

    // the photo: a smaller one on phones
    var loaded = false, born = 0;
    new THREE.TextureLoader().load(PHONE ? "story/scarf-small.webp" : "story/scarf.webp", function (tex) {
      tex.anisotropy = 4; tex.generateMipmaps = true;
      uniforms.uMap.value = tex; loaded = true; born = performance.now();
    });

    var fit = 1;
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      var visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), visW = visH * camera.aspect;
      fit = Math.min(visH * 0.7, visW * 0.86 / ASPECT);         // as big as fits, with a little room around it
    }
    resize();

    // the mouse: where it points on the scarf, and how fast it moves (bigger ripples when it moves fast)
    var mouse = { x: 0, y: 0, tx: 0, ty: 0, energy: 0 }, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    window.addEventListener("pointermove", function (e) {
      var nx = e.clientX / vw * 2 - 1, ny = -(e.clientY / vh * 2 - 1);
      var dx = nx - mouse.tx, dy = ny - mouse.ty;
      mouse.energy = Math.min(1, mouse.energy + Math.sqrt(dx * dx + dy * dy) * 1.6);
      mouse.tx = nx; mouse.ty = ny;
    }, { passive: true });

    function draw(t, p) {
      if (!loaded) { renderer.clear(); return; }
      mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
      mouse.energy *= 0.96;
      var lp0 = clamp(p / 0.75), lift = lp0 * lp0 * (3 - 2 * lp0);            // 0 = floating, 1 = flown away (eased in and out)
      var enter = ease(clamp((performance.now() - born) / 1400));              // floats in when the page opens
      uniforms.uT.value = t;
      uniforms.uAmp.value = 0.2 + lift * 0.35;                                  // the waves grow as it flies off
      uniforms.uLift.value = lift;
      uniforms.uEnergy.value = mouse.energy;
      uniforms.uOpacity.value = enter * (1 - clamp((lift - 0.75) / 0.25));
      // the drift: a slow bob and turn, leaning towards the mouse
      var s = fit * (0.9 + 0.1 * enter) * (1 + lift * 0.35);
      mesh.scale.set(s, s, s);
      mesh.position.set(Math.sin(t * 0.35) * 0.08 + lift * 1.2, Math.sin(t * 0.5) * 0.1 + lift * fit * 1.25 + (1 - enter) * -0.3, 0);
      mesh.rotation.set(-mouse.y * (PHONE ? 0 : 0.16) - lift * 0.7, mouse.x * (PHONE ? 0 : 0.22) + Math.sin(t * 0.3) * 0.05, Math.sin(t * 0.25) * 0.03 - lift * 0.45);
      // where the mouse points on the scarf (for the ripple)
      ndc.set(mouse.tx, mouse.ty); ray.setFromCamera(ndc, camera);
      var hit = ray.intersectObject(mesh)[0];
      if (hit && hit.uv) uniforms.uMouse.value.copy(hit.uv);
      renderer.render(scene, camera);
    }
    return { draw: draw, resize: resize, canvas: canvas, ready: function () { return loaded; } };
  }

  /* =====================================================
     THE 3D LACING (the ending)
     Two panels of a corset back, seven gold eyelets on each side and a wine satin ribbon that
     criss-crosses up through them as you scroll. The panels pull closer as it tightens, then it ties a bow.
     ===================================================== */
  var lace = null;
  function makeLace() {
    var canvas = $("lace-canvas");
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PHONE ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 18);
    scene.add(new THREE.HemisphereLight(0xfff3f1, 0x6b4246, 1.2));
    var key = new THREE.DirectionalLight(0xfff0e6, 2.8); key.position.set(4, 5, 8); scene.add(key);
    var rim = new THREE.DirectionalLight(0xf3b2ba, 1.2); rim.position.set(-6, -2, 4); scene.add(rim);

    var group = new THREE.Group(); scene.add(group);
    var satin = new THREE.MeshPhysicalMaterial({ color: 0xe2b4ae, roughness: 0.34, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xffe6e2), clearcoat: 0.3, side: THREE.DoubleSide });
    var channel = new THREE.MeshPhysicalMaterial({ color: 0xcf9d97, roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color(0xffe6e2) });
    var gold = new THREE.MeshStandardMaterial({ color: 0xc9a26a, metalness: 1, roughness: 0.28 });
    var ribbonMat = new THREE.MeshPhysicalMaterial({ color: 0x7d1a26, roughness: 0.3, sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color(0xff9aa6), clearcoat: 0.5, clearcoatRoughness: 0.3, side: THREE.DoubleSide });

    var ROWS = 7, H = 7.2, PANEL_W = 3.4;
    var rowsY = []; for (var r = 0; r < ROWS; r++) rowsY.push(-H / 2 + 0.6 + r * (H - 1.2) / (ROWS - 1));

    // the two panels, each a softly curved sheet with three boning channels
    function makePanel(side) {
      var g = new THREE.Group();
      var geo = new THREE.PlaneGeometry(PANEL_W, H + 0.6, 24, 4);
      var p = geo.attributes.position;
      for (var i = 0; i < p.count; i++) { var x = p.getX(i); p.setZ(i, -0.18 * Math.pow((x * side + PANEL_W / 2) / PANEL_W, 2)); }
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, satin));
      for (var b = 0; b < 3; b++) {
        var bone = new THREE.Mesh(new THREE.BoxGeometry(0.07, H + 0.3, 0.05), channel);
        bone.position.set(side * (0.75 + b * 0.75) - side * PANEL_W / 2, 0, 0.02);
        g.add(bone);
      }
      var eyes = [];
      rowsY.forEach(function (y) {
        var e = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.055, 12, 32), gold);
        e.position.set(-side * (PANEL_W / 2 - 0.38), y, 0.06);
        g.add(e); eyes.push(e);
      });
      group.add(g);
      return g;
    }
    var left = makePanel(-1), right = makePanel(1);
    left.rotation.y = 0.16; right.rotation.y = -0.16;                  // turned slightly in, like the back of a body

    // THE RIBBON: two strands, laced from the bottom up in an X pattern
    var N = 240;                                                        // points along each strand
    function makeStrand() {
      var geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
      var idx = [];
      for (var i = 0; i < N - 1; i++) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      geo.setIndex(idx);
      var m = new THREE.Mesh(geo, ribbonMat); group.add(m); return m;
    }
    var strandA = makeStrand(), strandB = makeStrand();
    var tmpT = new THREE.Vector3(), tmpS = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
    // lays a flat ribbon of width w along a curve
    function layRibbon(mesh, pts, w) {
      var curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      var arr = mesh.geometry.attributes.position.array;
      for (var i = 0; i < N; i++) {
        var u = i / (N - 1), p = curve.getPointAt(u);
        curve.getTangentAt(u, tmpT);
        tmpS.crossVectors(tmpT, Z).normalize().multiplyScalar(w / 2);
        arr[i * 6] = p.x + tmpS.x; arr[i * 6 + 1] = p.y + tmpS.y; arr[i * 6 + 2] = p.z;
        arr[i * 6 + 3] = p.x - tmpS.x; arr[i * 6 + 4] = p.y - tmpS.y; arr[i * 6 + 5] = p.z + 0.004;
      }
      mesh.geometry.attributes.position.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeBoundingSphere();
    }

    // THE BOW at the top: two loops and two tails, it pops in at the very end
    var bow = new THREE.Group(); group.add(bow);
    function tube(points, closed, r) {
      var c = new THREE.CatmullRomCurve3(points, closed, "catmullrom", 0.5);
      var m = new THREE.Mesh(new THREE.TubeGeometry(c, 80, r, 10, closed), ribbonMat);
      m.scale.z = 0.35;                                                  // squashed flat, so it reads as ribbon
      return m;
    }
    [-1, 1].forEach(function (s) {
      bow.add(tube([new THREE.Vector3(0, 0, 0.2), new THREE.Vector3(s * 0.5, 0.42, 0.3), new THREE.Vector3(s * 1.05, 0.25, 0.25), new THREE.Vector3(s * 0.95, -0.15, 0.22), new THREE.Vector3(s * 0.45, -0.05, 0.25)], true, 0.075));
      bow.add(tube([new THREE.Vector3(0, -0.05, 0.25), new THREE.Vector3(s * 0.3, -0.6, 0.3), new THREE.Vector3(s * 0.55, -1.2, 0.2), new THREE.Vector3(s * 0.75, -1.65, 0.25)], false, 0.07));
    });
    var knot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), ribbonMat); knot.scale.set(1, 0.85, 0.6); knot.position.z = 0.3; bow.add(knot);

    var last = -1;
    function build(p) {
      var tight = ease(clamp((p - 0.1) / 0.75));
      var half = 1.25 - tight * 0.85;                                   // half the gap between the panels: wide open, then pulled close
      left.position.x = -(half + PANEL_W / 2); right.position.x = half + PANEL_W / 2;
      var ex = half + 0.38;                                             // where the eyelet holes sit
      var A = [], B = [];
      for (var r = 0; r < ROWS; r++) {
        var y = rowsY[r], lift = 0.05;
        var aSide = r % 2 === 0 ? -1 : 1;                               // strand A: left, right, left...
        A.push(new THREE.Vector3(aSide * ex, y, lift)); B.push(new THREE.Vector3(-aSide * ex, y, lift));
        if (r < ROWS - 1) {                                             // the crossing between this row and the next sits proud of the fabric
          var my = (y + rowsY[r + 1]) / 2;
          A.push(new THREE.Vector3(0, my, 0.24 + (r % 2 ? 0.05 : 0))); B.push(new THREE.Vector3(0, my, 0.24 + (r % 2 ? 0 : 0.05)));
        }
      }
      var top = new THREE.Vector3(0, rowsY[ROWS - 1] + 0.75, 0.22);  // both strands meet at the bow
      A.push(top.clone()); B.push(top.clone());
      layRibbon(strandA, A, 0.2); layRibbon(strandB, B, 0.2);
      bow.position.copy(top);
      // how much of the ribbon is laced so far (it threads up from the bottom)
      var shown = clamp(p / 0.82);
      var count = Math.floor(shown * (N - 1)) * 6;
      strandA.geometry.setDrawRange(0, count); strandB.geometry.setDrawRange(0, count);
      var b = clamp((p - 0.8) / 0.12);
      var s = b > 0 ? easeBack(b) : 0;
      bow.scale.setScalar(Math.max(0.0001, s)); bow.visible = b > 0;
    }

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      camera.position.z = camera.aspect < 0.8 ? 30 : 20;                // phones stand further back so it all fits
    }
    resize();

    var mx = 0, my = 0;
    window.addEventListener("pointermove", function (e) { mx = e.clientX / vw - 0.5; my = e.clientY / vh - 0.5; }, { passive: true });
    function draw(t, p) {
      if (Math.abs(p - last) > 0.0005) { build(p); last = p; }
      group.rotation.y += ((mx * 0.35 + Math.sin(t * 0.4) * 0.05) - group.rotation.y) * 0.05;   // turns gently with the mouse
      group.rotation.x += ((my * 0.18) - group.rotation.x) * 0.05;
      // at the very end the finished corset steps aside to make room for the booking link
      var aside = ease(clamp((p - 0.86) / 0.12));
      if (camera.aspect >= 0.8) { group.position.x = aside * 3.4; group.position.y = -0.7; }
      else { group.position.x = 0; group.position.y = -0.7 + aside * 2.6; group.scale.setScalar(1 - aside * 0.25); }
      renderer.render(scene, camera);
    }
    return { draw: draw, resize: resize };
  }

  // Start the 3D scenes. If the browser cannot do 3D, the page still works: the title and the
  // booking link simply show without the fabric.
  try { if (window.THREE) { silk = makeSilk(); lace = makeLace(); } } catch (err) { silk = lace = null; }
  if (!silk) { $("silk").style.display = "none"; }
  if (!lace) { $("lace-canvas").style.display = "none"; }

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
  var open = $("open"), craft = $("craft"), grow = $("grow"), laceSec = $("lace");
  var panels = Array.prototype.slice.call(document.querySelectorAll(".st-panel"));
  var cards = Array.prototype.slice.call(document.querySelectorAll(".st-card"));
  var fabs = Array.prototype.slice.call(document.querySelectorAll(".st-fab-media"));
  var growFrame = $("grow-frame"), quote = $("quote"), hint = $("scroll-hint"), laceEnd = $("lace-end");
  cards.forEach(function (c, i) { c.style.setProperty("--i", i); });

  // THE VEIL: lift it once the satin has drawn (straight away if there is no 3D)
  var veil = $("veil"), veilDone = false;
  function liftVeil() { if (veilDone) return; veilDone = true; veil.classList.add("is-gone"); setTimeout(function () { veil.remove(); }, 1000); }
  if (!silk || REDUCE) liftVeil();
  setTimeout(liftVeil, 2500);                                          // never leave it up for long, whatever happens

  var t0 = performance.now();
  function tick(now) {
    var t = REDUCE ? 0 : (now - t0) / 1000;
    var y = window.scrollY;

    // 1. THE OPENING: the silk lifts away and the title letters rise
    var po = progress(open);
    if (silk && open.getBoundingClientRect().bottom > 0) silk.draw(t, REDUCE ? 1 : po);
    if (silk && !veilDone && silk.ready()) liftVeil();               // the scarf has loaded: melt the veil
    var lp = REDUCE ? 1 : clamp((po - 0.3) / 0.45);
    letters.forEach(function (l, i) { l.style.setProperty("--y", ((1 - ease(clamp(lp * 1.6 - i * 0.05))) * 110).toFixed(2) + "%"); });
    hint.style.opacity = clamp(1 - po * 5);

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

    // 8. THE LACING, then the booking link
    var pl = progress(laceSec);
    if (lace && laceSec.getBoundingClientRect().top < vh) lace.draw(t, REDUCE ? 1 : pl);
    var eo = lace ? clamp((pl - 0.88) / 0.1) : 1;
    if (REDUCE) eo = 1;
    laceEnd.style.setProperty("--o", eo.toFixed(3)); laceEnd.classList.toggle("is-on", eo > 0.5);

    // THE STITCH: sews down to just below the middle of the screen, with the needle at the tip
    if (clipRect) {
      var reveal = REDUCE ? stitchEnd : Math.min(stitchEnd, y + vh * 0.6);
      clipRect.setAttribute("height", Math.max(0, reveal));
      var on = reveal > stitchStart && reveal < stitchEnd - 2;
      needle.style.display = on ? "" : "none";
      if (on) {
        var nx = stitchX(reveal), slope = (stitchX(reveal + 4) - stitchX(reveal - 4)) / 8;
        var ang = -Math.atan(slope) * 180 / Math.PI + Math.sin(t * 3) * 3;   // follows the thread, with a little sway
        needle.setAttribute("transform", "translate(" + nx.toFixed(1) + " " + reveal.toFixed(1) + ") rotate(" + ang.toFixed(1) + ")");
      }
    }
    requestAnimationFrame(tick);
  }

  function relayout() {
    vh = window.innerHeight; vw = window.innerWidth;
    if (silk) silk.resize(); if (lace) lace.resize();
    buildStitch();
  }
  window.addEventListener("resize", relayout);
  window.addEventListener("load", relayout);
  buildStitch();
  requestAnimationFrame(tick);
})();
