export default function WeatherCard({ item }: { item: any }) {
  return (
    <div className="weather-card">
      <h3>{item.city}</h3>
      <p style={{ marginTop: 2, color: 'var(--vd-muted)' }}>{item.state}</p>

      <div className="weather-temperature" style={{ fontWeight: 800, fontSize: 22, marginTop: 8 }}>
        {Math.round(item.temperature_c)}°C
      </div>

      <div style={{ marginTop: 8, fontSize: 13, color: 'var(--vd-text)' }}>
        <div>Feels like: {item.feels_like_c}°C</div>
        <div>Humidity: {item.humidity}%</div>
        <div>Wind: {item.wind_speed_kmh} km/h</div>
        <div>Precipitation: {item.precipitation_mm} mm</div>
      </div>

      <div style={{ marginTop: 10, color: 'var(--vd-muted)', fontSize: 12 }}>
        {item.weather} • {item.observed_at}
      </div>
    </div>
  );
}
