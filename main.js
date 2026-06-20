window.onload = function () {
  changeURL();
  injectTradingViewWidget();
};

const dateHeader = `### ${new Date().toLocaleDateString("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
})}`;

// Feature flag: enable/disable element-to-symbol logging
const ENABLE_TICKER_SYMBOL_LOGS = false;

// Temporary: verbose pagination diagnostics in the console (prefix "[CTV]").
const ENABLE_PAGINATION_LOGS = true;
function ctvLog() {
  if (!ENABLE_PAGINATION_LOGS) return;
  try {
    console.log.apply(console, ["[CTV]"].concat([].slice.call(arguments)));
  } catch (_) {}
}

// Feature flag: the hardcoded AAPL "advanced chart" widget pinned to the bottom
// of the page served no purpose for NSE users and showed up on the dashboard.
// Kept behind a flag (off) instead of deleting, in case it's needed again.
const ENABLE_STATIC_TV_WIDGET = false;

// Official TradingView app icon (black rounded square + white mark).
const TV_OFFICIAL_ICON_SVG = `<svg viewBox="0 0 1900 1900" xmlns="http://www.w3.org/2000/svg" style="width:17px;height:17px;flex:0 0 auto;display:inline-block;vertical-align:middle;border-radius:4px" aria-hidden="true"><rect width="1900" height="1900" rx="430" fill="#000000"></rect><polygon points="210,610 850,610 850,1490 545,1490 545,930 210,930" fill="#ffffff"></polygon><circle cx="1045" cy="810" r="168" fill="#ffffff"></circle><polygon points="1370,610 1780,610 1585,1490 1175,1490" fill="#ffffff"></polygon></svg>`;

// Stripe-style button: whitish-grey surface, thin outline, layered shadow.
const STRIPE_SHADOW =
  "0 1px 1px rgba(0,0,0,0.04), 0 2px 5px rgba(60,66,87,0.10), 0 0 0 1px rgba(60,66,87,0.06)";
const STRIPE_SHADOW_HOVER =
  "0 2px 5px rgba(0,0,0,0.06), 0 6px 14px rgba(60,66,87,0.18), 0 0 0 1px rgba(60,66,87,0.08)";
const STRIPE_BTN_CSS =
  "display:inline-flex;align-items:center;gap:7px;background:#f7f8fa;color:#1a1f36;border:1px solid rgba(0,0,0,0.06);border-radius:7px;padding:6px 12px;font-size:13px;font-weight:600;line-height:1.2;cursor:pointer;box-shadow:" +
  STRIPE_SHADOW +
  ";transition:box-shadow .15s ease, transform .12s ease;-webkit-font-smoothing:antialiased;";
// Compact variant for tight spots like dashboard/Atlas widget headers.
const STRIPE_BTN_CSS_COMPACT =
  "display:inline-flex;align-items:center;gap:5px;background:#f7f8fa;color:#1a1f36;border:1px solid rgba(0,0,0,0.06);border-radius:6px;padding:3px 8px;font-weight:600;line-height:1.2;cursor:pointer;flex:0 0 auto;box-shadow:" +
  STRIPE_SHADOW +
  ";transition:box-shadow .15s ease, transform .12s ease;-webkit-font-smoothing:antialiased;";

/**
 * Builds a Stripe-styled "Copy to TradingView" button: official TradingView
 * icon + stacked label with a tiny "by devAgam" credit inside. `compact`
 * shrinks it for widget headers. Wires the shared hover/press feedback.
 */
function buildStripeCopyButton(opts) {
  opts = opts || {};
  const compact = !!opts.compact;
  const labelSize = compact ? "11px" : "13px";
  const subSize = compact ? "7px" : "8px";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.title = opts.title || "Copy to TradingView";
  btn.style.cssText = compact ? STRIPE_BTN_CSS_COMPACT : STRIPE_BTN_CSS;
  btn.innerHTML =
    TV_OFFICIAL_ICON_SVG +
    '<span style="display:inline-flex;flex-direction:column;align-items:flex-start;line-height:1;">' +
    '<span style="font-size:' +
    labelSize +
    '">' +
    (opts.label || "Copy to TradingView") +
    "</span>" +
    '<span style="font-size:' +
    subSize +
    ';font-weight:500;color:#8792a2;letter-spacing:.2px;margin-top:2px;">by devAgam</span>' +
    "</span>";

  btn.addEventListener("mouseenter", function () {
    btn.style.boxShadow = STRIPE_SHADOW_HOVER;
    btn.style.transform = "translateY(-1px)";
  });
  btn.addEventListener("mouseleave", function () {
    btn.style.boxShadow = STRIPE_SHADOW;
    btn.style.transform = "none";
  });
  btn.addEventListener("mousedown", function () {
    btn.style.transform = "translateY(0)";
    btn.style.boxShadow = STRIPE_SHADOW;
  });
  return btn;
}

