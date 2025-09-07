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

/**
 * Injects a TradingView mini symbol overview widget at the bottom of the page.
 * Safe to call multiple times; it won't inject duplicates.
 */
function injectTradingViewWidget() {
  try {
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
        existingIframe.remove();
        iframe = document.createElement("iframe");
        iframe.src = newSrc;
        iframe.style.width = "60%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.setAttribute("allowtransparency", "true");
        iframe.setAttribute("scrolling", "no");
        tooltipParent.appendChild(iframe);
      }
    } else {
      // Move canvas directly under #tooltip3 and keep it hidden, then inject iframe
      ensureCanvasInTooltipAndHidden(
        tooltipParent,
        actualCanvas || canvasEl || getCurrentCanvasEl()
      );
      var iframe = document.createElement("iframe");
      iframe.src = newSrc;
      iframe.style.width = "60%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.setAttribute("allowtransparency", "true");
      iframe.setAttribute("scrolling", "no");
      // Append iframe after ensuring the canvas is kept
      tooltipParent.appendChild(iframe);
      tooltipParent.style.position = "absolute";
    }
    if (tooltipParent.dataset) {
      tooltipParent.dataset.tvInjected = "1";
      tooltipParent.dataset.tvSymbol = newSymbol;
    }
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

const screenerButtonsClass = "flex justify-between items-enter px-4 py-4";
const SHORTCUT_CHECKBOX_ID = "enable-shortcut-copy";
const STORAGE_KEY_ENABLE_SHORTCUT = "enableShortcutCopy";
let enableShortcutCopyState = false;

/**
 * Adds a copy button to the TradingView screener buttons.
 * @param {string} buttonText - The text to display on the button.
 * @param {string} buttonClass - The CSS class of the button.
 * @param {string} buttonId - The ID of the button.
 * @param {function} buttonFunction - The function to execute when the button is clicked.
 */
const addCopyToTradingViewButton = (
  buttonText,
  buttonClass,
  buttonId,
  buttonFunction
) => {
  const screenerButtons = document.getElementsByClassName(screenerButtonsClass);
  if (screenerButtons.length === 0) return;
  const screenerButtonsParent = screenerButtons[0];
  const screenerButton = document.createElement("button");
  screenerButton.innerHTML = buttonText;
  screenerButton.className = buttonClass;
  screenerButton.id = buttonId;
  screenerButton.onclick = buttonFunction;
  screenerButtonsParent.appendChild(screenerButton);
};

