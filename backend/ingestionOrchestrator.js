const {
  ingestGovernmentRainfallData,
} = require("./governmentDataIngestion");
const { ingestWeatherApi } = require("./dataIngestion");
const { ingestIMDRSS } = require("./imdRssIngestion");
const { ingestPublicWebWeather } = require("./publicWebIngestion");
const { ingestSocialWeather } = require("./socialWeatherIngestion");
const { updateSourceStatus } = require("./sourceRegistry");

async function runOrchestrator() {
  const summary = {
    timestamp: new Date().toISOString(),
    sources: [],
  };

  // GOVERNMENT DATASET
  try {
    const gov = ingestGovernmentRainfallData();

    const count = (gov.inserted || 0) + (gov.skipped || 0);

    updateSourceStatus("government_dataset", new Date().toISOString(), count, "healthy");

    summary.sources.push({
      id: "government_dataset",
      name: "Government Public Dataset",
      success: true,
      collected: count,
      details: gov,
    });
  } catch (err) {
    updateSourceStatus("government_dataset", new Date().toISOString(), 0, "error");

    summary.sources.push({
      id: "government_dataset",
      name: "Government Public Dataset",
      success: false,
      error: err.message,
    });
  }

  // WEATHER API (Open-Meteo ingestion)
  try {
    const w = await ingestWeatherApi();

    updateSourceStatus("open_meteo", new Date().toISOString(), 1, "healthy");

    summary.sources.push({
      id: "open_meteo",
      name: "Open-Meteo",
      success: true,
      collected: 1,
      details: w,
    });
  } catch (err) {
    updateSourceStatus("open_meteo", new Date().toISOString(), 0, "error");

    summary.sources.push({
      id: "open_meteo",
      name: "Open-Meteo",
      success: false,
      error: err.message,
    });
  }

  // IMD RSS
  try {
    const imd = await ingestIMDRSS();

    updateSourceStatus("web_sources", new Date().toISOString(), imd.inserted || 0, "healthy");

    summary.sources.push({
      id: "web_sources",
      name: "IMD RSS / Public Web",
      success: true,
      collected: imd.inserted || 0,
      details: imd,
    });
  } catch (err) {
    updateSourceStatus("web_sources", new Date().toISOString(), 0, "error");

    summary.sources.push({
      id: "web_sources",
      name: "IMD RSS / Public Web",
      success: false,
      error: err.message,
    });
  }

  // PUBLIC WEB (separate module may also update web_sources)
  try {
    const web = await ingestPublicWebWeather();

    updateSourceStatus("web_sources", new Date().toISOString(), web.inserted || 0, "healthy");

    summary.sources.push({
      id: "public_web",
      name: "Public Web Sources",
      success: true,
      collected: web.inserted || 0,
      details: web,
    });
  } catch (err) {
    // keep web_sources updated already above
    summary.sources.push({
      id: "public_web",
      name: "Public Web Sources",
      success: false,
      error: err.message,
    });
  }

  // SOCIAL FEED
  try {
    const social = await ingestSocialWeather();

    const collected = social.collected || 0;

    updateSourceStatus("social_feed", new Date().toISOString(), collected, "healthy");

    summary.sources.push({
      id: "social_feed",
      name: "Weather Social Feed",
      success: true,
      collected,
      details: social,
    });
  } catch (err) {
    updateSourceStatus("social_feed", new Date().toISOString(), 0, "error");

    summary.sources.push({
      id: "social_feed",
      name: "Weather Social Feed",
      success: false,
      error: err.message,
    });
  }

  return summary;
}

module.exports = {
  runOrchestrator,
};