// Copy plain text to the clipboard (no date header), used by the per-widget button.
function copyTextToClipboard(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

/**
 * Injects a TradingView mini symbol overview widget at the bottom of the page.
 * Safe to call multiple times; it won't inject duplicates.
 */
function injectTradingViewWidget() {
  try {
    if (!ENABLE_STATIC_TV_WIDGET) return;
    if (document.querySelector(".tradingview-widget-container")) return;

    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.height = "100%";
    container.style.width = "100%";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "calc(100% - 32px)";
    widgetDiv.style.width = "100%";

    // Build iframe-based Advanced Chart embed to avoid script-src CSP blocks
    const cfg = {
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "D",
      locale: "en",
      save_image: true,
      style: "1",
      symbol: "NASDAQ:AAPL",
      theme: "dark",
      timezone: "Etc/UTC",
      backgroundColor: "#0F0F0F",
      gridColor: "rgba(242, 242, 242, 0.06)",
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      studies: [],
      autosize: true,
    };

    const iframe = document.createElement("iframe");
    iframe.src =
      "https://s.tradingview.com/embed-widget/advanced-chart/?locale=en#" +
      encodeURIComponent(JSON.stringify(cfg));
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.setAttribute("allowtransparency", "true");
    iframe.setAttribute("scrolling", "no");

    widgetDiv.appendChild(iframe);

    // Attribution link below iframe
    const copyrightDiv = document.createElement("div");
    copyrightDiv.className = "tradingview-widget-copyright";
    const link = document.createElement("a");
    link.href =
      "https://www.tradingview.com/symbols/NASDAQ-AAPL/?exchange=NASDAQ";
    link.rel = "noopener nofollow";
    link.target = "_blank";
    const span = document.createElement("span");
    span.className = "blue-text";
    span.textContent = "AAPL chart by TradingView";
    link.appendChild(span);
    copyrightDiv.appendChild(link);

    container.appendChild(widgetDiv);
    container.appendChild(copyrightDiv);
    document.body.appendChild(container);
  } catch (e) {
    try {
      console.error("Failed to inject TradingView widget", e);
    } catch (_) {}
  }
}

// Attempt immediate injection if possible, otherwise wait for DOMContentLoaded
if (document.body) {
  injectTradingViewWidget();
} else {
  document.addEventListener("DOMContentLoaded", injectTradingViewWidget);
}

/**
 * Changes the URL of certain links on the page based on the chart redirect state and kite enabled state.
 * Adds a copy button next to the modified links.
 */
function changeURL() {
  // Get the chart redirect state from the background script
  chrome.runtime.sendMessage(
    { message: "getChartRedirectState" },
    function (response) {
      if (!response.chartRedirectState) {
        return;
      }

      // Find all links with href starting with "/stocks"
      var links = document.querySelectorAll('a[href^="/stocks"]');
      for (var i = 0; i < links.length; i++) {
        if (
          links[i].innerText === "Charts" ||
          links[i].innerText === "Candlestick"
        )
          continue;
        // Modify the href to redirect to TradingView with the appropriate symbol
        links[
          i
        ].href = `https://in.tradingview.com/chart/?symbol=NSE:${compatabilitySymbolFunc(
          links[i].href
        )}`;
      }
    }
  );

  // Get the kite enabled state from the background script
  chrome.runtime.sendMessage(
    { message: "getKiteEnabled" },
    function (response) {
      if (!response.kiteEnabled) {
        return;
      }

      // Get the chart redirect state again
      chrome.runtime.sendMessage(
        { message: "getChartRedirectState" },
        function (response) {
          var links = [];
          if (response.chartRedirectState) {
            // Find all links with href starting with "https://in.tradingview.com/chart/?symbol=NSE:"
            links = document.querySelectorAll(
              'a[href^="https://in.tradingview.com/chart/?symbol=NSE:"]'
            );
          } else {
            // Find all links with href starting with "/stocks"
            links = document.querySelectorAll('a[href^="/stocks"]');
          }

          for (var i = 0; i < links.length; i++) {
            // Skip every other link if not on the dashboard page
            if (i % 2 !== 0 && !window.location.href.includes("/dashboard/")) {
              continue;
            }

            // Skip if a copy button already exists
            if (links[i].parentNode.querySelector(".copy-to-kite")) {
              continue;
            }

            // Create a copy button
            const copyButton = document.createElement("button");
            copyButton.innerHTML = `<img src="https://kite.zerodha.com/static/images/browser-icons/apple-touch-icon-57x57.png" alt="copy" style="width: 20px; height: 20px; margin-bottom:-3px;">`;
            copyButton.style.backgroundColor = "transparent";
            copyButton.style.border = "none";
            copyButton.style.cursor = "pointer";
            copyButton.style.marginLeft = "5px";
            copyButton.className = "copy-to-kite";

            // Add an onclick event to the copy button
            copyButton.onclick = function () {
              const parentNode = copyButton.parentNode;
              const aTagInParentNode = parentNode.querySelector("a");
              const href = aTagInParentNode.href;
              // Send a message to the background script to redirect to Kite with the copied link
              chrome.runtime.sendMessage({
                message: "redirectToKite",
                href: href,
              });
            };

            // Append the copy button to the parent node of the link
            links[i].parentNode.appendChild(copyButton);
          }
        }
      );
    }
  );
}

// Schedule multiple passes of changeURL to cover async table redraws after pagination
function scheduleChangeURL() {
  const run = function () {
    changeURL();
    bindChangeUrlToPagination();
    ensureCopyButtons();
  };
  setTimeout(run, 1);
  setTimeout(run, 150);
  setTimeout(run, 400);
}

// Debounced trigger for user interactions like hover/focus that may change DOM
var hoverDebounceTimer = null;
function scheduleFromUserInteraction() {
  if (hoverDebounceTimer) return;
  hoverDebounceTimer = setTimeout(function () {
    hoverDebounceTimer = null;
    observeCanvasAttributeChanges();
    // Try to refresh chart when user interaction happens
    try {
      scheduleInjectTradingViewChart(getCurrentCanvasEl());
    } catch (_) {}
    scheduleChangeURL();
  }, 120);
}

// Debounce chart injections to avoid thrashing on rapid hover updates
var chartInjectDebounceTimer = null;
function scheduleInjectTradingViewChart(el) {
  if (!hoverChartBetaEnabled) return;
  if (chartInjectDebounceTimer) {
    clearTimeout(chartInjectDebounceTimer);
  }
  chartInjectDebounceTimer = setTimeout(function () {
    chartInjectDebounceTimer = null;
    injectTradingViewChart(el);
  }, 80);
}

// Triggered when a new canvas element is added to the DOM
var lastObservedCanvasTitleTxt = null;
let hoverChartBetaEnabled = false;
chrome.runtime.sendMessage(
  { message: "getHoverChartBetaEnabled" },
  function (response) {
    hoverChartBetaEnabled = !!(response && response.hoverChartBetaEnabled);
    if (hoverChartBetaEnabled) {
      observeCanvasAttributeChanges();
    }
  }
);
function disableHoverChartFeature() {
  try {
    stopCanvasPoller();
    if (canvasObserver) {
      try {
        canvasObserver.disconnect();
      } catch (_) {}
    }
    var tooltipParent = document.getElementById("tooltip3");

    if (tooltipParent) {
      var iframe = tooltipParent.querySelector("iframe");
      if (iframe) iframe.remove();
    }
    var canvas = document.getElementById("chartink-js-grid-0-canvas");
    if (canvas) {
      canvas.style.visibility = "";
      canvas.style.pointerEvents = "";
      canvas.style.position = "";
      canvas.style.width = "";
      canvas.style.height = "";
    }
  } catch (_) {}
}
// Keep the original canvas in DOM, hide it, and remove other siblings along the chain to #tooltip3

// Move canvas directly under #tooltip3, hide it, and keep only that canvas (used on first inject)
function ensureCanvasInTooltipAndHidden(tooltipParent, canvasEl) {
  try {
    if (!tooltipParent) return;
    var keepCanvas =
      document.getElementById("chartink-js-grid-0-canvas") ||
      (canvasEl && canvasEl.querySelector
        ? canvasEl.querySelector("#chartink-js-grid-0-canvas")
        : null) ||
      (canvasEl && canvasEl.nodeName === "CANVAS" ? canvasEl : null);
    if (!keepCanvas) return;

    // Preserve the wrapper with class chartink-grid-0 if present
    var keepWrapper = null;
    try {
      if (keepCanvas.closest) {
        var candidate = keepCanvas.closest(".chartink-grid-0");
        if (candidate && tooltipParent.contains(candidate)) {
          keepWrapper = candidate;
        }
      }
    } catch (_) {}

    // Ensure the preserved node is under tooltip: prefer wrapper if available
    if (keepWrapper) {
      if (keepWrapper.parentElement !== tooltipParent) {
        try {
          tooltipParent.appendChild(keepWrapper);
        } catch (_) {}
      }
    } else {
      if (keepCanvas.parentElement !== tooltipParent) {
        try {
          tooltipParent.appendChild(keepCanvas);
        } catch (_) {}
      }
    }

    // Remove everything in tooltip except the keepWrapper/keepCanvas and any existing iframe
    var kids = Array.from(tooltipParent.childNodes);
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k === keepCanvas) continue;
      if (keepWrapper && k === keepWrapper) continue;
      if (k.nodeName === "IFRAME") continue;
      tooltipParent.removeChild(k);
    }

    // If wrapper exists, clean its children except the canvas
    if (keepWrapper) {
      var wkids = Array.from(keepWrapper.childNodes);
      for (var wi = 0; wi < wkids.length; wi++) {
        var wk = wkids[wi];
        if (wk !== keepCanvas) {
          keepWrapper.removeChild(wk);
        }
      }
    }

    // Hide the canvas so it stays in DOM for attribute updates
    try {
      keepCanvas.style.visibility = "hidden";
      keepCanvas.style.pointerEvents = "none";
      keepCanvas.style.position = "absolute";
      keepCanvas.style.width = "0px";
      keepCanvas.style.height = "0px";
    } catch (_) {}
  } catch (e) {
    try {
      console.error("Failed to ensure canvas in tooltip", e);
    } catch (_) {}
  }
}
// Style a hover-chart iframe so it fills the overlay (no blank band) and fades in.
function styleHoverIframe(iframe) {
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.style.display = "block";
  iframe.style.borderRadius = "10px";
  iframe.style.opacity = "0";
  iframe.style.transition = "opacity 180ms ease";
  iframe.setAttribute("allowtransparency", "true");
  iframe.setAttribute("scrolling", "no");
  iframe.addEventListener("load", function () {
    iframe.style.opacity = "1";
  });
}

