window.onload = function () {
  changeURL();
};

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
const screenerButtonsParentDiv = "dt-buttons btn-group"

// chart ink screener button class
const screenerButtonsClass = "btn btn-default btn-primary"

// add a button to the screener
const addScreenerButton = (buttonText, buttonClass, buttonId, buttonFunction) => {
  const screenerButtons = document.getElementsByClassName(screenerButtonsClass);
  if(screenerButtons.length === 0) return;
  const screenerButtonsParent = screenerButtons[0].parentNode;
  const screenerButton = document.createElement("button");
  screenerButton.innerHTML = buttonText;
  screenerButton.className = buttonClass;
  screenerButton.id = buttonId;
  screenerButton.onclick = buttonFunction;
  screenerButtonsParent.appendChild(screenerButton);
}

// add a button to the screener
addScreenerButton("Copy to TradingView", "btn btn-default btn-primary", "add-to-watchlist", copyAllTickersOnScreen)

function copyAllTickersOnScreen() {
// get all a tags with href starting with tradingview
  const allTickers = document.querySelectorAll('a[href^="https://in.tradingview.com/chart/?symbol=NSE:"]');
  const allTickersArray = [];

  // get all tickers from the a tags
  allTickers.forEach((ticker) => {
    allTickersArray.push(replaceSpecialCharsWithUnderscore(ticker.href.substring(45)));
  });
  createFakeTextAreaToCopyText(removeDuplicateTickers(allTickersArray).join(","));
  replaceButtonText("add-to-watchlist", );
  
}

// replace button text for 2 seconds
function replaceButtonText(buttonId) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  console.log(button.innerHTML)
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

// dashboard ui 
const dashboardSectionHeadingDivParent = "flex flex-col";

// add a copy bt to the dashboard section heading
const addCopyBtOnTradingView = (sectionHeadingDivParent) => {
  const dashboardSectionHeadingDiv = document.getElementsByClassName(sectionHeadingDivParent);
  for (let i = 0; i < dashboardSectionHeadingDiv.length; i++) {
    const dashboardSectionHeading = dashboardSectionHeadingDiv[i];
    if (dashboardSectionHeading.children[0].tagName !== "H1") continue;
    const copyEmoji = document.createElement("button");
    copyEmoji.innerHTML = "Copy to Trading View 📋";
    copyEmoji.className = "add-to-watchlist";
    copyEmoji.style = "font-size:14px; cursor: pointer; background-color: #f5f5f5; padding: 5px; border-radius: 5px;"
    copyEmoji.id = `add-to-watchlist`;
    copyEmoji.onclick = () => { 
      copyAllTickersOnScreen();
      alert("Copied to clipboard 📋");
    }
    dashboardSectionHeading.appendChild(copyEmoji);
  }
}
addCopyBtOnTradingView(dashboardSectionHeadingDivParent);