const { ingestIMDRSS } = require("./imdRssIngestion");

async function test() {
  try {
    const result = await ingestIMDRSS();

    console.log("================================");
    console.log("IMD RSS TEST RESULT");
    console.log("================================");
    console.log(result);
  } catch (error) {
    console.error("IMD RSS TEST FAILED:");
    console.error(error);
  }
}

test();