// Add a copy button to the TradingView screener buttons
addCopyToTradingViewButton(
  "Copy to TradingView",
  "secondary-button w-fit px-2 lg:px-4 py-1.5 opacity-100",
  "add-to-watchlist",
  copyAllTickersOnScreen
);

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
  if (mod && e.shiftKey && (e.key === "C" || e.key === "c")) {
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
 * Gets the length of the pagination.
 * @returns {number} - The length of the pagination.
 */
function getPaginationLength() {
  const allButtons = Array.from(document.querySelectorAll("button.px-2\\.5"));
  if (allButtons.length === 0) return 1; // no pagination UI -> single page

  let nextPageButton = null;
  for (const button of allButtons) {
    if (button.textContent.trim() === "Next") {
      nextPageButton = button;
      break;
    }
  }

  if (!nextPageButton) return 1; // no Next button -> single page

  const previousElement = nextPageButton.previousElementSibling;
  const total = previousElement ? parseInt(previousElement.textContent) : 1;
  return Number.isFinite(total) && total > 0 ? total : 1;
}

// Clicks the next page button
function nextPage() {
  const nextButton = document.querySelector("button.px-2\\.5");
  if (!nextButton) return 0;

  // Find the specific Next button by checking its text content
  const allButtons = document.querySelectorAll("button.px-2\\.5");
  let nextPageButton;
  for (const button of allButtons) {
    if (button.textContent.trim() === "Next") {
      nextPageButton = button;
      break;
    }
  }

  if (!nextPageButton) return 0;
  nextPageButton.click();
}

// Ensure we are on the first page (click the "1" button if present)
async function goToFirstPage() {
  const allButtons = Array.from(document.querySelectorAll("button.px-2\\.5"));
  if (allButtons.length === 0) return; // no pagination UI
  const firstPageButton = allButtons.find(
    (button) => button.textContent.trim() === "1"
  );
  if (!firstPageButton) return;
  firstPageButton.click();
  await delay(200);
}

/**
 * Gets the number of stocks displayed on the screen.
 * @returns {number} - The number of stocks.
 */
function getNumberOfStocks() {
  const el = document.getElementsByClassName("dataTables_info")[0];
  const innerText = el.innerText;
  const numberOfStocks = innerText.match(/\d+/)[0];
  return numberOfStocks;
}

/**
 * Delays the execution of the code.
 * @param {number} t - The delay time in milliseconds.
 * @returns {Promise} - A promise that resolves after the delay.
 */
const delay = (t) => {
  return new Promise((res) => setTimeout(res, t));
};

/**
 * Copies all the tickers on the screen to the clipboard.
 */
async function copyAllTickersOnScreen() {
  // Get the chart redirect state from the background script
  chrome.runtime.sendMessage(
    { message: "getChartRedirectState" },
    async function (response) {
      if (response.chartRedirectState) {
        let allTickersArray = [];
        let allTags = [];
        const numberOfPages = getPaginationLength();
        await goToFirstPage();

        // Iterate through each page
        for (let i = 0; i < numberOfPages; i++) {
          if (i > 0) {
            await delay(200);
          }
          // Capture immutable snapshots (text + href) for this page
          allTags.push(
            Array.from(
              document.querySelectorAll(
                'a[href^="https://in.tradingview.com/chart/?symbol=NSE:"]'
              )
            ).map((a) => ({ text: (a.textContent || "").trim(), href: a.href }))
          );

          nextPage();
        }

        // Flatten the array of page snapshots
        const allTickers = allTags.flat();

        // Extract the symbols from the URLs and add them to the tickers array
        allTickers.forEach((ticker) => {
          allTickersArray.push(
            replaceSpecialCharsWithUnderscore(
              extracrtSymbolFromURL(ticker.href)
            )
          );
        });

        // Add "NSE:" prefix to the tickers
        allTickersArray = addColonNSEtoTickers(allTickersArray);
        if (ENABLE_TICKER_SYMBOL_LOGS) {
          console.log(
            "Element->Symbol",
            allTickers.map((el) => ({
              text: el.text,
              href: el.href,
              symbol: extracrtSymbolFromURL(el.href),
            }))
          );
        }

        // Create a fake textarea to copy the tickers to the clipboard
        createFakeTextAreaToCopyText(
          [...removeDuplicateTickers(allTickersArray)].join(", ")
        );
        replaceButtonText("add-to-watchlist");
        return;
      }

      let allTickersArray = [];
      let allTags = [];
      const numberOfPages = getPaginationLength();
      await goToFirstPage();

      // Iterate through each page
      for (let i = 0; i < numberOfPages; i++) {
        if (i > 0) {
          await delay(200);
        }

        // Capture immutable snapshots (text + href) for this page
        allTags.push(
          Array.from(document.querySelectorAll('a[href^="/stocks-new"]')).map(
            (a) => ({ text: (a.textContent || "").trim(), href: a.href })
          )
        );

        nextPage();
      }
      // Flatten the array of page snapshots
      const allTickers = allTags.flat();
      // Extract the symbols from the URLs and add them to the tickers array
      allTickers.forEach((ticker) => {
        allTickersArray.push(
          replaceSpecialCharsWithUnderscore(
            extractSymbolFromTradingViewURL(ticker.href)
          )
        );
      });
      // Add "NSE:" prefix to the tickers
      allTickersArray = addColonNSEtoTickers(allTickersArray);
      if (ENABLE_TICKER_SYMBOL_LOGS) {
        console.log(
          "Element->Symbol",
          allTickers.map((el) => ({
            text: el.text,
            href: el.href,
            symbol: extractSymbolFromTradingViewURL(el.href),
          }))
        );
      }

      // Create a fake textarea to copy the tickers to the clipboard
      createFakeTextAreaToCopyText(
        [...removeDuplicateTickers(allTickersArray)].join(", ")
      );
      replaceButtonText("add-to-watchlist");
    }
  );
}

/**
 * Replaces the text of a button with a success message and then restores it after a delay.
 * @param {string} buttonId - The ID of the button.
 */
function replaceButtonText(buttonId) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  button.innerHTML = "Copied to clipboard 📋";
  setTimeout(() => {
    button.innerHTML = "Copy to TradingView";
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

// Collect tickers exactly like copyAllTickersOnScreen but return snapshots and tickers
async function collectAllTickersSnapshots() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { message: "getChartRedirectState" },
      async function (response) {
        let allTags = [];
        let allTickersArray = [];
        const numberOfPages = getPaginationLength();

        if (response.chartRedirectState) {
          for (let i = 0; i < numberOfPages; i++) {
            if (i > 0) await delay(200);
            allTags.push(
              Array.from(
                document.querySelectorAll(
                  'a[href^="https://in.tradingview.com/chart/?symbol=NSE:"]'
                )
              ).map((a) => ({
                text: (a.textContent || "").trim(),
                href: a.href,
              }))
            );
            nextPage();
          }
          const allTickers = allTags.flat();
          allTickers.forEach((ticker) => {
            allTickersArray.push(
              replaceSpecialCharsWithUnderscore(
                extracrtSymbolFromURL(ticker.href)
              )
            );
          });
        } else {
          for (let i = 0; i < numberOfPages; i++) {
            if (i > 0) await delay(200);
            allTags.push(
              Array.from(
                document.querySelectorAll('a[href^="/stocks-new"]')
              ).map((a) => ({
                text: (a.textContent || "").trim(),
                href: a.href,
              }))
            );
            nextPage();
          }
          const allTickers = allTags.flat();
          allTickers.forEach((ticker) => {
            allTickersArray.push(
              replaceSpecialCharsWithUnderscore(
                extractSymbolFromTradingViewURL(ticker.href)
              )
            );
          });
        }

        allTickersArray = addColonNSEtoTickers(allTickersArray);
        resolve({
          snapshots: allTags.flat(),
          tickers: removeDuplicateTickers(allTickersArray),
        });
      }
    );
  });
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

