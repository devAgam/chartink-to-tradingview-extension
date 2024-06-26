const fs = require("fs");

exports.handler = async (event) => {
  let tradingSymbol;

  // Check if the event is from API Gateway with query parameters
  if (
    event.queryStringParameters &&
    event.queryStringParameters.tradingsymbol
  ) {
    tradingSymbol = event.queryStringParameters.tradingsymbol;
  } else if (event.body) {
    // Parse the body if the event is from an HTTP POST request
    const body = JSON.parse(event.body);
    tradingSymbol = body.tradingsymbol;
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Bad Request: No tradingsymbol provided" }),
    };
  }

  // Read the JSON file
  const data = JSON.parse(fs.readFileSync("data.json", "utf8"));

  // Find the exchange token for the given trading symbol
  const tradingData = data.find((item) => item.tradingsymbol === tradingSymbol);

  if (!tradingData) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Trading symbol not found" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ exchange_token: tradingData.exchange_token }),
  };
};
