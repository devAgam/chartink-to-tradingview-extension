window.onload = function () {
  changeURL();
};

const dateHeader =
  "### " +
  new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function changeURL() {
  var links = document.querySelectorAll('a[href^="/stocks"]');
  for (var i = 0; i < links.length; i++) {
    const baseUrl = "https://chartink.com/stocks/";
    links[i].href =
      "https://in.tradingview.com/chart/?symbol=NSE:" +
      links[i].href.substring(baseUrl.length).replace(".html", "");
  }
}

var observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    setTimeout(function () {
      changeURL();
    }, 100);
  });
});

var config = {
  childList: true,
  subtree: true,
};

observer.observe(document.body, config);

// chart ink screener button class
const screenerButtonsClass = "btn btn-default btn-primary";

// add a button to the screener
const addScreenerButton = (
  buttonText,
  buttonClass,
  buttonId,
  buttonFunction
) => {
  const screenerButtons = document.getElementsByClassName(screenerButtonsClass);
  if (screenerButtons.length === 0) return;
  const screenerButtonsParent = screenerButtons[0].parentNode;
  const screenerButton = document.createElement("button");
  screenerButton.innerHTML = buttonText;
  screenerButton.className = buttonClass;
  screenerButton.id = buttonId;
  screenerButton.onclick = buttonFunction;
  screenerButtonsParent.appendChild(screenerButton);
};

// add a button to the screener
addScreenerButton(
  "Copy to TradingView",
  "btn btn-default btn-primary",
  "add-to-watchlist",
  copyAllTickersOnScreen
);

function copyAllTickersOnScreen() {
  // get all a tags with href starting with tradingview
  const allTickers = document.querySelectorAll(
    'a[href^="https://in.tradingview.com/chart/?symbol=NSE:"]'
  );
  const allTickersArray = [dateHeader]; // date header is added to the top of the list for trading view WL header, as request by Pattabhi Chekka

  // get all tickers from the a tags
  allTickers.forEach((ticker) => {
    allTickersArray.push(
      replaceSpecialCharsWithUnderscore(ticker.href.substring(45))
    );
  });
  createFakeTextAreaToCopyText(
    removeDuplicateTickers(allTickersArray).join(",")
  );
  replaceButtonText("add-to-watchlist");
}

// replace button text for 2 seconds
function replaceButtonText(buttonId) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  button.innerHTML = "Copied to clipboard 📋";
  setTimeout(() => {
    button.innerHTML = "Copy to TradingView";
  }, 2000);
}

function createFakeTextAreaToCopyText(text) {
  const fakeTextArea = document.createElement("textarea");
  fakeTextArea.value = text;
  document.body.appendChild(fakeTextArea);
  fakeTextArea.select();
  document.execCommand("copy");
  document.body.removeChild(fakeTextArea);
}

function removeDuplicateTickers(tickers) {
  return [...new Set(tickers)];
}

function replaceSpecialCharsWithUnderscore(ticker) {
  return ticker.replace(/[^a-zA-Z0-9]/g, "_");
}

const addCopyBtOnTradingView = () => {
  // add an onclick alert to all the <i> tags wit class "far fa-copy mr-1"
  const copyBts = document.querySelectorAll('i[class="far fa-copy mr-1"]');
  copyBts.forEach((copyBt) => {
    copyBt.style.fontSize = "20px";
    // add an onclick event
    copyBt.onclick = (e) => {
      e.stopPropagation();
      const tables =
        copyBt.parentNode.parentNode.parentNode.parentNode.parentNode.querySelector(
          "table"
        );
      const allTickers = tables.querySelectorAll(
        'a[href^="https://in.tradingview.com/chart/?symbol=NSE:"]'
      );
      const allTickersArray = [dateHeader];

      // get all tickers from the a tags
      allTickers.forEach((ticker) => {
        allTickersArray.push(
          replaceSpecialCharsWithUnderscore(ticker.href.substring(45))
        );
      });
      createFakeTextAreaToCopyText(
        removeDuplicateTickers(allTickersArray).join(",")
      );
      alert("Copied to clipboard 📋");
    };
  });
};
addCopyBtOnTradingView();
