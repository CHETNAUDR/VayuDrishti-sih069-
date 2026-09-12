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
  return SOURCES;
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