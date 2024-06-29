const AWS = require("aws-sdk");
const s3 = new AWS.S3();

const bucketName = "chartink-to-tradingview"; // Replace with your bucket name
const jsonFileName = "data.json"; // Replace with your JSON file name

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

  try {
    // Read the JSON file from S3
    const s3Params = {
      Bucket: bucketName,
      Key: jsonFileName,
    };
    const data = await s3.getObject(s3Params).promise();
    const jsonData = JSON.parse(data.Body.toString("utf-8"));

    // Find the exchange token for the given trading symbol
    const tradingData = jsonData.find(
      (item) => item.tradingsymbol === tradingSymbol
    );

    if (!tradingData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Trading symbol not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ instrument_token: tradingData.instrument_token }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error: " + error.message,
      }),
    };
  }
};