// Clamp the floating overlay so it never gets clipped off-screen. Caps its size
// to the viewport and nudges it back in if any edge spills out.
function clampTooltipToViewport(el) {
  try {
    if (!el || el.style.display === "none") return;
    const margin = 8;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const maxW = vw - margin * 2;
    const maxH = vh - margin * 2;

    let rect = el.getBoundingClientRect();
    if (rect.width > maxW) el.style.width = maxW + "px";
    if (rect.height > maxH) el.style.height = maxH + "px";

    rect = el.getBoundingClientRect();
    const curLeft = parseFloat(el.style.left) || 0;
    const curTop = parseFloat(el.style.top) || 0;
    let dx = 0;
    let dy = 0;
    if (rect.left < margin) dx = margin - rect.left;
    else if (rect.right > vw - margin) dx = vw - margin - rect.right;
    if (rect.top < margin) dy = margin - rect.top;
    else if (rect.bottom > vh - margin) dy = vh - margin - rect.bottom;
    if (dx) el.style.left = curLeft + dx + "px";
    if (dy) el.style.top = curTop + dy + "px";
  } catch (_) {}
}

// Stop wheel/scroll over the overlay chrome from scrolling the underlying page.
// (The cross-origin TradingView iframe already captures its own wheel for zoom.)
function attachOverlayWheelGuard() {
  if (window.__ctvWheelGuardAttached) return;
  window.__ctvWheelGuardAttached = true;
  document.addEventListener(
    "wheel",
    function (e) {
      const tip = document.getElementById("tooltip3");
      if (!tip || tip.style.display === "none") return;
      if (tip.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { passive: false, capture: true }
  );
}

function injectTradingViewChart(canvasEl) {
  try {
    if (!hoverChartBetaEnabled) return;
    console.log("injectTradingViewChart triggered");

    // Prefer the actual canvas if provided a wrapper
    var actualCanvas = null;
    if (canvasEl && canvasEl.nodeName === "CANVAS") {
      actualCanvas = canvasEl;
    } else if (canvasEl && canvasEl.querySelector) {
      actualCanvas =
        canvasEl.querySelector("#chartink-js-grid-0-canvas") ||
        canvasEl.querySelector("canvas");
    }

    var titleTxt = null;
    if (actualCanvas) {
      titleTxt = actualCanvas.getAttribute("title_txt");
    }
    if (!titleTxt && canvasEl) {
      titleTxt = canvasEl.getAttribute("title_txt");
    }
    // Only update tracked title when it actually changes
    if (titleTxt && titleTxt !== lastObservedCanvasTitleTxt) {
      lastObservedCanvasTitleTxt = titleTxt;
    }
    console.log("title_txt value:", lastObservedCanvasTitleTxt);

    // Find the tooltip container that should host the TradingView chart
    var tooltipParent = null;
    if (canvasEl && canvasEl.closest) {
      tooltipParent = canvasEl.closest("#tooltip3");
    }
    if (!tooltipParent) {
      tooltipParent = document.getElementById("tooltip3");
    }
    if (!tooltipParent) {
      console.warn("injectTradingViewChart: #tooltip3 container not found");
      return;
    }

    // Skip updates if symbol hasn't changed; also avoid updating on empty
    if (
      !lastObservedCanvasTitleTxt ||
      !String(lastObservedCanvasTitleTxt).trim()
    ) {
      return;
    }
    var newSymbol = `BSE:${String(lastObservedCanvasTitleTxt).trim()}`;
    var existingSymbol = tooltipParent.dataset
      ? tooltipParent.dataset.tvSymbol
      : null;
    if (existingSymbol && existingSymbol === newSymbol) {
      return;
    }

    // Ensure container can size the iframe
    if (!tooltipParent.style.position)
      tooltipParent.style.position = "relative";
    if (!tooltipParent.style.width) tooltipParent.style.width = "100%";
    if (!tooltipParent.style.height) tooltipParent.style.height = "500px";
    tooltipParent.style.backgroundColor =
      tooltipParent.style.backgroundColor || "#0F0F0F";
    // Clip the iframe to the rounded container and keep edges clean
    tooltipParent.style.overflow = "hidden";
    if (!tooltipParent.style.borderRadius)
      tooltipParent.style.borderRadius = "10px";

    // Build TradingView Advanced Chart iframe
    var cfg = {
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "D",
      locale: "en",
      save_image: true,
      style: "1",
      symbol: newSymbol,
      theme: "dark",
      timezone: "Etc/UTC",
      backgroundColor: "#0F0F0F",
      gridColor: "rgba(242, 242, 242, 0.06)",
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      studies: [],
      autosize: true,
    };

    var newSrc =
      "https://s.tradingview.com/embed-widget/advanced-chart/?locale=en#" +
      encodeURIComponent(JSON.stringify(cfg));
    var existingIframe = tooltipParent.querySelector("iframe");
    if (existingIframe) {
      if (existingIframe.src !== newSrc) {
        var newIframe = document.createElement("iframe");
        newIframe.src = newSrc;
        styleHoverIframe(newIframe);
        existingIframe.replaceWith(newIframe);
      }
    } else {
      // Move canvas directly under #tooltip3 and keep it hidden, then inject iframe
      ensureCanvasInTooltipAndHidden(
        tooltipParent,
        actualCanvas || canvasEl || getCurrentCanvasEl()
      );
      var iframe = document.createElement("iframe");
      iframe.src = newSrc;
      styleHoverIframe(iframe);
      // Append iframe after ensuring the canvas is kept
      tooltipParent.appendChild(iframe);
      tooltipParent.style.position = "absolute";
    }
    if (tooltipParent.dataset) {
      tooltipParent.dataset.tvInjected = "1";
      tooltipParent.dataset.tvSymbol = newSymbol;
    }
    // Keep the overlay inside the viewport and stop wheel-zoom from scrolling the page
    clampTooltipToViewport(tooltipParent);
    attachOverlayWheelGuard();
  } catch (e) {
    try {
      console.error("injectTradingViewChart failed", e);
    } catch (_) {}
  }
}

// Observe attribute changes on the chart canvas specifically
var canvasObserver = null;
var observedCanvasEl = null;
var canvasPollTimer = null;
function getCurrentCanvasEl() {
  return document.getElementById("chartink-js-grid-0-canvas");
}
function readTitleTxtFrom(el) {
  if (!el) return null;
  var t = null;
  try {
    t = el.getAttribute && el.getAttribute("title_txt");
  } catch (_) {}
  if (!t) {
    try {
      if (typeof el.title_txt !== "undefined" && el.title_txt !== null) {
        t = String(el.title_txt);
      }
    } catch (_) {}
  }
  if (!t) {
    try {
      t =
        (el.getAttribute && el.getAttribute("data-symbol")) ||
        (el.getAttribute && el.getAttribute("data-title")) ||
        (el.getAttribute && el.getAttribute("title"));
    } catch (_) {}
  }
  if (!t && el.dataset) {
    t =
      el.dataset.title_txt || el.dataset.titleTxt || el.dataset.symbol || null;
  }
  if (!t && el.parentElement) {
    try {
      t = el.parentElement.getAttribute
        ? el.parentElement.getAttribute("title_txt")
        : null;
      if (!t && el.parentElement.dataset) {
        t =
          el.parentElement.dataset.title_txt ||
          el.parentElement.dataset.titleTxt ||
          el.parentElement.dataset.symbol ||
          null;
      }
    } catch (_) {}
  }
  return t || null;
}
function startCanvasPoller() {
  if (canvasPollTimer) return;
  canvasPollTimer = setInterval(function () {
    try {
      var el = getCurrentCanvasEl();
      var t = readTitleTxtFrom(el);
      if (t && t !== lastObservedCanvasTitleTxt) {
        lastObservedCanvasTitleTxt = t;
        scheduleInjectTradingViewChart(el || observedCanvasEl);
      }
      // Re-clamp in case Chartink repositions/resizes the overlay on hover
      clampTooltipToViewport(document.getElementById("tooltip3"));
    } catch (e) {
      try {
        console.error("canvas polling error", e);
      } catch (_) {}
    }
  }, 200);
}
function stopCanvasPoller() {
  if (canvasPollTimer) {
    clearInterval(canvasPollTimer);
    canvasPollTimer = null;
  }
}
function observeCanvasAttributeChanges() {
  try {
    if (!hoverChartBetaEnabled) return;
    var el = getCurrentCanvasEl();
    if (!el) return;
    if (observedCanvasEl === el && canvasObserver) return;
    if (canvasObserver) {
      try {
        canvasObserver.disconnect();
      } catch (_) {}
    }
    observedCanvasEl = el;
    canvasObserver = new MutationObserver(function (mutations) {
      var target = (mutations[0] && mutations[0].target) || el;
      // try to pick latest title from target or current canvas
      var latest =
        readTitleTxtFrom(target) || readTitleTxtFrom(getCurrentCanvasEl());
      if (latest && latest !== lastObservedCanvasTitleTxt) {
        lastObservedCanvasTitleTxt = latest;
      }
      scheduleInjectTradingViewChart(target);
    });
    canvasObserver.observe(el, {
      attributes: true,
      attributeFilter: ["title_txt"],
    });
    startCanvasPoller();
    try {
      console.log("Attached canvas observer to:", el);
      console.log("Initial title_txt:", readTitleTxtFrom(el));
    } catch (_) {}
  } catch (e) {
    try {
      console.error("Failed to observe canvas attribute changes", e);
    } catch (_) {}
  }
}

// Bind pagination buttons so URL rewriting runs on every page change
function bindChangeUrlToPagination() {
  const buttons = document.querySelectorAll("button.px-2\\.5");
  buttons.forEach((btn) => {
    if (btn.dataset.changeurlBound === "1") return;
    btn.dataset.changeurlBound = "1";
    btn.addEventListener("click", () => {
      scheduleChangeURL();
    });
  });
}

/**
 * Extracts the symbol from the URL based on the URL format.
 * @param {string} url - The URL of the link.
 * @returns {string|null} - The extracted symbol or null if not found.
 */
function compatabilitySymbolFunc(url) {
  if (url.includes("stocks-new")) {
    return new URL(url).searchParams.get("symbol");
  }
  return url.substring(url.lastIndexOf("/") + 1, url.lastIndexOf(".html"));
}

// Create a mutation observer to detect changes in the DOM
var observer = new MutationObserver(function (mutations) {
  // Throttle general handling; many mutations can fire in quick succession
  scheduleChangeURL();
  observeCanvasAttributeChanges();
});

var config = {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: true,
  attributeFilter: ["class", "href", "style", "aria-expanded", "aria-hidden"],
};

// Observe the document body for changes
observer.observe(document.body, config);
// Initial bind in case pagination exists on load
bindChangeUrlToPagination();
// Start watching the chart canvas for attribute changes
observeCanvasAttributeChanges();

// React to hover/focus driven UI updates that don't mutate DOM structure
document.addEventListener("mouseover", scheduleFromUserInteraction);
document.addEventListener("focusin", scheduleFromUserInteraction);

// Keep the hover overlay inside the viewport when the window is resized
window.addEventListener("resize", function () {
  clampTooltipToViewport(document.getElementById("tooltip3"));
});

const GLOBAL_COPY_BTN_ID = "add-to-watchlist";
let enableShortcutCopyState = false;

// True only on the screener results view (where the Copy/CSV/Excel toolbar and
// pager exist). The copy flow + shortcut are screener-only.
function isScreenerResultsPresent() {
  if (document.querySelector(".scan-results-toolbar-button")) return true;
  const pager = getScreenerPagerButtons();
  return !!(pager.next || pager.prev);
}

// Platform-aware label for the copy shortcut, e.g. "⌘+Shift+C" / "Ctrl+Shift+C".
function getCopyShortcutLabel() {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  return (isMac ? "Cmd" : "Ctrl") + "+Shift+C";
}

/**
 * Adds the "Copy to TradingView" button into the screener results export
 * toolbar (the row that holds Copy / CSV / Excel). Styled like a Stripe button
 * (whitish-grey, outline, layered shadow) with the official TradingView icon
 * and a tiny "by devAgam" caption underneath.
 * Idempotent and safe to call repeatedly as Chartink re-renders.
 */
function addGlobalCopyToTradingViewButton() {
  // The export toolbar group containing the Copy / CSV / Excel buttons.
  const firstToolbarBtn = document.querySelector(".scan-results-toolbar-button");
  if (!firstToolbarBtn || !firstToolbarBtn.parentElement) return;
  if (document.getElementById(GLOBAL_COPY_BTN_ID)) return;

  const group = firstToolbarBtn.parentElement;

  const btn = buildStripeCopyButton({
    title:
      "Copy all tickers across every page to TradingView\nShortcut: " +
      getCopyShortcutLabel(),
  });
  btn.id = GLOBAL_COPY_BTN_ID;
  btn.addEventListener("click", copyAllTickersOnScreen);
  group.appendChild(btn);
}

/**
 * Adds a per-widget "Copy to TradingView" button to every dashboard widget
 * header. Copies just that widget's tickers (NSE:SYMBOL, ...) to the clipboard.
 */
const WIDGET_COPY_CLASS = "ctv-widget-copy";
function addWidgetCopyButtons() {
  const widgets = document.querySelectorAll(".vue-grid-item");
  widgets.forEach((widget) => {
    if (widget.querySelector("." + WIDGET_COPY_CLASS)) return;

    // Only stock-list widgets get a copy button — skip chart/gauge/etc. widgets
    // that have no ticker rows. (Widgets load async; once rows render, a later
    // ensureCopyButtons pass will add the button.)
    const hasTickers =
      widget.querySelector("a[data-symbol]") ||
      widget.querySelector('a[href*="symbol=NSE:"]');
    if (!hasTickers) return;

    // The widget title lives in a span.truncate inside the header row.
    const titleSpan = widget.querySelector("span.truncate");
    if (!titleSpan || !titleSpan.parentElement) return;

    const btn = buildStripeCopyButton({
      compact: true,
      title: "Copy this widget's tickers to TradingView",
    });
    btn.className = WIDGET_COPY_CLASS;
    btn.style.cssText += "margin-left:6px;";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      copyWidgetTickers(widget, btn);
    });
    titleSpan.parentElement.appendChild(btn);
  });
}

