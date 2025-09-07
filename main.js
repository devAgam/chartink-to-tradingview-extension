window.onload = function () {
  changeURL();
};

const dateHeader = `### ${new Date().toLocaleDateString("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
})}`;

// Feature flag: enable/disable element-to-symbol logging
const ENABLE_TICKER_SYMBOL_LOGS = false;

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
      console.log("triggering changeURL");
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
  setTimeout(changeURL, 1);
  setTimeout(changeURL, 150);
  setTimeout(changeURL, 400);
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
  mutations.forEach(function (mutation) {
    setTimeout(function () {
      changeURL();
      bindChangeUrlToPagination();
    }, 1);
  });
});

var config = {
  childList: true,
  subtree: true,
};

// Observe the document body for changes
observer.observe(document.body, config);
// Initial bind in case pagination exists on load
bindChangeUrlToPagination();

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
          console.log(
            document.querySelectorAll(
              'a[href^="https://in.tradingview.com/chart/?symbol=NSE:"]'
            )
          );
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
