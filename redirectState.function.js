function attachToRedirectStateSetting() {
  var redirectStateSetting = document.getElementById("redirect");
  // redirect element is a input with type checkbox, if its checked then send message to background script
  // to set chartRedirect state to true
  redirectStateSetting.addEventListener("change", function () {
    if (this.checked) {
      chrome.runtime.sendMessage({
        message: "setChartRedirectState",
        state: true,
      });
    } else {
      chrome.runtime.sendMessage({
        message: "setChartRedirectState",
        state: false,
      });
    }
  });
}

// execute the function on dom content loaded
document.addEventListener("DOMContentLoaded", attachToRedirectStateSetting);

function updateCheckBoxState() {
  // get the state and update the checkbox
  chrome.runtime.sendMessage(
    { message: "getChartRedirectState" },
    function (response) {
      console.log(response);
      if (response.chartRedirectState) {
        document.getElementById("redirect").defaultChecked = true;
      } else {
        document.getElementById("redirect").defaultChecked = false;
      }
    }
  );
}

// execute the function on dom content loaded
document.addEventListener("DOMContentLoaded", updateCheckBoxState);

// KITE REDIRECT BT

function attachToKiteBt() {
  var kiteBtState = document.getElementById("kite-bt");
  // redirect element is a input with type checkbox, if its checked then send message to background script
  // to set chartRedirect state to true
  kiteBtState.addEventListener("change", function () {
    if (this.checked) {
      chrome.runtime.sendMessage({
        message: "setKiteEnabled",
        state: true,
      });
    } else {
      chrome.runtime.sendMessage({
        message: "setKiteEnabled",
        state: false,
      });
    }
  });
}

// execute the function on dom content loaded
document.addEventListener("DOMContentLoaded", attachToKiteBt);

function updateKiteCheckBoxState() {
  // get the state and update the checkbox
  chrome.runtime.sendMessage(
    { message: "getKiteEnabled" },
    function (response) {
      console.log(response);
      if (response.kiteEnabled) {
        document.getElementById("kite-bt").defaultChecked = true;
      } else {
        document.getElementById("kite-bt").defaultChecked = false;
      }
    }
  );
}

// execute the function on dom content loaded
document.addEventListener("DOMContentLoaded", updateKiteCheckBoxState);
