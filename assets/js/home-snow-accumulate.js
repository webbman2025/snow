/**
 * Flakes land on a CSS snow pile (clip-path from depth bins). Mobile uses fewer flakes/RAF work.
 */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  var pile = document.getElementById("snow-pile");
  var overlay = document.querySelector(".snowfall-overlay");
  if (!pile || !overlay) {
    return;
  }

  var MOBILE_MQ = window.matchMedia("(max-width: 768px)");
  var MOBILE_FLAKE_LIMIT = 36;
  var BIN_COUNT = 96;
  var bins = [];
  var reliefEnvelope = [];
  var full = false;
  var flakes = [];
  var rafId = 0;
  var tickFrame = 0;
  var clipPathCache = "";
  var pointerX = -1;
  var pointerY = -1;
  var scrubbing = false;
  var fingerDown = false;
  var fingerShovel = null;
  var SHOVEL_HOT_X = 40;
  var SHOVEL_HOT_Y = 127;

  var i;

  function isMobile() {
    return MOBILE_MQ.matches;
  }

  function initBins() {
    var fine =
      document.documentElement.classList.contains("home3-inpage") &&
      reliefEnvelopeActive();
    BIN_COUNT = isMobile() ? 48 : fine ? (profileUsesReferenceShape() ? 128 : 112) : 96;
    bins = new Array(BIN_COUNT);
    for (i = 0; i < BIN_COUNT; i++) {
      bins[i] = 0;
    }
    full = false;
    clipPathCache = "";
    buildReliefEnvelope();
  }

  function viewportW() {
    return window.innerWidth || document.documentElement.clientWidth;
  }

  function viewportH() {
    if (window.visualViewport && window.visualViewport.height) {
      return window.visualViewport.height;
    }
    return window.innerHeight || document.documentElement.clientHeight;
  }

  function maxPilePx() {
    var pct = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--snow-pile-max-vh")
    );
    if (!(pct > 0)) {
      pct = 5;
    }
    return viewportH() * (pct / 100);
  }

  function startPilePx() {
    var pct = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--snow-pile-start-vh")
    );
    if (!(pct > 0)) {
      return 0;
    }
    var h = viewportH() * (pct / 100);
    var cap = maxPilePx();
    if (cap > 0 && h > cap) {
      h = cap;
    }
    return h;
  }

  function pileBumpScale() {
    var s = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--snow-pile-bump-scale")
    );
    return s > 0 && !isNaN(s) ? s : 1;
  }

  /** Multiplier for left / mid / right slope terms only (home3). */
  function pileSlopeDepth() {
    var s = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--snow-pile-slope-depth")
    );
    return s > 0 && !isNaN(s) ? s : 1;
  }

  function pileProfileMode() {
    return getComputedStyle(document.documentElement).getPropertyValue("--snow-pile-profile").trim().toLowerCase();
  }

  function profileUsesReferenceShape() {
    var mode = pileProfileMode();
    return mode === "reference" || mode === "bump" || mode === "drift";
  }

  function gaussBump(t, center, sigma, amplitude) {
    var d = (t - center) / sigma;
    return amplitude * Math.exp(-(d * d));
  }

  /**
   * Art-directed snow lip: twin bumps left, wide mid dip, tall right double-bump (design reference).
   */
  function referenceBumpProfile(t) {
    var base = 0.56 + 0.18 * t;
    var profile =
      base +
      gaussBump(t, 0.055, 0.038, 0.13) +
      gaussBump(t, 0.155, 0.048, 0.19) +
      gaussBump(t, 0.27, 0.06, -0.07) +
      gaussBump(t, 0.46, 0.13, -0.14) +
      gaussBump(t, 0.58, 0.09, 0.06) +
      gaussBump(t, 0.71, 0.042, 0.2) +
      gaussBump(t, 0.835, 0.072, 0.34) +
      gaussBump(t, 0.94, 0.032, 0.05);
    profile += 0.012 * Math.sin(t * Math.PI * 16 + 0.85);
    return profile;
  }

  function pileSurfaceWave(t) {
    return (
      1 +
      0.12 * (0.5 - t) +
      0.1 * Math.sin(t * Math.PI * 0.82 + 0.15) +
      0.11 * Math.sin(t * Math.PI * 1.15 + 0.2) +
      0.1 * Math.sin(t * Math.PI * 1.5) +
      0.08 * Math.sin(t * Math.PI * 2.9 + 0.4) +
      0.09 * Math.sin(t * Math.PI * 3.8) +
      0.05 * Math.sin(t * Math.PI * 8.1 + 0.9) +
      0.03 * Math.sin(t * Math.PI * 14.2 + 2.1)
    );
  }

  function pileLeftReliefScale() {
    var s = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--snow-pile-left-relief")
    );
    return s > 0 && !isNaN(s) ? s : 0;
  }

  /** Extra bumps on the left edge (t = 0 … ~0.45); fades toward centre. */
  function leftSideWave(t) {
    if (t >= 0.54) {
      return 0;
    }
    var fade = 1 - t / 0.54;
    fade *= fade;
    return (
      fade *
      (0.26 * Math.sin(t * Math.PI * 2.4 + 0.35) +
        0.2 * Math.sin(t * Math.PI * 4.2 + 1.05) +
        0.21 * Math.sin(t * Math.PI * 11 + 0.25) +
        0.15 * Math.sin(t * Math.PI * 21 + 1.7) +
        0.12 * Math.cos(t * Math.PI * 7.2 + 0.5) +
        0.08 * Math.sin(t * Math.PI * 28 + 2.3))
    );
  }

  function pileRightReliefScale() {
    var s = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--snow-pile-right-relief")
    );
    return s > 0 && !isNaN(s) ? s : 0;
  }

  function pileMidReliefScale() {
    var s = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--snow-pile-mid-relief")
    );
    return s > 0 && !isNaN(s) ? s : 0;
  }

  function pileQuarterReliefScale() {
    var s = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--snow-pile-quarter-relief")
    );
    return s > 0 && !isNaN(s) ? s : 0;
  }

  /** Left-mid slope (between edge and centre). */
  function leftQuarterWave(t) {
    var d = Math.abs(t - 0.26);
    if (d >= 0.22) {
      return 0;
    }
    var fade = 1 - d / 0.22;
    fade *= fade;
    return (
      fade *
      (0.22 * Math.sin(t * Math.PI * 3.4 + 0.45) +
        0.18 * Math.cos(t * Math.PI * 1.6 + 0.35) +
        0.14 * Math.sin(t * Math.PI * 5.1 + 1.2))
    );
  }

  /** Right-mid slope (between centre and edge). */
  function rightQuarterWave(t) {
    var d = Math.abs(t - 0.74);
    if (d >= 0.22) {
      return 0;
    }
    var fade = 1 - d / 0.22;
    fade *= fade;
    return (
      fade *
      (0.22 * Math.sin((1 - t) * Math.PI * 3.3 + 0.55) +
        0.18 * Math.cos((1 - t) * Math.PI * 1.7 + 0.4) +
        0.14 * Math.sin((1 - t) * Math.PI * 5.0 + 0.95))
    );
  }

  /** Centre-band slopes; fades toward left/right edges (broader than edge ripples). */
  function midSectionWave(t) {
    var d = Math.abs(t - 0.5);
    if (d >= 0.4) {
      return 0;
    }
    var fade = 1 - d / 0.4;
    fade *= fade;
    return (
      fade *
      (0.32 * Math.sin(t * Math.PI * 2.6 + 0.5) +
        0.26 * Math.sin(t * Math.PI * 4.8 + 1.15) +
        0.2 * Math.cos(t * Math.PI * 6.5 + 0.85) +
        0.16 * Math.sin(t * Math.PI * 1.9 + 0.25))
    );
  }

  /** Extra bumps on the right edge; fades toward centre. */
  function rightSideWave(t) {
    if (t <= 0.52) {
      return 0;
    }
    var fromRight = 1 - t;
    if (fromRight >= 0.48) {
      return 0;
    }
    var fade = 1 - fromRight / 0.48;
    fade *= fade;
    return (
      fade *
      (0.25 * Math.sin(fromRight * Math.PI * 2.5 + 0.9) +
        0.2 * Math.sin(fromRight * Math.PI * 4.4 + 0.45) +
        0.16 * Math.sin(fromRight * Math.PI * 12 + 1.05) +
        0.13 * Math.sin(fromRight * Math.PI * 19 + 0.35) +
        0.1 * Math.cos(fromRight * Math.PI * 8.3 + 1.15))
    );
  }

  function pileSmoothRadius() {
    var r = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--snow-pile-smooth-radius")
    );
    if (!isNaN(r) && r >= 0) {
      return Math.round(r);
    }
    return isMobile() ? 2 : 3;
  }

  /** Extra box-blur on clip-path contour only (smoother arcs, less straight segments). */
  function pileCurveSmoothRadius() {
    var r = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--snow-pile-curve-smooth")
    );
    if (!isNaN(r) && r >= 0) {
      return Math.round(r);
    }
    return 0;
  }

  function boxBlurBins(src, radius) {
    if (!(radius > 0)) {
      return src;
    }
    var out = new Array(src.length);
    var j;
    for (i = 0; i < src.length; i++) {
      var sum = 0;
      var n = 0;
      for (j = i - radius; j <= i + radius; j++) {
        if (j >= 0 && j < src.length) {
          sum += src[j];
          n++;
        }
      }
      out[i] = n > 0 ? sum / n : src[i];
    }
    return out;
  }

  function contourForClip() {
    var smooth = smoothedBins();
    var curveR = pileCurveSmoothRadius();
    if (curveR > 0) {
      smooth = boxBlurBins(smooth, curveR);
    }
    return smooth;
  }

  function reliefEnvelopeActive() {
    var v = getComputedStyle(document.documentElement)
      .getPropertyValue("--snow-pile-relief-envelope")
      .trim();
    return v === "1" || v === "true";
  }

  function pileSpreadFactor() {
    var s = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--snow-pile-spread")
    );
    if (!isNaN(s) && s >= 0 && s <= 1) {
      return s;
    }
    return 0.22;
  }

  function waveFactorAtBin(index) {
    if (reliefEnvelope.length === BIN_COUNT && reliefEnvelope[index] > 0) {
      return reliefEnvelope[index];
    }
    var denom = BIN_COUNT > 1 ? BIN_COUNT - 1 : 1;
    var t = index / denom;
    var bump = pileBumpScale();
    if (profileUsesReferenceShape()) {
      var shaped = referenceBumpProfile(t);
      var refWave = 1 + (shaped - 1) * bump;
      if (refWave < 0.38) {
        refWave = 0.38;
      }
      if (refWave > 1.44) {
        refWave = 1.44;
      }
      return refWave;
    }
    var left = pileLeftReliefScale();
    var right = pileRightReliefScale();
    var mid = pileMidReliefScale();
    var quarter = pileQuarterReliefScale();
    var depth = pileSlopeDepth();
    var regional =
      depth *
      (left * leftSideWave(t) +
        right * rightSideWave(t) +
        mid * midSectionWave(t) +
        quarter * (leftQuarterWave(t) + rightQuarterWave(t)));
    var wave = pileSurfaceWave(t) + regional;
    wave = 1 + (wave - 1) * bump;
    if (wave < 0.34) {
      wave = 0.34;
    }
    if (wave > 1.38) {
      wave = 1.38;
    }
    return wave;
  }

  function buildReliefEnvelope() {
    reliefEnvelope = new Array(BIN_COUNT);
    for (i = 0; i < BIN_COUNT; i++) {
      reliefEnvelope[i] = waveFactorAtBin(i);
    }
  }

  function binCapPx(b) {
    var cap = maxPilePx();
    if (!reliefEnvelopeActive()) {
      return cap;
    }
    return cap * waveFactorAtBin(b);
  }

  /** Pre-fill bottom snow so first-time visitors see an obvious pile (home3: --snow-pile-start-vh). */
  function seedInitialPile() {
    var depth = startPilePx();
    if (!(depth > 0)) {
      return;
    }
    for (i = 0; i < BIN_COUNT; i++) {
      bins[i] = depth * waveFactorAtBin(i);
    }
    full = pileAtMaxDepth();
  }

  function pileAtMaxDepth() {
    var cap = maxPilePx();
    if (!(cap > 0)) {
      return false;
    }
    if (!reliefEnvelopeActive()) {
      return maxBinHeight() >= cap * 0.96;
    }
    var peak = 0;
    for (i = 0; i < BIN_COUNT; i++) {
      var localCap = binCapPx(i);
      if (!(localCap > 0)) {
        continue;
      }
      var ratio = bins[i] / localCap;
      if (ratio > peak) {
        peak = ratio;
      }
    }
    return peak >= 0.96;
  }

  function clampBins() {
    for (i = 0; i < BIN_COUNT; i++) {
      var localCap = binCapPx(i);
      if (bins[i] > localCap) {
        bins[i] = localCap;
      }
    }
    full = pileAtMaxDepth();
  }

  function xToBin(x) {
    var w = viewportW();
    if (w <= 0) {
      return 0;
    }
    var b = Math.floor((x / w) * BIN_COUNT);
    if (b < 0) {
      return 0;
    }
    if (b >= BIN_COUNT) {
      return BIN_COUNT - 1;
    }
    return b;
  }

  function maxBinHeight() {
    var m = 0;
    for (i = 0; i < BIN_COUNT; i++) {
      if (bins[i] > m) {
        m = bins[i];
      }
    }
    return m;
  }

  function surfaceYAt(x) {
    return viewportH() - bins[xToBin(x)];
  }

  function flakeDepositPx(el, rect) {
    var h = rect.height;
    if (!(h > 0)) {
      h = 12;
    }
    return Math.max(1.2, h * 0.22);
  }

  function addDepositToBin(b, amount) {
    if (b < 0 || b >= BIN_COUNT) {
      return;
    }
    var room = binCapPx(b) - bins[b];
    if (room <= 0) {
      return;
    }
    bins[b] += Math.min(amount, room);
  }

  function spreadDeposit(bin, amount) {
    var spread = pileSpreadFactor();
    addDepositToBin(bin, amount);
    if (spread > 0) {
      addDepositToBin(bin - 1, amount * spread);
      addDepositToBin(bin + 1, amount * spread);
    }
    full = pileAtMaxDepth();
  }

  function smoothedBins() {
    var out = new Array(BIN_COUNT);
    var radius = pileSmoothRadius();
    for (i = 0; i < BIN_COUNT; i++) {
      if (bins[i] <= 0.4) {
        out[i] = 0;
        continue;
      }
      var sum = 0;
      var n = 0;
      var j;
      for (j = i - radius; j <= i + radius; j++) {
        if (j >= 0 && j < BIN_COUNT) {
          sum += bins[j];
          n++;
        }
      }
      out[i] = sum / n;
    }
    return out;
  }

  function pileClipPath(smooth, maxH) {
    if (maxH < 0.5) {
      return "none";
    }
    var stride = isMobile() ? 2 : 1;
    var parts = ["0% 100%", "0% " + yPct(smooth[0], maxH)];
    var step = 100 / (BIN_COUNT - 1);
    for (i = 1; i < BIN_COUNT; i += stride) {
      parts.push(step * i + "% " + yPct(smooth[i], maxH));
    }
    if ((BIN_COUNT - 1) % stride !== 0) {
      parts.push("100% " + yPct(smooth[BIN_COUNT - 1], maxH));
    }
    parts.push("100% 100%");
    return "polygon(" + parts.join(", ") + ")";
  }

  function yPct(depth, maxH) {
    return (100 - (depth / maxH) * 100).toFixed(2) + "%";
  }

  function updatePile(forceClip) {
    clampBins();
    var maxH = maxBinHeight();
    var target = maxPilePx();
    var fill = target > 0 ? Math.min(1, maxH / target) : 0;

    pile.style.height = maxH + "px";
    document.documentElement.style.setProperty("--snow-pile-height", maxH + "px");
    document.documentElement.style.setProperty("--snow-fill", String(fill));

    pile.classList.toggle("snow-pile--active", maxH > 2);
    pile.classList.toggle("snow-pile--full", full);

    if (maxH < 0.5) {
      pile.style.clipPath = "none";
      clipPathCache = "";
      return;
    }
    if (forceClip || !clipPathCache) {
      clipPathCache = pileClipPath(contourForClip(), maxH);
      pile.style.clipPath = clipPathCache;
    }
  }

  function pointerOverPile(x, y) {
    if (maxBinHeight() < 2 || x < 0 || y < 0) {
      return false;
    }
    var pad = isMobile() ? 36 : 14;
    return y >= surfaceYAt(x) - pad && y <= viewportH() + 12;
  }

  function pointerNearSnow(x, y) {
    if (maxBinHeight() < 2 || x < 0 || y < 0) {
      return false;
    }
    var reach = Math.max(64, Math.min(120, maxPilePx() + 56));
    return y >= surfaceYAt(x) - reach && y <= viewportH() + 8;
  }

  function syncClothCursor() {
    document.documentElement.classList.toggle(
      "snow-shovel-cursor",
      pointerNearSnow(pointerX, pointerY)
    );
  }

  function ensureFingerShovel() {
    if (fingerShovel) {
      return fingerShovel;
    }
    fingerShovel = document.createElement("img");
    fingerShovel.id = "snow-finger-shovel";
    fingerShovel.alt = "";
    fingerShovel.setAttribute("aria-hidden", "true");
    fingerShovel.draggable = false;
    fingerShovel.src = "/assets/images/snow-shovel-cursor.png?v=2";
    document.body.appendChild(fingerShovel);
    return fingerShovel;
  }

  function syncFingerShovel(show) {
    var el = ensureFingerShovel();
    if (!show) {
      el.classList.remove("is-on");
      return;
    }
    el.classList.add("is-on");
    el.style.transform =
      "translate3d(" +
      (pointerX - SHOVEL_HOT_X) +
      "px," +
      (pointerY - SHOVEL_HOT_Y) +
      "px,0)";
  }

  function brushRadiusBins() {
    var px = isMobile()
      ? Math.max(72, viewportW() * 0.2)
      : Math.max(42, viewportW() * 0.07);
    px *= 0.95;
    var perBin = viewportW() / BIN_COUNT;
    if (!(perBin > 0)) {
      return 3;
    }
    return Math.max(2, Math.round(px / perBin));
  }

  function disarmFlakesAlreadyDown() {
    var threshold = isMobile() ? 6 : 4;
    var n;
    for (n = 0; n < flakes.length; n++) {
      var el = flakes[n];
      var rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        continue;
      }
      var x = rect.left + rect.width * 0.5;
      var centerY = rect.top + rect.height * 0.5;
      if (centerY >= surfaceYAt(x) - threshold) {
        el._snowAboveSurface = false;
      }
    }
  }

  function scrubAt(x) {
    var center = xToBin(x);
    var radius = brushRadiusBins();
    var k;
    var changed = false;

    for (k = center - radius; k <= center + radius; k++) {
      if (k < 0 || k >= BIN_COUNT || bins[k] <= 0) {
        continue;
      }
      var t = radius === 0 ? 0 : Math.abs(k - center) / radius;
      if (t <= 0.8) {
        bins[k] = 0;
      } else {
        bins[k] *= (t - 0.8) / 0.2;
        if (bins[k] < 0.4) {
          bins[k] = 0;
        }
      }
      changed = true;
    }

    if (!changed) {
      return;
    }
    full = pileAtMaxDepth();
    clipPathCache = "";
    disarmFlakesAlreadyDown();
    updatePile(true);
  }

  function brushCoversBin(bin) {
    if (!scrubbing) {
      return false;
    }
    return Math.abs(bin - xToBin(pointerX)) <= brushRadiusBins();
  }

  function placePointer(x, y, fromFinger) {
    pointerX = x;
    pointerY = y;
    scrubbing = pointerOverPile(pointerX, pointerY);
    if (fromFinger) {
      syncFingerShovel(scrubbing);
    } else {
      syncClothCursor();
    }
    if (scrubbing) {
      scrubAt(pointerX);
    }
    return scrubbing;
  }

  function onPointerMove(e) {
    if (e.pointerType === "touch") {
      return;
    }
    placePointer(e.clientX, e.clientY, false);
  }

  function onTouch(e) {
    var t = e.touches && e.touches[0];
    if (!t) {
      return;
    }
    fingerDown = true;
    if (placePointer(t.clientX, t.clientY, true) && e.cancelable) {
      e.preventDefault();
    }
  }

  function endTouch() {
    if (!fingerDown) {
      return;
    }
    fingerDown = false;
    pointerX = -1;
    pointerY = -1;
    scrubbing = false;
    syncFingerShovel(false);
  }

  function onPointerLeave() {
    if (fingerDown) {
      return;
    }
    pointerX = -1;
    pointerY = -1;
    scrubbing = false;
    syncClothCursor();
  }

  function onLand(el, rect) {
    var x = rect.left + rect.width * 0.5;
    var bin = xToBin(x);
    if (brushCoversBin(bin)) {
      return;
    }
    if (bins[bin] >= binCapPx(bin) - 0.25) {
      return;
    }
    var amount = flakeDepositPx(el, rect);
    amount *= 0.82 + 0.28 * Math.abs(Math.sin(bin * 12.9898 + rect.left * 0.013));
    spreadDeposit(bin, amount);
    clipPathCache = "";
    updatePile(true);
  }

  function syncFlakeVisibility() {
    var all = overlay.querySelectorAll(".snowflake");
    var limit = isMobile() ? MOBILE_FLAKE_LIMIT : all.length;
    for (i = 0; i < all.length; i++) {
      all[i].style.display = i < limit ? "" : "none";
    }
    flakes = [];
    for (i = 0; i < limit && i < all.length; i++) {
      if (all[i].style.display !== "none") {
        flakes.push(all[i]);
      }
    }
  }

  function warmFallDelaySeconds(baseDelay, fallDuration, durationScale, flakeIndex) {
    var period = Math.max((fallDuration || 8) * durationScale, 1);
    var base = isNaN(baseDelay) ? 0 : baseDelay;
    /* W3Bits staggers first cycle up to ~19s — negative delay starts mid-fall on load. */
    var offset = (base + flakeIndex * 1.7) * durationScale;
    var warm = -(offset % period);
    if (warm === 0 && base > 0) {
      warm = -0.01;
    }
    return warm;
  }

  function applyFlakeMotion() {
    var durationScale = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--snow-fall-speed")
    );
    if (!(durationScale > 0)) {
      durationScale = 1;
    }
    var mobile = isMobile();

    flakes.forEach(function (el, idx) {
      el.dataset.snowMotion = "";
      var s = getComputedStyle(el);
      var fallName = s.animationName.split(",")[0].trim();
      var dur = parseFloat(s.animationDuration);
      var del = parseFloat(s.animationDelay);
      var fallDurSec = dur ? dur * durationScale : 8 * durationScale;
      var fallDur = fallDurSec + "s";
      var fallDelSec = warmFallDelaySeconds(del, dur, durationScale, idx);
      var fallDel = fallDelSec + "s";

      if (mobile) {
        el.style.animationName = fallName;
        el.style.animationDuration = fallDur;
        el.style.animationDelay = fallDel;
        el.style.animationIterationCount = "infinite";
        el.style.animationTimingFunction = "linear";
      } else {
        var swayName = idx % 2 === 0 ? "snow-sway" : "snow-sway-b";
        var swayDur = 4.2 + (idx % 13) * 0.48 + (idx % 5) * 0.15;
        var swayDel = -((idx % 19) * 0.41);
        el.style.animationName = fallName + ", " + swayName;
        el.style.animationDuration = fallDur + ", " + swayDur + "s";
        el.style.animationDelay = fallDel + ", " + swayDel + "s";
        el.style.animationIterationCount = "infinite, infinite";
        el.style.animationTimingFunction = "linear, ease-in-out";
      }

      el.dataset.snowMotion = "1";
    });
  }

  function bindFlakes() {
    initBins();
    seedInitialPile();
    syncFlakeVisibility();
    applyFlakeMotion();
    flakes.forEach(function (el) {
      el._snowAboveSurface = true;
    });
    disarmFlakesAlreadyDown();
    updatePile(true);
    if (!rafId && !document.hidden) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function tick() {
    if (document.hidden) {
      rafId = 0;
      return;
    }

    tickFrame++;
    if (!fingerDown) {
      scrubbing = pointerOverPile(pointerX, pointerY);
      syncClothCursor();
    }
    if (scrubbing) {
      scrubAt(pointerX);
    }
    var mobile = isMobile();
    if (mobile && tickFrame % 3 !== 0) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    var threshold = mobile ? 6 : 4;
    var list = flakes;
    var step = mobile ? 2 : 1;
    var j;

    for (j = 0; j < list.length; j += step) {
      var el = list[j];
      if (!el || el.style.display === "none") {
        continue;
      }
      var rect = el.getBoundingClientRect();
      if (rect.height === 0 && rect.width === 0) {
        continue;
      }
      var x = rect.left + rect.width * 0.5;
      var surface = surfaceYAt(x);
      var centerY = rect.top + rect.height * 0.5;

      if (centerY < surface - threshold) {
        el._snowAboveSurface = true;
        el.style.animationPlayState = "";
        continue;
      }

      if (el._snowAboveSurface && centerY >= surface - threshold) {
        el._snowAboveSurface = false;
        onLand(el, rect);
        el.style.animationPlayState = "paused";
        window.setTimeout(function (node) {
          node.style.animationPlayState = "";
        }, 80, el);
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function onLayoutChange() {
    var wasMobile = document.documentElement.classList.contains("snow-mobile");
    var nowMobile = isMobile();
    document.documentElement.classList.toggle("snow-mobile", nowMobile);
    if (wasMobile !== nowMobile) {
      initBins();
      syncFlakeVisibility();
      applyFlakeMotion();
    }
    clipPathCache = "";
    updatePile(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindFlakes);
  } else {
    bindFlakes();
  }

  document.documentElement.classList.toggle("snow-mobile", isMobile());

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    } else if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
  });

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerleave", onPointerLeave);
  document.addEventListener("touchstart", onTouch, { passive: false });
  document.addEventListener("touchmove", onTouch, { passive: false });
  document.addEventListener("touchend", endTouch, { passive: true });
  document.addEventListener("touchcancel", endTouch, { passive: true });

  window.addEventListener("resize", onLayoutChange);
  if (MOBILE_MQ.addEventListener) {
    MOBILE_MQ.addEventListener("change", onLayoutChange);
  } else if (MOBILE_MQ.addListener) {
    MOBILE_MQ.addListener(onLayoutChange);
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", onLayoutChange);
  }
})();