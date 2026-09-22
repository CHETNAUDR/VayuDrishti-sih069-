export default function LiveSummary({ weather }: { weather?: any[] }) {
  const top = (weather && weather[0]) || {
    city: 'New Delhi',
    state: 'Delhi',
    temperature_c: 32.4,
    feels_like_c: 36.8,
    humidity: 58,
    wind_speed_kmh: 12.6,
    precipitation_mm: 0,
    weather: 'Partly Cloudy',
  };

  return (
    <div className="live-summary-card">
      <div className="summary-header-row">
        <div>
          <div className="summary-city">{top.city}</div>
          <div className="summary-state">{top.state}</div>
        </div>
        <span className="summary-live-badge">LIVE</span>
      </div>

      <div className="summary-main-row">
        <div>
          <div className="condition">{top.weather}</div>
          <div className="temp">{Math.round(top.temperature_c)}°C</div>
          <div className="feels">Feels like {top.feels_like_c}°C</div>
        </div>
        <div className="weather-mini-icon">☁</div>
      </div>

      <div className="summary-right">
        <div className="metric">
          <div className="m-title">Humidity</div>
          <div className="m-value">{top.humidity}%</div>
        </div>
        <div className="metric">
          <div className="m-title">Wind</div>
          <div className="m-value">{top.wind_speed_kmh} km/h</div>
        </div>
        <div className="metric">
          <div className="m-title">Precip</div>
          <div className="m-value">{top.precipitation_mm} mm</div>
        </div>
      </div>
    </div>
  );
}
