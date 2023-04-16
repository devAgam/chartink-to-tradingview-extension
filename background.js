// TEMPORARY SOLUTION TO GET BACKTESTING RESULTS REDIRECTED TO TRADINGVIEW

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
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