// Copy all NSE tickers contained in a single dashboard widget.
function copyWidgetTickers(widget, btn) {
  // Prefer the clean data-symbol attribute; fall back to rewritten NSE links.
  let symbols = Array.from(widget.querySelectorAll("a[data-symbol]"))
    .map((a) => a.getAttribute("data-symbol"))
    .filter(Boolean);
  if (!symbols.length) {
    symbols = Array.from(widget.querySelectorAll('a[href*="symbol=NSE:"]'))
      .map((a) => extracrtSymbolFromURL(a.href))
      .filter(Boolean);
  }

  symbols = symbols.map(replaceSpecialCharsWithUnderscore);
  symbols = removeDuplicateTickers(addColonNSEtoTickers(symbols));
  if (!symbols.length) return;

  copyTextToClipboard(symbols.join(", "));

  // Brief confirmation on the button's label, keeping the Stripe look intact.
  const labelSpan = btn.querySelector("span > span");
  if (labelSpan) {
    const original = labelSpan.textContent;
    labelSpan.textContent = "Copied ✓";
    labelSpan.style.color = "#16a34a";
    setTimeout(function () {
      labelSpan.textContent = original;
      labelSpan.style.color = "";
    }, 1500);
  }
}

// Inject both the global and per-widget copy buttons, and keep them present as
// Chartink re-renders the SPA.
function ensureCopyButtons() {
  addGlobalCopyToTradingViewButton();
  addWidgetCopyButtons();
}
ensureCopyButtons();

