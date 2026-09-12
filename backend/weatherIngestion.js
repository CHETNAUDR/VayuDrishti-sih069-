const https = require("https");

function fetchWeather(latitude, longitude) {
  return new Promise((resolve, reject) => {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m` +
      `&timezone=auto`;

    https.get(url, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        try {
          const result = JSON.parse(data);

          if (response.statusCode !== 200) {
            reject(
              new Error(
                result.reason || "Weather API request failed"
              )
            );
            return;
          }

          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", (error) => {
      reject(error);
    });
  });
}

async function getIndiaWeather() {
  try {
    const cities = [
      {
        city: "Delhi",
        state: "Delhi",
        latitude: 28.6139,
        longitude: 77.2090,
      },
      {
        city: "Mumbai",
        state: "Maharashtra",
        latitude: 19.0760,
        longitude: 72.8777,
      },
      {
        city: "Jaipur",
        state: "Rajasthan",
        latitude: 26.9124,
        longitude: 75.7873,
      },
      {
        city: "Kolkata",
        state: "West Bengal",
        latitude: 22.5726,
        longitude: 88.3639,
      },
      {
        city: "Chennai",
        state: "Tamil Nadu",
        latitude: 13.0827,
        longitude: 80.2707,
      },
      {
        city: "Bengaluru",
        state: "Karnataka",
        latitude: 12.9716,
        longitude: 77.5946,
      },
    ];

    const results = [];

    for (const location of cities) {
      const weather = await fetchWeather(
        location.latitude,
        location.longitude
      );

      results.push({
        ...location,
        weather: weather.current,
      });
    }

    return results;
  } catch (error) {
    console.error("Weather ingestion error:", error.message);
    return [];
  }
}

module.exports = {
  fetchWeather,
  getIndiaWeather,
};