// TEMPORARY SOLUTION TO GET BACKTESTING RESULTS REDIRECTED TO TRADINGVIEW

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    // check if the chartRedirect state is true
    getChartRedirectState().then((result) => {
      if (!result.chartRedirect) {
        return;
      }
      if (result.chartRedirect) {
        // only trigger if the url begins with https://chartink.com/stocks/

        if (changeInfo.url.includes("https://chartink.com/stocks/")) {
          // stockSymbol is the part after https://chartink.com/stocks/ and before .html
          const stockSymbol = changeInfo.url
            .replace("https://chartink.com/stocks/", "")
            .replace(".html", "");

          chrome.tabs.update(tabId, {
            url: "https://in.tradingview.com/chart/?symbol=NSE:" + stockSymbol,
          });
        }
      }
    });
  }
});

// function to store chart redirect setting state in local storage
function setChartRedirectState(state) {
  chrome.storage.local.set({ chartRedirect: state });
}
// getter
function getChartRedirectState() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get("chartRedirect", (result) => {
      resolve(result.chartRedirect);
    });
  });
}

function getKiteEnabled() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get("kiteEnabled", (result) => {
      resolve(result.kiteEnabled);
    });
  });
}

function setKiteEnabled(state) {
  console.log("setting state", state);
  chrome.storage.local.set({ kiteEnabled: state });
}

// listener to listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "getChartRedirectState") {
    getChartRedirectState().then((result) => {
      sendResponse({ chartRedirectState: result });
    });
    return true;
  } else if (request.message === "setChartRedirectState") {
    setChartRedirectState(request.state);
    return true;
  } else if (request.message === "redirectToKite") {
    const symbol = extractSymbolFromTradingViewURL(request.href);
    // get the instrument token for the symbol
    getSymbolInfoFromCDN(symbol).then((symbolInfo) => {
      // open the kite chart with the instrument token
      chrome.tabs.create({
        url: `https://kite.zerodha.com/chart/web/tvc/NSE/${symbol.toUpperCase()}/${
          symbolInfo.instrument_token
        }`,
      });
    });
  }
  return true;
});
function extractSymbolFromTradingViewURL(url) {
  return url.split("/")[4].split(":")[1];
}

function getSymbolInfoFromCDN(symbol) {
  // https://d1t7yromaetmio.cloudfront.net/default/chartink-kite-symbol-matcher?tradingsymbol=
  return fetch(
    `https://d1t7yromaetmio.cloudfront.net/default/chartink-kite-symbol-matcher?tradingsymbol=${symbol}`
  ).then((response) => response.json());
  // This will return
  //  {
  //   "instrument_token": "139284740"
  // }
}
// on install set the chartRedirect state to true (maintain legacy functionality)
chrome.runtime.onInstalled.addListener(() => {
  setChartRedirectState(true);
});