// Initialize shortcut state in content script and keybinding (UI lives in popup)
chrome.runtime.sendMessage(
  { message: "getShortcutEnabled" },
  function (response) {
    enableShortcutCopyState = Boolean(response && response.shortcutEnabled);
  }
);

window.addEventListener("keydown", (e) => {
  if (!enableShortcutCopyState) return;
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const mod = isMac ? e.metaKey : e.ctrlKey;
  // Match by physical key (e.code) so it's layout/Shift independent.
  const isC = e.code === "KeyC" || e.key === "C" || e.key === "c";
  if (mod && e.shiftKey && isC) {
    // Screener-only: ignore on dashboard/Atlas or anywhere without results.
    if (!isScreenerResultsPresent()) return;
    e.preventDefault();
    copyAllTickersOnScreen();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.message) return;
  if (request.message === "pushShortcutEnabled") {
    enableShortcutCopyState = !!request.state;
  } else if (request.message === "downloadCSV") {
    downloadAllTickersAsCSV();
  } else if (request.message === "copyTickers") {
    copyAllTickersOnScreen();
  } else if (request.message === "pushHoverChartBetaEnabled") {
    hoverChartBetaEnabled = !!request.state;
    if (hoverChartBetaEnabled) {
      observeCanvasAttributeChanges();
    } else {
      disableHoverChartFeature();
    }
  }
});

