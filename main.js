window.onload = function () {
  changeURL();
};

const dateHeader = `### ${new Date().toLocaleDateString("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
})}`;

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

// Observe the document body for changes
observer.observe(document.body, config);

const screenerButtonsClass = "btn btn-default btn-primary";

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
  const screenerButtonsParent = screenerButtons[0].parentNode;
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
  "btn btn-default btn-primary",
  "add-to-watchlist",
  copyAllTickersOnScreen
);

/**
 * Gets the length of the pagination.
 * @returns {number} - The length of the pagination.
 */
function getPaginationLength() {
  const paginationList = document
    .getElementsByClassName("pagination")[0]
    .getElementsByTagName("li");

  return paginationList[paginationList.length - 2].innerText;
}

// Clicks the next page button
function nextPage() {
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

        // Iterate through each page
        for (let i = 0; i < numberOfPages; i++) {
          if (i > 0) {
            await delay(200);
          }

          // Find all tags with href starting with "https://in.tradingview.com/chart/?symbol=NSE:"
          allTags.push(
            document.querySelectorAll(
              'a[href^="https://in.tradingview.com/chart/?symbol=NSE:"]'
            )
          );

          nextPage();
        }

        // Flatten the array of tags
        const allTickers = allTags.map((tag) => Array.from(tag)).flat();

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

      console.log(numberOfPages);
      // Iterate through each page
      for (let i = 0; i < numberOfPages; i++) {
        if (i > 0) {
          await delay(200);
        }

        allTags.push(document.querySelectorAll('a[href^="/stocks-new"]'));

        nextPage();
      }
      console.log(allTags);
      // Flatten the array of tags
      const allTickers = allTags.map((tag) => Array.from(tag)).flat();
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
  const copyBts = document.querySelectorAll('i[class="far fa-copy mr-1"]');
  copyBts.forEach((copyBt) => {
    copyBt.style.fontSize = "20px";
    copyBt.onclick = (e) => {
      e.stopPropagation();
      const tables =
        copyBt.parentNode.parentNode.parentNode.parentNode.parentNode.querySelector(
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
      alert("Copied to clipboard 📋");
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
