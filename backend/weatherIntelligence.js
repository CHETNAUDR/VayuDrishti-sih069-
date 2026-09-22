const cities = [
  { city: "Delhi", state: "Delhi", lat: 28.6139, lon: 77.2090 },
  { city: "Mumbai", state: "Maharashtra", lat: 19.0760, lon: 72.8777 },
  { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lon: 75.7873 },
  { city: "Udaipur", state: "Rajasthan", lat: 24.5854, lon: 73.7125 },
  { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lon: 72.5714 },
  { city: "Kolkata", state: "West Bengal", lat: 22.5726, lon: 88.3639 },
  { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707 },
  { city: "Bengaluru", state: "Karnataka", lat: 12.9716, lon: 77.5946 },
  { city: "Hyderabad", state: "Telangana", lat: 17.3850, lon: 78.4867 },
  { city: "Pune", state: "Maharashtra", lat: 18.5204, lon: 73.8567 },
  { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lon: 80.9462 },
  { city: "Patna", state: "Bihar", lat: 25.5941, lon: 85.1376 },
  { city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lon: 77.4126 },
  { city: "Chandigarh", state: "Chandigarh", lat: 30.7333, lon: 76.7794 },
  { city: "Srinagar", state: "Jammu and Kashmir", lat: 34.0837, lon: 74.7973 },
  { city: "Dehradun", state: "Uttarakhand", lat: 30.3165, lon: 78.0322 },
  { city: "Guwahati", state: "Assam", lat: 26.1445, lon: 91.7362 },
  { city: "Bhubaneswar", state: "Odisha", lat: 20.2961, lon: 85.8245 },
  { city: "Ranchi", state: "Jharkhand", lat: 23.3441, lon: 85.3096 },
  { city: "Raipur", state: "Chhattisgarh", lat: 21.2514, lon: 81.6296 }
];

function weatherDescription(code) {
  const descriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Light rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Light snowfall",
    73: "Moderate snowfall",
    75: "Heavy snowfall",
    80: "Rain showers",
    81: "Moderate rain showers",
    82: "Heavy rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail"
  };

  return descriptions[code] || "Unknown weather";
}

async function getIndiaLiveWeather() {
  const results = [];

  for (const city of cities) {
    try {
      const url =
        "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${city.lat}` +
        `&longitude=${city.lon}` +
        "&current=temperature_2m,relative_humidity_2m," +
        "apparent_temperature,precipitation,weather_code," +
        "wind_speed_10m" +
        "&timezone=auto";

      const response = await fetch(url);

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const current = data.current;

      if (!current) {
        continue;
      }

      results.push({
        city: city.city,
        state: city.state,
        latitude: city.lat,
        longitude: city.lon,

        temperature_c: current.temperature_2m,
        feels_like_c: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        precipitation_mm: current.precipitation,
        wind_speed_kmh: current.wind_speed_10m,

        weather_code: current.weather_code,
        weather: weatherDescription(current.weather_code),

        observed_at: current.time,

        source: "Open-Meteo"
      });
    } catch (error) {
      console.error(
        `Weather fetch failed for ${city.city}:`,
        error.message
      );
    }
  }

  return results;
}

module.exports = {
  getIndiaLiveWeather
};