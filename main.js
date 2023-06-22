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

// chart ink screener button parent div
const screenerButtonsParentDiv = "dt-buttons btn-group";

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

function getPaginationLength() {
  const pagination = document.getElementsByClassName("pagination");
  //     count the number of li tags in the pagination
  const numOfLis = pagination[0].getElementsByTagName("li").length;

  // two of the lis are back and next buttons so subtracting 2 would get us the number of pages in the table
  const numOfPages = numOfLis - 2;
  return numOfPages;
}

function nextPage() {
  //   click <a> tag with inner text of "Next"
  document
    .evaluate(
      "//a[text()='Next']",
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    )
    .singleNodeValue.click();
}

function getNumberOfStocks() {
  // get el with class dataTables_info
  const el = document.getElementsByClassName("dataTables_info")[0];
  const innerText = el.innerText;
  //   get the first number from the inner text
  const numberOfStocks = innerText.match(/\d+/)[0];
  return numberOfStocks;
}

const delay = (t) => {
  return new Promise((res) => setTimeout(res, t));
};

async function copyAllTickersOnScreen() {
  let allTickersArray = []; // date header is added to the top of the list for trading view WL header, as request by Pattabhi Chekka

  let allTags = [];

  const numberOfPages = getPaginationLength();

  for (let i = 0; i < numberOfPages; i++) {
    // if its the second page or more, wait for 2 seconds for the anchor tags to change
    if (i > 0) {
      await delay(200);
    }

    allTags.push(
      document.querySelectorAll(
        'a[href^="https://in.tradingview.com/chart/?symbol=NSE:"]'
      )
    );

    nextPage();
  }

  // merge all arrays into one

  const allTickers = allTags.map((tag) => Array.from(tag)).flat();

  // get all tickers from the a tags
  allTickers.forEach((ticker) => {
    allTickersArray.push(
      replaceSpecialCharsWithUnderscore(ticker.href.substring(45))
    );
  });
  // add :NSE to the tickers
  allTickersArray = addColenNSEtoTickers(allTickersArray);

  createFakeTextAreaToCopyText(
    [dateHeader, ...removeDuplicateTickers(allTickersArray)].join(", ")
  );
  replaceButtonText("add-to-watchlist");
}

// replace button text for 2 seconds
function replaceButtonText(buttonId) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  console.log(button.innerHTML);
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

function addColenNSEtoTickers(tickers) {
  return tickers.map((ticker) => "NSE:" + ticker);
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
      let allTickersArray = [dateHeader];

      // get all tickers from the a tags
      allTickers.forEach((ticker) => {
        allTickersArray.push(
          replaceSpecialCharsWithUnderscore(ticker.href.substring(45))
        );
      });
      // add :NSE to the tickers
      allTickersArray = addColenNSEtoTickers(allTickersArray);
      createFakeTextAreaToCopyText(
        removeDuplicateTickers(allTickersArray).join(",")
      );
      alert("Copied to clipboard 📋");
    };
  });
};
addCopyBtOnTradingView();