/**
 * Finds the screener results pager buttons ("<< Prev" / "Next >>"). The new
 * Chartink UI has no page-count text — Next gets the `disabled` attribute on
 * the last page, Prev on the first page.
 * @returns {{prev: HTMLButtonElement|null, next: HTMLButtonElement|null}}
 */
function getScreenerPagerButtons() {
  let prev = null;
  let next = null;
  const buttons = document.querySelectorAll("button");
  for (const b of buttons) {
    const t = (b.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!t || t.length > 14) continue; // skip long labels (e.g. dropdown options)
    const looksPrev =
      t === "<< prev" || (t.includes("prev") && (t.includes("<") || t === "prev"));
    const looksNext =
      t === "next >>" || (t.includes("next") && (t.includes(">") || t === "next"));
    if (looksNext && !next) next = b;
    else if (looksPrev && !prev) prev = b;
    if (prev && next) break;
  }
  return { prev, next };
}

// True when a pager button can't be advanced (disabled attr/prop or styling).
function isPagerButtonDisabled(btn) {
  if (!btn) return true;
  if (btn.disabled) return true;
  if (btn.getAttribute("disabled") !== null) return true;
  if (btn.getAttribute("aria-disabled") === "true") return true;
  const cls = btn.className || "";
  if (/(^|\s)(disabled|cursor-not-allowed)(\s|$)/.test(cls)) return true;
  return false;
}

