function attachToRedirectStateSetting() {
  var redirectStateSetting = document.getElementById("redirect");
  // redirect element is a input with type checkbox, if its checked then send message to background script
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

// execute the function on dom content loaded
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

// execute the function on dom content loaded
document.addEventListener("DOMContentLoaded", updateCheckBoxState);
