const https = require("https");
const db = require("./database");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            if (response.statusCode < 200 || response.statusCode >= 300) {
              reject(
                new Error(`Request failed with status ${response.statusCode}`)
              );
              return;
            }

            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function ingestWeatherApi() {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=26.9124" +
    "&longitude=75.7873" +
    "&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m" +
    "&timezone=Asia%2FKolkata";

  const data = await fetchJson(url);

  const weather = data.current;

  const title = `Live Weather Update - Jaipur`;

  const description =
    `Temperature ${weather.temperature_2m}°C, ` +
    `humidity ${weather.relative_humidity_2m}%, ` +
    `rain ${weather.rain} mm, ` +
    `wind ${weather.wind_speed_10m} km/h`;

  const result = db
    .prepare(`
      INSERT INTO reports (
        source_type,
        source_name,
        title,
        description,
        event_category,
        severity,
        city,
        state,
        latitude,
        longitude,
        event_time,
        source_credibility,
        verification_status,
        raw_data
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      "weather_api",
      "Open-Meteo",
      title,
      description,
      "weather update",
      "medium",
      "Jaipur",
      "Rajasthan",
      26.9124,
      75.7873,
      weather.time,
      0.85,
      "pending",
      JSON.stringify(weather)
    );

  return {
    success: true,
    report_id: result.lastInsertRowid,
    source_type: "weather_api",
    source_name: "Open-Meteo",
    city: "Jaipur",
    state: "Rajasthan",
    weather,
  };
}

module.exports = {
  ingestWeatherApi,
};