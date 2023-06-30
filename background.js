// TEMPORARY SOLUTION TO GET BACKTESTING RESULTS REDIRECTED TO TRADINGVIEW

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
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

          browser.tabs.update(tabId, {
            url: "https://in.tradingview.com/chart/?symbol=NSE:" + stockSymbol,
          });
        }
      }
    });
  }
});

// function to store chart redirect setting state in local storage
function setChartRedirectState(state) {
  browser.storage.local.set({ chartRedirect: state });
}
// getter
function getChartRedirectState() {
  return new Promise((resolve, reject) => {
    browser.storage.local.get("chartRedirect", (result) => {
      resolve(result.chartRedirect);
    });
  });
}

// listener to listen for messages from popup.js
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "getChartRedirectState") {
    getChartRedirectState().then((result) => {
      sendResponse({ chartRedirectState: result });
    });
    return true;
  } else if (request.message === "setChartRedirectState") {
    setChartRedirectState(request.state);
    return true;
  }
  return true;
});
// on install set the chartRedirect state to true (maintain legacy functionality)
browser.runtime.onInstalled.addListener(() => {
  setChartRedirectState(true);
});
