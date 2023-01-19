window.onload = function () {
  var links = document.querySelectorAll('a[href^="/stocks"]');
  for (var i = 0; i < links.length; i++) {
    const baseUrl = "https://chartink.com/stocks/";
    links[i].href =
      "https://in.tradingview.com/chart/?symbol=NSE:" +
      links[i].href.substring(baseUrl.length).replace(".html", "");
  }
};