// Add shortcut checkbox next to buttons
function addShortcutCheckbox() {
  const screenerButtons = document.getElementsByClassName(screenerButtonsClass);
  if (screenerButtons.length === 0) return;
  const parent = screenerButtons[0];
  if (document.getElementById(SHORTCUT_CHECKBOX_ID)) return;
  const label = document.createElement("label");
  label.style.marginLeft = "8px";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.id = SHORTCUT_CHECKBOX_ID;
  cb.style.marginRight = "4px";
  label.appendChild(cb);
  label.appendChild(
    document.createTextNode("Enable shortcut (Cmd/Ctrl+Shift+C)")
  );
  parent.appendChild(label);
  cb.addEventListener("change", () => {
    enableShortcutCopyState = cb.checked;
    chrome.storage.sync.set({
      [STORAGE_KEY_ENABLE_SHORTCUT]: enableShortcutCopyState,
    });
  });
}

// Initialize shortcut state and keybinding
function initShortcutCheckbox() {
  chrome.storage.sync.get([STORAGE_KEY_ENABLE_SHORTCUT], (res) => {
    enableShortcutCopyState = Boolean(res[STORAGE_KEY_ENABLE_SHORTCUT]);
    const cb = document.getElementById(SHORTCUT_CHECKBOX_ID);
    if (cb) cb.checked = enableShortcutCopyState;
  });

  window.addEventListener("keydown", (e) => {
    if (!enableShortcutCopyState) return;
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (mod && e.shiftKey && (e.key === "C" || e.key === "c")) {
      e.preventDefault();
      copyAllTickersOnScreen();
    }
  });
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
 * Adds copy buttons to the TradingView charts.
 */
const addCopyBtOnTradingView = () => {
  const copyBts = document.querySelectorAll('div[title="Copy widget"]');
  copyBts.forEach((copyBt) => {
    copyBt.style.fontSize = "20px";

    // Replace the original element with a clone to remove all event listeners
    const newCopyBt = copyBt.cloneNode(true);
    copyBt.parentNode.replaceChild(newCopyBt, copyBt);

    newCopyBt.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const tables =
        newCopyBt.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.querySelector(
          "table"
        );
      const allTickers = tables.querySelectorAll(
        'a[href^="https://in.tradingview.com/chart/?symbol=NSE:"]'
      );
      let allTickersArray = [];

      allTickers.forEach((ticker) => {
        allTickersArray.push(
          replaceSpecialCharsWithUnderscore(ticker.href.substring(45))
        );
      });

      allTickersArray = addColonNSEtoTickers(allTickersArray);
      createFakeTextAreaToCopyText(
        removeDuplicateTickers(allTickersArray).join(",")
      );

      // Use the existing button update logic instead of alert
      alert("Copied to clipboard 📋");

      return false;
    };
  });
};

// Add copy buttons to the TradingView charts
addCopyBtOnTradingView();

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