// A signature of the rows currently rendered, used to detect when a page
// actually changes after clicking Prev/Next.
function screenerPageSignature() {
  return Array.from(document.querySelectorAll("a[data-symbol]"))
    .map((a) => a.getAttribute("data-symbol"))
    .join("|");
}

// Wait until the rendered rows differ from `prevSig` (page advanced), or bail
// out after `timeout` ms. Returns true if the page changed.
async function waitForScreenerPageChange(prevSig, timeout) {
  const start = Date.now();
  const limit = typeof timeout === "number" ? timeout : 2500;
  while (Date.now() - start < limit) {
    await delay(80);
    if (screenerPageSignature() !== prevSig) {
      await delay(60); // let the row anchors settle
      return true;
    }
  }
  return false;
}

/**
 * Walks every page of the screener results table and collects all tickers.
 * Uses Chartink's own `data-symbol` attribute (present regardless of the
 * redirect setting), so it works whether or not links are rewritten.
 * @returns {Promise<string[]>} - Deduped, NSE-prefixed tickers (e.g. "NSE:TCS").
 */
async function collectScreenerTickersAcrossPages() {
  const seen = new Set();
  const symbols = [];

  const scrapeCurrentPage = () => {
    document.querySelectorAll("a[data-symbol]").forEach((a) => {
      const raw = a.getAttribute("data-symbol");
      if (!raw) return;
      const key = replaceSpecialCharsWithUnderscore(raw);
      if (!seen.has(key)) {
        seen.add(key);
        symbols.push(key);
      }
    });
  };

  const pager0 = getScreenerPagerButtons();
  ctvLog(
    "pager found -> prev:",
    !!pager0.prev,
    "next:",
    !!pager0.next,
    "| prev.disabled:",
    isPagerButtonDisabled(pager0.prev),
    "next.disabled:",
    isPagerButtonDisabled(pager0.next)
  );

  // Rewind to the first page (click "<< Prev" until it's disabled).
  let guard = 0;
  let prev = getScreenerPagerButtons().prev;
  while (prev && !isPagerButtonDisabled(prev) && guard++ < 500) {
    const sig = screenerPageSignature();
    prev.click();
    const changed = await waitForScreenerPageChange(sig);
    ctvLog("rewind click Prev -> changed:", changed);
    if (!changed) break;
    prev = getScreenerPagerButtons().prev;
  }

  // Walk forward, scraping each page, until "Next >>" is disabled/missing.
  guard = 0;
  while (guard++ < 1000) {
    scrapeCurrentPage();
    ctvLog("page", guard, "scraped -> total unique tickers:", symbols.length);
    const next = getScreenerPagerButtons().next;
    if (!next || isPagerButtonDisabled(next)) {
      ctvLog("stop: next missing/disabled", { hasNext: !!next });
      break;
    }
    const sig = screenerPageSignature();
    next.click();
    const changed = await waitForScreenerPageChange(sig);
    ctvLog("forward click Next -> changed:", changed);
    if (!changed) break; // safety: stop if the page didn't actually advance
  }

  ctvLog("collection done -> tickers:", symbols.length);
  return addColonNSEtoTickers(symbols);
}

/**
 * Delays the execution of the code.
 * @param {number} t - The delay time in milliseconds.
 * @returns {Promise} - A promise that resolves after the delay.
 */
const delay = (t) => {
  return new Promise((res) => setTimeout(res, t));
};

// Guards against overlapping runs while we're clicking through pages.
let isCollectingTickers = false;

/**
 * Copies all tickers across every page of the screener results to the clipboard.
 */
async function copyAllTickersOnScreen() {
  ctvLog("copyAllTickersOnScreen invoked");
  if (isCollectingTickers) return;
  isCollectingTickers = true;

  const button = document.getElementById(GLOBAL_COPY_BTN_ID);
  const labelSpan = button ? button.querySelector("span > span") : null;
  const originalLabel = labelSpan ? labelSpan.textContent : null;
  if (labelSpan) labelSpan.textContent = "Collecting…";

  try {
    const tickers = removeDuplicateTickers(
      await collectScreenerTickersAcrossPages()
    );
    if (labelSpan && originalLabel !== null) {
      labelSpan.textContent = originalLabel;
    }
    if (!tickers.length) {
      ctvLog("nothing to copy (0 tickers)");
      return;
    }

    createFakeTextAreaToCopyText(tickers.join(", "));
    ctvLog("copied", tickers.length, "tickers to clipboard");
    replaceButtonText(GLOBAL_COPY_BTN_ID);
  } catch (e) {
    if (labelSpan && originalLabel !== null) {
      labelSpan.textContent = originalLabel;
    }
    try {
      console.error("copyAllTickersOnScreen failed", e);
    } catch (_) {}
  } finally {
    isCollectingTickers = false;
  }
}

