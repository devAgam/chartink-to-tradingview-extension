const CHARTINK_STOCKS_URL = "https://chartink.com/stocks/";
const TRADINGVIEW_BASE_URL = "https://in.tradingview.com/chart/?symbol=NSE:";
const KITE_BASE_URL_TVC = "https://kite.zerodha.com/chart/web/tvc/NSE/";
const KITE_BASE_URL_CIQ = "https://kite.zerodha.com/chart/web/ciq/NSE/";

// Add a listener for when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    handleTabUpdate(tabId, changeInfo.url);
  }
});

// Handle tab update events
async function handleTabUpdate(tabId, url) {
  const chartRedirect = await getChartRedirectState();
  if (chartRedirect && url.startsWith(CHARTINK_STOCKS_URL)) {
    const stockSymbol = extractStockSymbolFromChartinkURL(url);
    redirectToTradingView(tabId, stockSymbol);
  }
}

// Extract stock symbol from Chartink URL
function extractStockSymbolFromChartinkURL(url) {
  return url.replace(CHARTINK_STOCKS_URL, "").replace(".html", "");
}

// Redirect to TradingView
function redirectToTradingView(tabId, stockSymbol) {
  chrome.tabs.update(tabId, { url: `${TRADINGVIEW_BASE_URL}${stockSymbol}` });
}

// Store chart redirect setting state in local storage
function setChartRedirectState(state) {
  chrome.storage.local.set({ chartRedirect: state });
}

// Get chart redirect setting state from local storage
function getChartRedirectState() {
  return new Promise((resolve) => {
    chrome.storage.local.get("chartRedirect", (result) => {
      resolve(result.chartRedirect);
    });
  });
}

// Get Kite enabled state from local storage
function getKiteEnabled() {
  return new Promise((resolve) => {
    chrome.storage.local.get("kiteEnabled", (result) => {
      resolve(result.kiteEnabled);
    });
  });
}

// Set Kite enabled state in local storage
function setKiteEnabled(state) {
  console.log("setting state", state);
  chrome.storage.local.set({ kiteEnabled: state });
}

// Get Kite chart type state from local storage
function getKiteChartType() {
  return new Promise((resolve) => {
    chrome.storage.local.get("kiteChartType", (result) => {
      resolve(result.kiteChartType || "tvc"); // default to 'tvc' if not set
    });
  });
}

// Set Kite chart type state in local storage
function setKiteChartType(type) {
  console.log("setting chart type", type);
  chrome.storage.local.set({ kiteChartType: type });
}

// Listener to listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleRuntimeMessage(request, sendResponse);
  return true;
});

// Handle runtime messages
async function handleRuntimeMessage(request, sendResponse) {
  switch (request.message) {
    case "getChartRedirectState":
      const chartRedirectState = await getChartRedirectState();
      sendResponse({ chartRedirectState });
      break;
    case "setChartRedirectState":
      setChartRedirectState(request.state);
      break;
    case "redirectToKite":
      const symbol = extractSymbolFromTradingViewURL(request.href);
      const symbolInfo = await getSymbolInfoFromCDN(symbol);
      redirectToKite(symbol, symbolInfo.instrument_token);
      break;
    case "getKiteEnabled":
      const kiteEnabled = await getKiteEnabled();
      sendResponse({ kiteEnabled });
      break;
    case "setKiteEnabled":
      setKiteEnabled(request.state);
      break;
    case "getKiteChartType":
      const kiteChartType = await getKiteChartType();
      sendResponse({ kiteChartType });
      break;
    case "setKiteChartType":
      setKiteChartType(request.type);
      break;
    default:
      break;
  }
}

// Extract symbol from TradingView URL
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

// Get symbol info from CDN
function getSymbolInfoFromCDN(symbol) {
  return fetch(
    `https://d1t7yromaetmio.cloudfront.net/default/chartink-kite-symbol-matcher?tradingsymbol=${symbol}`
  ).then((response) => response.json());
}

// Redirect to Kite
async function redirectToKite(symbol, instrumentToken) {
  const kiteChartType = await getKiteChartType();
  const KITE_BASE_URL =
    kiteChartType === "ciq" ? KITE_BASE_URL_CIQ : KITE_BASE_URL_TVC;
  chrome.tabs.create({
    url: `${KITE_BASE_URL}${symbol.toUpperCase()}/${instrumentToken}`,
  });
}

// On install, set the chartRedirect and kiteEnabled states to true (maintain legacy functionality)
chrome.runtime.onInstalled.addListener(() => {
  setChartRedirectState(true);
  setKiteEnabled(true);
});
