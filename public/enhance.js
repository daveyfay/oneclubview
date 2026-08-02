/* OneClubView Enhancements
   Part A — Landing page: phone mockup, reassurance text, sticky CTA
   Part B — In-app: tinted activity cards (coloured backgrounds)
   Waits for React to render before injecting.
*/
(function () {
  "use strict";

  /* ───── PART A: LANDING PAGE ENHANCEMENTS ───── */
  /* Disabled — hero mockup, reassurance text, and sticky CTA are now
     rendered by React in Landing.jsx. Only Part B (card tinting) remains. */

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