/**
 * Replaces the text of a button with a success message and then restores it after a delay.
 * @param {string} buttonId - The ID of the button.
 */
function replaceButtonText(buttonId) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  // Remember the original (branded) markup so we can restore the logos after.
  if (!button.dataset.ctvOriginalHtml) {
    button.dataset.ctvOriginalHtml = button.innerHTML;
  }
  button.innerHTML = "Copied to clipboard 📋";
  setTimeout(() => {
    button.innerHTML = button.dataset.ctvOriginalHtml;
  }, 2000);
}

/**
 * Creates a fake textarea, copies the text to it, and then copies the text from the textarea to the clipboard.
 * @param {string} text - The text to copy to the clipboard.
 */
function createFakeTextAreaToCopyText(text) {
  const fakeTextArea = document.createElement("textarea");
  fakeTextArea.value = `${dateHeader},${text}`;
  document.body.appendChild(fakeTextArea);
  fakeTextArea.select();
  document.execCommand("copy");
  document.body.removeChild(fakeTextArea);
}

// Create and download a CSV file from provided rows (array of arrays)
function downloadCSV(filename, rows) {
  const csv = rows
    .map((r) =>
      r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Collect tickers across every page, returning per-ticker snapshots (text +
// href) alongside the deduped NSE-prefixed ticker list. Used by the CSV export.
async function collectAllTickersSnapshots() {
  const seen = new Set();
  const tickers = [];
  const snapshots = [];

  const scrapeCurrentPage = () => {
    document.querySelectorAll("a[data-symbol]").forEach((a) => {
      const raw = a.getAttribute("data-symbol");
      if (!raw) return;
      const key = replaceSpecialCharsWithUnderscore(raw);
      if (seen.has(key)) return;
      seen.add(key);
      tickers.push(`NSE:${key}`);
      snapshots.push({ text: (a.textContent || "").trim(), href: a.href });
    });
  };

  // Rewind to the first page.
  let guard = 0;
  let prev = getScreenerPagerButtons().prev;
  while (prev && !isPagerButtonDisabled(prev) && guard++ < 500) {
    const sig = screenerPageSignature();
    prev.click();
    const changed = await waitForScreenerPageChange(sig);
    if (!changed) break;
    prev = getScreenerPagerButtons().prev;
  }

  // Walk forward across all pages.
  guard = 0;
  while (guard++ < 1000) {
    scrapeCurrentPage();
    const next = getScreenerPagerButtons().next;
    if (!next || isPagerButtonDisabled(next)) break;
    const sig = screenerPageSignature();
    next.click();
    const changed = await waitForScreenerPageChange(sig);
    if (!changed) break;
  }

  return { snapshots, tickers };
}

// Download all tickers as CSV
async function downloadAllTickersAsCSV() {
  const { snapshots, tickers } = await collectAllTickersSnapshots();
  const rows = [
    ["date", "symbol", "text", "href"],
    ...tickers.map((t, idx) => [
      new Date().toISOString(),
      t,
      snapshots[idx] ? snapshots[idx].text : "",
      snapshots[idx] ? snapshots[idx].href : "",
    ]),
  ];
  downloadCSV(
    `tickers-${new Date()
      .toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      .replace(/ /g, "-")}_${new Date()
      .toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase()
      .replace(" ", "")}.csv`,
    rows
  );
  replaceButtonText("download-csv");
}

/**
 * Removes duplicate tickers from an array.
 * @param {string[]} tickers - The array of tickers.
 * @returns {string[]} - The array of tickers with duplicates removed.
 */
function removeDuplicateTickers(tickers) {
  return [...new Set(tickers)];
}

/**
 * Adds "NSE:" prefix to each ticker in an array.
 * @param {string[]} tickers - The array of tickers.
 * @returns {string[]} - The array of tickers with "NSE:" prefix added.
 */
function addColonNSEtoTickers(tickers) {
  return tickers.map((ticker) => `NSE:${ticker}`);
}

/**
 * Replaces special characters in a ticker with underscores.
 * @param {string} ticker - The ticker.
 * @returns {string} - The ticker with special characters replaced.
 */
function replaceSpecialCharsWithUnderscore(ticker) {
  return ticker.replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * Removes the ".html" extension from a ticker.
 * @param {string} ticker - The ticker.
 * @returns {string} - The ticker without the ".html" extension.
 */
function removeDotHTML(ticker) {
  return ticker.replace(".html", "");
}

/**
 * Extracts the symbol from the URL.
 * @param {string} url - The URL of the link.
 * @returns {string|null} - The extracted symbol or null if not found.
 */
function extracrtSymbolFromURL(url) {
  const urlParams = new URLSearchParams(new URL(url).search);
  const symbol = urlParams.get("symbol");
  return symbol ? symbol.split(":")[1] : null;
}
function extractSymbolFromTradingViewURL(url) {
  if (url.includes("NSE:")) {
    return url.split("/")[4].split(":")[1];
  } else if (url.includes("/stocks-new")) {
    const urlParams = new URLSearchParams(url);
    return urlParams.get("symbol");
  } else if (url.includes("/stocks/")) {
    return url.split("/").pop().replace(".html", "");
  }
}
