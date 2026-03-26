/* OneClubView Enhancements
   Part A — Landing page: phone mockup, reassurance text, sticky CTA
   Part B — In-app: tinted activity cards (coloured backgrounds)
   Waits for React to render before injecting.
*/
(function () {
  "use strict";

  /* ───── PART A: LANDING PAGE ENHANCEMENTS ───── */

  function enhance() {
    if (document.querySelector(".ocv-phone")) return true;

    const r4 = document.querySelector(".r4");
    const h1 = document.querySelector("h1");
    if (!r4 || !h1) return false;

    var headText = h1.textContent || "";
    if (headText.indexOf("clubs") === -1 && headText.indexOf("calm") === -1) return true;

    /* 1. REASSURANCE TEXT beneath CTA */
    const reassure = document.createElement("p");
    reassure.className = "ocv-reassure";
    reassure.innerHTML = "14 days free &middot; Cancel anytime &middot; 2 minutes to set up";
    r4.insertAdjacentElement("afterend", reassure);

    /* 2. PHONE MOCKUP in hero */
    const heroContent = h1.parentElement;
    const mockupWrap = document.createElement("div");
    mockupWrap.className = "ocv-mockup-wrap";
    mockupWrap.innerHTML = '<div class="ocv-phone"><div class="ocv-phone-notch"></div><div class="ocv-phone-screen"><div class="ocv-screen-header"><span class="ocv-screen-title">This Week</span><span class="ocv-screen-subtitle">The O\u2019Brien Family</span></div><div class="ocv-cal"><div class="ocv-cal-row ocv-cal-head"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="ocv-cal-row"><span class="ocv-ev ocv-ev1" style="grid-column:1/2">Swimming<br><small>Ella</small></span><span class="ocv-ev ocv-ev2" style="grid-column:2/3">GAA<br><small>Sam</small></span><span class="ocv-ev ocv-ev3" style="grid-column:3/4">Piano<br><small>Ella</small></span><span class="ocv-ev ocv-ev2" style="grid-column:4/5">GAA<br><small>Sam</small></span><span class="ocv-ev ocv-ev4" style="grid-column:5/6">Art Camp<br><small>Both</small></span><span class="ocv-ev ocv-ev1" style="grid-column:6/7">Swimming<br><small>Ella</small></span></div><div class="ocv-cal-row"><span class="ocv-empty" style="grid-column:1/2"></span><span class="ocv-ev ocv-ev5" style="grid-column:2/3">Gymnastics<br><small>Ella</small></span><span class="ocv-empty" style="grid-column:3/4"></span><span class="ocv-ev ocv-ev3" style="grid-column:4/5">Piano<br><small>Sam</small></span><span class="ocv-empty" style="grid-column:5/6"></span><span class="ocv-ev ocv-ev6" style="grid-column:6/7">Rugby<br><small>Sam</small></span></div></div><div class="ocv-screen-footer"><div class="ocv-clash-badge">Clash: Thu 5:45pm \u2014 GAA & Piano overlap</div></div><div class="ocv-screen-fee"><span>March fees</span><span class="ocv-fee-total">\u20ac187</span></div></div></div>';
    heroContent.insertAdjacentElement("afterend", mockupWrap);

    /* 3. STICKY MOBILE CTA BAR */
    const stickyBar = document.createElement("div");
    stickyBar.className = "ocv-sticky-bar";
    stickyBar.innerHTML = '<button class="ocv-sticky-btn" onclick="document.querySelector(\'.r4 button\').click()">Start free \u2014 14 days</button>';
    document.body.appendChild(stickyBar);
    let ticking = false;
    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          stickyBar.classList.toggle("ocv-sticky-show", window.scrollY > 500);
          ticking = false;
        });
        ticking = true;
      }
    });

    /* 4. STYLES */
    const css = document.createElement("style");
    css.textContent = ".ocv-reassure{color:rgba(255,255,255,.55);font-size:.85rem;margin-top:.75rem;letter-spacing:.02em}.ocv-mockup-wrap{display:flex;justify-content:center;padding:2rem 1rem 1rem;position:relative}.ocv-phone{width:260px;background:#1a1a2e;border-radius:32px;padding:8px;box-shadow:0 25px 60px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.08);position:relative;transform:perspective(800px) rotateY(-3deg) rotateX(2deg);transition:transform .4s ease;overflow:hidden}.ocv-phone:hover{transform:perspective(800px) rotateY(0) rotateX(0)}.ocv-phone-notch{width:80px;height:22px;background:#1a1a2e;border-radius:0 0 14px 14px;margin:0 auto;position:relative;z-index:2}.ocv-phone-screen{background:#fff;border-radius:24px;padding:10px 12px 14px;margin-top:-10px;min-height:320px;overflow:hidden}.ocv-screen-header{text-align:center;margin-bottom:10px;padding-top:6px}.ocv-screen-title{display:block;font-size:.95rem;font-weight:700;color:#1a2a3a}.ocv-screen-subtitle{font-size:.7rem;color:#888}.ocv-cal{display:flex;flex-direction:column;gap:4px}.ocv-cal-row{display:grid;grid-template-columns:repeat(6,1fr);gap:3px}.ocv-cal-head span{font-size:.55rem;font-weight:600;color:#999;text-align:center;padding:2px 0}.ocv-ev{display:block;border-radius:6px;padding:4px 2px;font-size:.5rem;font-weight:600;line-height:1.2;text-align:center;color:#fff;overflow:hidden}.ocv-ev small{font-weight:400;font-size:.42rem;opacity:.85}.ocv-ev1{background:#3b82f6}.ocv-ev2{background:#22c55e}.ocv-ev3{background:#a855f7}.ocv-ev4{background:#f59e0b}.ocv-ev5{background:#ec4899}.ocv-ev6{background:#14b8a6}.ocv-empty{min-height:28px}.ocv-screen-footer{margin-top:8px}.ocv-clash-badge{background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:5px 6px;font-size:.5rem;color:#92400e;text-align:center;font-weight:500}.ocv-screen-fee{display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding:6px 8px;background:#f0fdf4;border-radius:8px;font-size:.6rem;color:#166534;font-weight:600}.ocv-fee-total{font-size:.75rem}.ocv-sticky-bar{position:fixed;bottom:0;left:0;right:0;padding:12px 20px;padding-bottom:max(12px,env(safe-area-inset-bottom));background:rgba(26,42,58,.97);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:9999;transform:translateY(100%);transition:transform .3s ease;display:none;border-top:1px solid rgba(255,255,255,.1)}.ocv-sticky-show{transform:translateY(0)}.ocv-sticky-btn{display:block;width:100%;padding:14px;background:#e85d4a;color:#fff;border:none;border-radius:12px;font-size:1rem;font-weight:700;font-family:inherit;cursor:pointer;letter-spacing:.01em}.ocv-sticky-btn:active{background:#d14f3e}@media(max-width:640px){.ocv-sticky-bar{display:block}.ocv-phone{width:200px;border-radius:26px;padding:6px}.ocv-phone-notch{width:60px;height:18px;border-radius:0 0 10px 10px}.ocv-phone-screen{border-radius:20px;padding:8px 8px 10px;min-height:260px}.ocv-screen-title{font-size:.8rem}.ocv-screen-subtitle{font-size:.6rem}.ocv-cal-head span{font-size:.48rem}.ocv-ev{padding:3px 1px;font-size:.42rem;border-radius:5px}.ocv-ev small{font-size:.36rem}.ocv-empty{min-height:22px}.ocv-clash-badge{padding:4px 5px;font-size:.44rem}.ocv-screen-fee{font-size:.52rem;padding:4px 6px}.ocv-fee-total{font-size:.65rem}}@media(min-width:641px){.ocv-mockup-wrap{padding-top:0;padding-bottom:2rem}.ocv-phone{width:280px}}";
    document.head.appendChild(css);

    return true;
  }

  // Try immediately, then poll until React renders
  if (!enhance()) {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      if (enhance() || attempts > 50) clearInterval(timer);
    }, 100);
  }

  /* ───── PART B: IN-APP CARD TINTING ───── */
  /* Makes activity cards vibrant by reading each card's colour strip
     and applying a soft tinted background, border, and shadow. */

  function hexToRgba(hex, alpha) {
    try {
      var r = parseInt(hex.slice(1, 3), 16);
      var g = parseInt(hex.slice(3, 5), 16);
      var b = parseInt(hex.slice(5, 7), 16);
      return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
    } catch (e) {
      return null;
    }
  }

  function rgbToHex(rgb) {
    if (!rgb || rgb === "transparent" || rgb.indexOf("rgb") === -1) return null;
    var m = rgb.match(/\\d+/g);
    if (!m || m.length < 3) return null;
    return "#" + ((1 << 24) + (+m[0] << 16) + (+m[1] << 8) + +m[2]).toString(16).slice(1);
  }

  function tintCard(card) {
    if (card.dataset.ocvTinted) return;
    var strip = card.firstElementChild;
    if (!strip) return;

    var sw = strip.style.width;
    if (sw !== "5px" && sw !== "4px" && sw !== "5" && sw !== "4") return;

    var bg = strip.style.background || strip.style.backgroundColor;
    if (!bg || bg === "var(--bd)") return;

    var hex = bg.charAt(0) === "#" ? bg : rgbToHex(window.getComputedStyle(strip).backgroundColor);
    if (!hex) return;

    card.style.background = hexToRgba(hex, 0.07);
    card.style.border = "1px solid " + hexToRgba(hex, 0.15);
    card.style.boxShadow = "0 2px 8px " + hexToRgba(hex, 0.10);
    strip.style.borderRadius = "4px 0 0 4px";
    card.dataset.ocvTinted = "1";
  }

  function tintAllCards() {
    var cards = document.querySelectorAll('div[style*="border-radius"]');
    for (var i = 0; i < cards.length; i++) {
      var s = cards[i].style;
      if ((s.borderRadius === "14px" || s.borderRadius === "12px") &&
          s.overflow === "hidden" &&
          s.display === "flex") {
        tintCard(cards[i]);
      }
    }
  }

  setTimeout(tintAllCards, 800);
  setTimeout(tintAllCards, 2000);

  var observer = new MutationObserver(function () {
    requestAnimationFrame(tintAllCards);
  });
  observer.observe(document.body, { childList: true, subtree: true });

})();
