function attachToRedirectStateSetting() {
  var redirectStateSetting = document.getElementById("redirect");
  // redirect element is an input with type checkbox, if it's checked then send a message to the background script
  // to set chartRedirect state to true
  redirectStateSetting.addEventListener("change", function () {
    if (this.checked) {
      browser.runtime.sendMessage({
        message: "setChartRedirectState",
        state: true,
      });
    } else {
      browser.runtime.sendMessage({
        message: "setChartRedirectState",
        state: false,
      });
    }
  });
}

// execute the function on DOM content loaded
document.addEventListener("DOMContentLoaded", attachToRedirectStateSetting);

function updateCheckBoxState() {
  // get the state and update the checkbox
  browser.runtime.sendMessage(
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

// execute the function on DOM content loaded
document.addEventListener("DOMContentLoaded", updateCheckBoxState);

// KITE REDIRECT BT

function attachToKiteBt() {
  var kiteBtState = document.getElementById("kite-bt");
  // redirect element is an input with type checkbox, if it's checked then send a message to the background script
  // to set chartRedirect state to true
  kiteBtState.addEventListener("change", function () {
    if (this.checked) {
      browser.runtime.sendMessage({
        message: "setKiteEnabled",
        state: true,
      });
    } else {
      browser.runtime.sendMessage({
        message: "setKiteEnabled",
        state: false,
      });
    }
  });
}

// execute the function on DOM content loaded
document.addEventListener("DOMContentLoaded", attachToKiteBt);

function updateKiteCheckBoxState() {
  // get the state and update the checkbox
  browser.runtime.sendMessage(
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

function attachToKiteChartType() {
  var kiteChartType = document.getElementById("chart-type");
  // redirect element is an input with type checkbox, if it's checked then send a message to the background script
  // to set chartRedirect state to true
  kiteChartType.addEventListener("change", function () {
    browser.runtime.sendMessage({
      message: "setKiteChartType",
      type: this.value,
    });
  });
}

function updateKiteChartType() {
  // get the state and update the checkbox
  browser.runtime.sendMessage(
    { message: "getKiteChartType" },
    function (response) {
      console.log(response);
      document.getElementById("chart-type").value = response.kiteChartType;
    }
  );
}

// execute the functions on DOM content loaded
document.addEventListener("DOMContentLoaded", updateKiteCheckBoxState);
document.addEventListener("DOMContentLoaded", attachToKiteChartType);
document.addEventListener("DOMContentLoaded", updateKiteChartType);
