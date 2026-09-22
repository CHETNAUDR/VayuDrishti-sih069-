const socialConfig = require("./socialConfig");

const SOURCES = [
  {
    id: "open_meteo",
    name: "Open-Meteo",
    type: "weather_api",
    status: "active",
    description: "Live weather observation API",
    last_sync: null,
records_collected: 0,
health: "healthy",
  },

  {
    id: "citizen_reports",
    name: "Citizen Reports",
    type: "citizen_report",
    status: "active",
    description: "Weather reports submitted by citizens",
     last_sync: null,
  records_collected: 0,
  health: "healthy",
  },

  {
    id: "government_dataset",
    name: "Government Public Dataset",
    type: "public_dataset",
    status: "active",
    description: "Government open weather datasets",
     last_sync: null,
  records_collected: 0,
  health: "healthy",
  },

  {
    id: "web_sources",
    name: "Public Web Sources",
    type: "web_source",
    status: "active",
    description: "Weather information from authorized public web sources",
     last_sync: null,
  records_collected: 0,
  health: "healthy",
  },

  {
    id: "social_feed",
    name: "Weather Social Feed",
    type: "social_media",
    status: "planned",
    description: "Authorized/public weather posts and hashtag feeds",
  },
];

function getSources() {
  // Return a shallow copy so callers can't mutate the internal array
  const out = JSON.parse(JSON.stringify(SOURCES));

  // Reflect social config availability
  const social = out.find((s) => s.id === "social_feed");

  if (social) {
    if (!socialConfig.enabled) {
      social.status = "configured_but_disabled";
      social.description += " (disabled in configuration)";
      social.health = "unavailable";
    } else if (!socialConfig.instanceUrl) {
      social.status = "configured_but_unavailable";
      social.description += " (instance URL or credentials missing)";
      social.health = "unavailable";
    } else {
      social.status = "active";
      social.health = social.health || "healthy";
    }
  }

  return out;
}

function updateSourceStatus(
  sourceId,
  lastSync,
  recordsCollected,
  health = "healthy"
) {
  const source = SOURCES.find(
    (item) => item.id === sourceId
  );

  if (!source) {
    return;
  }

  source.last_sync = lastSync;
  source.records_collected = recordsCollected;
  source.health = health;
}

module.exports = {
  SOURCES,
  getSources,
  updateSourceStatus,
};