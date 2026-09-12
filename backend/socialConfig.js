require("dotenv").config();

module.exports = {
  enabled: process.env.SOCIAL_FEED_ENABLED === "true",

  instanceUrl: process.env.SOCIAL_INSTANCE_URL || "",

  accessToken: process.env.SOCIAL_ACCESS_TOKEN || "",

  hashtags: [
    "IMD",
    "Weather",
    "Rainfall",
    "Flood",
    "Thunderstorm",
    "Heatwave",
    "Fog",
    "DustStorm",
    "StrongWinds",
  ],
};