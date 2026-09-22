import { useEffect, useRef, useState } from "react";
type LiveWeather = {
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  temperature_c: number;
  feels_like_c: number;
  humidity: number;
  precipitation_mm: number;
  wind_speed_kmh: number;
  weather_code: number;
  weather: string;
  observed_at: string;
  source: string;
};
import "./App.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import KPIStat from "./components/KPIStat";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AlertList from "./components/AlertList";

type Page =
  | "Dashboard"
  | "Live Weather"
  | "Live Events"
  | "India Map"
  | "Analytics"
  | "Reports"
  | "Admin Panel"
  | "Sources"
  | "Settings"
  | "Help";

  function LiveEvents() {

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [eventFilter, setEventFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const didAutoIMDRefresh = useRef(false);

  async function loadReports(): Promise<boolean> {
    try {
      setErrorMessage("");
      const response = await fetch(
        "http://localhost:5000/api/reports"
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const nextReports = data.reports || [];
        setReports(nextReports);
        return nextReports.length > 0;
      }

      setReports([]);
      setErrorMessage(data.message || "Reports service returned no data.");
      return false;
    } catch (error) {
      console.error("Failed to load live events:", error);
      setReports([]);
      setErrorMessage("Live reports are currently unavailable. Check backend/server status.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function refreshIMDFeed() {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/ingest/imd-rss", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "IMD ingestion failed");
      }

      await loadReports();
    } catch (error) {
      console.error("Failed to refresh IMD feed:", error);
      setErrorMessage("IMD feed refresh failed. Please check the IMD source connection.");
      setLoading(false);
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      const hasReports = await loadReports();

      if (!hasReports && !didAutoIMDRefresh.current) {
        didAutoIMDRefresh.current = true;
        await refreshIMDFeed();
      }
    };

    bootstrap();

    const interval = setInterval(() => {
      void loadReports();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const filteredReports = reports.filter((report) => {
    const eventMatch =
      eventFilter === "all" ||
      report.event_category
        ?.toLowerCase()
        .replace(/_/g, " ") ===
        eventFilter.toLowerCase();
            const severityMatch =
      severityFilter === "all" ||
      report.severity === severityFilter;

    const statusMatch =
      statusFilter === "all" ||
      report.verification_status === statusFilter;

    return eventMatch && severityMatch && statusMatch;
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>🌦️ Live Weather Events</h2>
          <p>
            Real-time weather events collected by VayuDrishti
          </p>
        </div>

        <div className="filters">
          <button className="small-button" onClick={refreshIMDFeed}>
            Refresh IMD feed
          </button>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="all">All Events</option>
            <option value="Rainfall">Rainfall</option>
            <option value="Thunderstorm">Thunderstorm</option>
            <option value="Heatwave">Heatwave</option>
            <option value="Flooding">Flooding</option>
            <option value="Fog">Fog</option>
            <option value="Dust Storm">Dust Storm</option>
            <option value="Strong Wind">Strong Wind</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="all">All Severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading live weather events...</p>
      ) : errorMessage ? (
        <p>{errorMessage}</p>
      ) : filteredReports.length === 0 ? (
        <p>No live weather events are available yet. Trigger ingestion or submit a report to populate this feed.</p>
      ) : (
        <div className="reports">
          {filteredReports.map((report) => (
            <div
              className="report-card"
              key={report.id}
            >
              <div>
                <h3>
                  {report.event_category || "Weather Event"}
                </h3>

                <p>
                  📍 {report.city || "Unknown"},{" "}
                  {report.state || "Unknown"}
                </p>

                <p>
                  🕒{" "}
                  {report.event_time
                    ? new Date(
                        report.event_time
                      ).toLocaleString()
                    : "Time unavailable"}
                </p>

                <p>
                  Source:{" "}
                  {report.source_name || "Unknown"}
                </p>
              </div>

              <div>
                <span className="status">
                  {report.severity || "medium"}
                </span>

                <span className="status">
                  {report.verification_status || "pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IndiaMapPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState("all");
  const [liveWeather, setLiveWeather] = useState<LiveWeather[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [liveSource, setLiveSource] = useState("");
  const [liveUpdated, setLiveUpdated] = useState("");
  async function loadReports() {
    try {
      const response = await fetch(
       "http://127.0.0.1:5000/api/reports"
      );

      const data = await response.json();

      if (data.success) {
        setReports(data.reports);
      }
    } catch (error) {
      console.error("Failed to load map reports:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
    loadLiveWeather();

    const interval = setInterval(() => {
      loadLiveWeather();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  async function loadLiveWeather() {
    try {
      setLoadingLive(true);
      setLiveError("");

      // Reuse recent global cache if available to avoid duplicate requests
      const cache = (window as any).__VAYU_LIVE_WEATHER;
      if (cache && cache.ts && Date.now() - cache.ts < 2 * 60 * 1000) {
        setLiveWeather(cache.weather || []);
        setLiveSource(cache.generated_at || cache.source || "");
        setLiveUpdated(cache.generated_at || "");
        return;
      }

      const resp = await fetch(
        "http://localhost:5000/api/weather/india-live"
      );

      const data = await resp.json();

      if (!data || !data.success) {
        setLiveError("Live weather temporarily unavailable.");
        setLiveWeather([]);
        setLiveSource("");
        setLiveUpdated("");
        return;
      }

      setLiveWeather(data.weather || []);
      setLiveSource(data.source || "");
      setLiveUpdated(data.generated_at || "");
      try {
        (window as any).__VAYU_LIVE_WEATHER = {
          weather: data.weather,
          generated_at: data.generated_at || new Date().toISOString(),
          ts: Date.now(),
        };
      } catch (e) {}
    } catch (error) {
      console.error("IndiaMapPage live weather error:", error);
      setLiveError("Live weather temporarily unavailable.");
      setLiveWeather([]);
      setLiveSource("");
      setLiveUpdated("");
    } finally {
      setLoadingLive(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>🗺️ India Weather Map</h2>
          <p>
            Weather events by location
          </p>
        </div>
      </div>
      <select
  value={eventFilter}
  onChange={(e) => setEventFilter(e.target.value)}
  className="event-filter"
>
  <option value="all">All Events</option>
  <option value="rainfall">Rainfall</option>
  <option value="thunderstorm">Thunderstorm</option>
  <option value="flooding">Flooding</option>
  <option value="heatwave">Heatwave</option>
  <option value="strong_wind">Strong Wind</option>
</select>

      {loading ? (
        <p>Loading weather map...</p>
      ) : (
        <>
          <div className="live-data-label">
            <span className="live-dot"></span>
            <strong>LIVE WEATHER DATA</strong>
            <span style={{ marginLeft: 12 }}>
              Source: {liveSource || "Open-Meteo"}
            </span>
            <span style={{ marginLeft: 12 }}>
              Updated: {liveUpdated ? new Date(liveUpdated).toLocaleString() : "-"}
            </span>
            {loadingLive && (
              <span style={{ marginLeft: 12 }}>Loading live weather...</span>
            )}
            {liveError && (
              <span style={{ marginLeft: 12, color: "#b00020" }}>
                {liveError}
              </span>
            )}
          </div>

          <IndiaWeatherMap
            reports={reports}
            eventFilter={eventFilter}
            liveWeather={liveWeather}
          />
        </>
      )}
    </div>
  );
}
function AnalyticsPage() { const [reports, setReports] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
    async function loadReports() { try { const response = await fetch( "http://localhost:5000/api/reports" ); const data = await response.json(); if (data.success) { setReports(data.reports); } } catch (error) { console.error("Failed to load analytics:", error); } finally { setLoading(false); } } useEffect(() => { loadReports(); }, []); const totalReports = reports.length;
    const verifiedReports = reports.filter(
  (report) =>
    report.verification_status === "verified" &&
    report.source_type !== "public_dataset"
).length; const pendingReports = reports.filter(
  (report) =>
    report.verification_status === "pending" &&
    report.source_type !== "public_dataset"
).length; const rejectedReports = reports.filter(
  (report) =>
    report.verification_status === "rejected" &&
    report.source_type !== "public_dataset"
).length;
 const rainfallReports = reports.filter( (report) => report.event_category === "rainfall" ).length; 
 const thunderstormReports = reports.filter( (report) => report.event_category === "thunderstorm" ).length;
  const floodingReports = reports.filter( (report) => report.event_category === "flooding" ).length;
   const heatwaveReports = reports.filter( (report) => report.event_category === "heatwave" ).length;
    const strongWindReports = reports.filter( (report) => report.event_category === "strong_wind" || report.event_category === "strong wind" ).length; const getPercentage = (count: number) => { if (!totalReports) return 0; return ((count / totalReports) * 100).toFixed(1); }; return ( <div className="panel"> <div className="panel-header"> <div> <h2>📊 Weather Analytics</h2> <p>Real-time analysis of collected weather reports</p> </div> </div> {loading ? ( <p>Loading analytics...</p> ) : ( <> {/* SUMMARY CARDS */} <div className="analytics-grid"> <div className="analytics-card"> <h3>Total Reports</h3> <strong>{totalReports}</strong> <p>All collected reports</p> </div> <div className="analytics-card"> <h3>✓ Verified</h3> <strong>{verifiedReports}</strong> <p>{getPercentage(verifiedReports)}% of reports</p> </div> <div className="analytics-card"> <h3>⏳ Pending</h3> <strong>{pendingReports}</strong> <p>{getPercentage(pendingReports)}% of reports</p> </div> <div className="analytics-card"> <h3>✕ Rejected</h3> <strong>{rejectedReports}</strong> <p>{getPercentage(rejectedReports)}% of reports</p> </div> <div className="analytics-card"> <h3>🌧️ Rainfall</h3> <strong>{rainfallReports}</strong> <p>{getPercentage(rainfallReports)}% of reports</p> </div> <div className="analytics-card"> <h3>⛈️ Thunderstorm</h3> <strong>{thunderstormReports}</strong> <p>{getPercentage(thunderstormReports)}% of reports</p> </div> <div className="analytics-card"> <h3>🌊 Flooding</h3> <strong>{floodingReports}</strong> <p>{getPercentage(floodingReports)}% of reports</p> </div> <div className="analytics-card"> <h3>🔥 Heatwave</h3> <strong>{heatwaveReports}</strong> <p>{getPercentage(heatwaveReports)}% of reports</p> </div> <div className="analytics-card"> <h3>💨 Strong Wind</h3> <strong>{strongWindReports}</strong> <p>{getPercentage(strongWindReports)}% of reports</p> </div> </div> {/* EVENT-WISE ANALYTICS */} <div className="analytics-chart"> <h3>📊 Event-wise Reports</h3> <div className="chart-row"> <span>🌧️ Rainfall</span> <div className="chart-bar"> <div className="chart-fill" style={{ width: `${getPercentage(rainfallReports)}%`, }} ></div> </div> <strong>{rainfallReports}</strong> </div> <div className="chart-row"> <span>⛈️ Thunderstorm</span> <div className="chart-bar"> <div className="chart-fill" style={{ width: `${getPercentage(thunderstormReports)}%`, }} ></div> </div> <strong>{thunderstormReports}</strong> </div> <div className="chart-row"> <span>🌊 Flooding</span> <div className="chart-bar"> <div className="chart-fill" style={{ width: `${getPercentage(floodingReports)}%`, }} ></div> </div> <strong>{floodingReports}</strong> </div> <div className="chart-row"> <span>🔥 Heatwave</span> <div className="chart-bar"> <div className="chart-fill" style={{ width: `${getPercentage(heatwaveReports)}%`, }} ></div> </div> <strong>{heatwaveReports}</strong> </div> <div className="chart-row"> <span>💨 Strong Wind</span> <div className="chart-bar"> <div className="chart-fill" style={{ width: `${getPercentage(strongWindReports)}%`, }} ></div> </div> <strong>{strongWindReports}</strong> </div> </div> </> )} </div> ); }








  
  
    function App() {
  const [page, setPage] = useState<Page>("Dashboard");
  const [collapsed, setCollapsed] = useState(false);
    useEffect(() => {
    const eventSource = new EventSource(
      "http://localhost:5000/api/events"
    );

    eventSource.addEventListener("new_report", (event) => {
      const report = JSON.parse(event.data);

      console.log("REAL-TIME REPORT RECEIVED:", report);

      // Dashboard / Reports components apne API refresh ke through
      // latest data dikha sakte hain.
      window.dispatchEvent(
        new CustomEvent("new-weather-report", {
          detail: report,
        })
      );
    });

    eventSource.addEventListener("ingestion_completed", (event) => {
      const payload = JSON.parse(event.data);

      console.log("INGESTION COMPLETED:", payload);

      window.dispatchEvent(
        new CustomEvent("ingestion-completed", { detail: payload })
      );
    });

    eventSource.addEventListener("new_alert", (event) => {
      const alert = JSON.parse(event.data);

      console.log("NEW OFFICIAL ALERT:", alert);

      window.dispatchEvent(
        new CustomEvent("new-official-alert", { detail: alert })
      );
    });

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

 const menu: Page[] = [
  "Dashboard",
  "Live Weather",
  "Live Events",
  "India Map",
  "Analytics",
  "Reports",
  "Admin Panel",
  "Sources",
  "Settings",
  "Help",
];

  return (
    <div className="app">
      <Sidebar menu={menu} page={page} setPage={setPage} getIcon={getIcon} collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* MAIN */}
      <main className="main">
        <Header page={page} collapsed={collapsed} setCollapsed={setCollapsed} />

        <section className="content">
          {page === "Dashboard" && <Dashboard />}
          {page === "Live Weather" && <LiveWeatherPage />}

        {page === "Live Events" && <LiveEvents />}

         {page === "India Map" && <IndiaMapPage />}

         {page === "Analytics" && <AnalyticsPage />}

          {page === "Reports" && <ReportsPage />}
          {page === "Admin Panel" && <AdminPanel />}

         {page === "Sources" && <SourcesPage />}
          {page === "Settings" && <SettingsPage />}
          {page === "Help" && <HelpPage />}
        </section>
      </main>
    </div>
  );
}
/* ================= INDIA WEATHER MAP ================= */
function LiveWeatherPage() {
  const [weather, setWeather] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWeather = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:5000/api/weather/india-live"
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message || "Failed to load weather"
        );
      }

      setWeather(data.weather || []);
    } catch (err: any) {
      console.error("Live weather error:", err);
      setError(
        err.message || "Unable to load live weather"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();

    const interval = setInterval(() => {
      loadWeather();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>India Live Weather Intelligence</h1>

          <p>
            Real-time weather conditions across major
            Indian cities
          </p>
        </div>

        <button
          onClick={loadWeather}
          className="refresh-btn"
        >
          ↻ Refresh
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          Loading live India weather...
        </div>
      )}

      {error && (
        <div className="error-state">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="weather-grid">
          {weather.map((item) => (
            <div
              className="weather-card"
              key={`${item.city}-${item.state}`}
            >
              <div className="weather-card-top">
                <div>
                  <h3>{item.city}</h3>
                  <span>{item.state}</span>
                </div>

                <div className="weather-temp">
                  {Math.round(item.temperature_c)}°C
                </div>
              </div>

              <div className="weather-condition">
                {item.weather}
              </div>

              <div className="weather-details">
                <div>
                  <span>Feels like</span>
                  <strong>
                    {Math.round(item.feels_like_c)}°C
                  </strong>
                </div>

                <div>
                  <span>Humidity</span>
                  <strong>
                    {item.humidity}%
                  </strong>
                </div>

                <div>
                  <span>Rain</span>
                  <strong>
                    {item.precipitation_mm} mm
                  </strong>
                </div>

                <div>
                  <span>Wind</span>
                  <strong>
                    {item.wind_speed_kmh} km/h
                  </strong>
                </div>
              </div>

              <div className="weather-source">
                Live data • {item.source}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IndiaWeatherMap({
  reports,
  eventFilter,
  liveWeather,
  alerts,
}: {
  reports: any[];
  eventFilter: string;
  liveWeather?: LiveWeather[];
  alerts?: any[];
}) {
  const cityCoordinates: Record<string, [number, number]> = {
    Delhi: [28.6139, 77.209],
    Mumbai: [19.076, 72.8777],
    Jaipur: [26.9124, 75.7873],
    Kolkata: [22.5726, 88.3639],
    Chennai: [13.0827, 80.2707],
    Bengaluru: [12.9716, 77.5946],
    Bangalore: [12.9716, 77.5946],
    Hyderabad: [17.385, 78.4867],
    Ahmedabad: [23.0225, 72.5714],
    Pune: [18.5204, 73.8567],
    Lucknow: [26.8467, 80.9462],
    Patna: [25.5941, 85.1376],
    Bhopal: [23.2599, 77.4126],
    Chandigarh: [30.7333, 76.7794],
    Srinagar: [34.0837, 74.7973],
    Dehradun: [30.3165, 78.0322],
    Guwahati: [26.1445, 91.7362],
    Bhubaneswar: [20.2961, 85.8245],
    Ranchi: [23.3441, 85.3096],
    Raipur: [21.2514, 81.6296],
  };

  const validReports = reports
    .map((report) => {
      const hasCoordinates =
        report.latitude !== null &&
        report.longitude !== null &&
        report.latitude !== undefined &&
        report.longitude !== undefined;

      if (hasCoordinates) {
        return {
          ...report,
          mapLatitude: Number(report.latitude),
          mapLongitude: Number(report.longitude),
        };
      }

      const city = report.city?.trim();

      const fallbackCoordinates = city
        ? cityCoordinates[city]
        : undefined;

      if (fallbackCoordinates) {
        return {
          ...report,
          mapLatitude: fallbackCoordinates[0],
          mapLongitude: fallbackCoordinates[1],
        };
      }

      return null;
    })
    .filter(Boolean);
    const filteredReports =
  eventFilter === "all"
    ? validReports
    : validReports.filter(
        (report: any) =>
          report.event_category === eventFilter
      );

  const markerIcon = new L.Icon({
    iconUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  return (
    <div className="map-shell">
      <MapContainer
        center={[22.9734, 78.6569]}
        zoom={5}
        scrollWheelZoom={true}
        style={{
          height: "420px",
          width: "100%",
          borderRadius: "16px",
        }}
      >
        {Array.isArray(alerts) && alerts.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 900,
              width: 320,
              pointerEvents: "none",
            }}
          >
            {alerts.slice(0, 3).map((a: any, i: number) => (
              <div key={`alert-${i}`} className="report-card" style={{ marginBottom: 8, background: "#fff6f6" }}>
                <div>
                  <strong>{a.title}</strong>
                  <div style={{ fontSize: 12 }}>{a.description}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <small>{a.issue_time || a.pubDate}</small>
                </div>
              </div>
            ))}
          </div>
        )}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filteredReports.map((report: any) => (
          <Marker
            key={report.id}
            position={[
              report.mapLatitude,
              report.mapLongitude,
            ]}
            icon={markerIcon}
          >
            <Popup>
              <div style={{ minWidth: 180, maxWidth: 240, fontSize: 12, lineHeight: 1.5 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>
                  {report.title || "Weather Report"}
                </div>
                <div style={{ color: "#60a5fa", fontWeight: 700, marginBottom: 6 }}>
                  {report.event_category || "Weather Event"}
                </div>
                <div><strong>📍</strong> {report.city || "Unknown"}, {report.state || "Unknown"}</div>
                <div><strong>⚠️</strong> Severity: {report.severity || "medium"}</div>
                <div><strong>✅</strong> Status: {report.verification_status || "pending"}</div>
                <div><strong>🛰️</strong> Source: {report.source_name || "Unknown"}</div>
                {report.description && (
                  <div style={{ marginTop: 8, color: "#cbd5e1" }}>
                    {report.description.slice(0, 120)}{report.description.length > 120 ? "..." : ""}
                  </div>
                )}
                {report.image_url && (
                  <img
                    src={`http://localhost:5000${report.image_url}`}
                    alt={report.title || "Weather report"}
                    style={{
                      width: "100%",
                      maxHeight: 120,
                      objectFit: "cover",
                      marginTop: 8,
                      borderRadius: 8,
                    }}
                  />
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        {liveWeather && liveWeather.length > 0 &&
          liveWeather.map((w) => {
            const lat = Number(w.latitude);
            const lon = Number(w.longitude);

            if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

            return (
              <CircleMarker
                key={`live-${w.city}-${w.state}`}
                center={[lat, lon]}
                radius={8}
                pathOptions={{
                  color: "#1565c0",
                  fillColor: "#42a5f5",
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <div>
                    <div style={{ fontSize: 16 }}>
                      🌦️ {w.city}
                    </div>
                    <div>{w.state}</div>
                    <hr />
                    <div>Temperature: {w.temperature_c}°C</div>
                    <div>Feels like: {w.feels_like_c}°C</div>
                    <div>Humidity: {w.humidity}%</div>
                    <div>Wind: {w.wind_speed_kmh} km/h</div>
                    <div>Precipitation: {w.precipitation_mm} mm</div>
                    <div>Condition: {w.weather}</div>
                    <div>Updated: {w.observed_at}</div>
                    <div>Source: {w.source}</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>

      <div className="map-legend">
        <span><i className="legend-dot live-dot-color"></i>Live Weather</span>
        <span><i className="legend-dot report-dot-color"></i>Weather Report</span>
        <span><i className="legend-dot alert-dot-color"></i>Official Alert</span>
        <span><i className="legend-dot severe-dot-color"></i>Severe Event</span>
      </div>
    </div>
  );
}


/* ================= DASHBOARD ================= */

    function Dashboard() {
  const [showReportForm, setShowReportForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
const [video, setVideo] = useState<File | null>(null);
  const [eventCategory, setEventCategory] = useState("Rainfall");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [latitude, setLatitude] = useState("");
const [longitude, setLongitude] = useState("");
  const [severity, setSeverity] = useState("medium");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [validationBadges, setValidationBadges] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const sourceCount = new Set(
    reports
      .map((report) => report.source_name || report.source_type)
      .filter(Boolean)
  ).size;
  const [liveWeather, setLiveWeather] = useState<LiveWeather[]>([]);
const [loadingWeather, setLoadingWeather] = useState(false);
const [loadingReports, setLoadingReports] = useState(true);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [showAllSocialPosts, setShowAllSocialPosts] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

const [dateFilter, setDateFilter] = useState("today");
const [eventFilter, setEventFilter] = useState("all");
const [locationFilter, setLocationFilter] = useState("all");

  const currentHour = new Date().getHours();
  const greetingText =
    currentHour >= 5 && currentHour < 12
      ? "Good Morning"
      : currentHour >= 12 && currentHour < 17
      ? "Good Afternoon"
      : currentHour >= 17 && currentHour < 21
      ? "Good Evening"
      : "Good Night";

  const socialWeatherPosts = [
    {
      platform: "X / Twitter",
      handle: "@WeatherIndia",
      hashtag: "#MonsoonAlert",
      location: "Rajasthan",
      title: "Heavy rainfall warning issued for Rajasthan and Gujarat",
      details:
        "Flood-prone zones and low-lying roads are being monitored after intense cloudburst activity across western India.",
      link: "https://x.com/search?q=%23MonsoonAlert%20India",
      time: "2 min ago",
      tone: "warning",
    },
    {
      platform: "Instagram",
      handle: "@IndiaWeatherWatch",
      hashtag: "#CycloneWatch",
      location: "West Bengal",
      title: "Coastal storm surge risk increasing for eastern shoreline",
      details:
        "Meteorological teams highlighted elevated sea conditions and strong winds along the Bay of Bengal coastline.",
      link: "https://www.instagram.com/explore/tags/weatheralert/",
      time: "12 min ago",
      tone: "critical",
    },
    {
      platform: "X / Twitter",
      handle: "@IMD_India",
      hashtag: "#HeatwaveAlert",
      location: "Delhi",
      title: "Heatwave conditions intensifying in central India",
      details:
        "Public advisories are active in several districts as daytime temperatures remain above seasonal averages.",
      link: "https://x.com/IMDWeather",
      time: "31 min ago",
      tone: "warning",
    },
    {
      platform: "Instagram",
      handle: "@UrbanClimateDesk",
      hashtag: "#StormTracking",
      location: "Maharashtra",
      title: "Thunderstorm activity spreads across Maharashtra and Madhya Pradesh",
      details:
        "Residents in urban pockets are being urged to stay alert as lightning and gusty winds are forecast to intensify near evening hours.",
      link: "https://www.instagram.com/explore/tags/stormtracking/",
      time: "46 min ago",
      tone: "warning",
    },
    {
      platform: "X / Twitter",
      handle: "@ClimatePulseIN",
      hashtag: "#FloodWatch",
      location: "Tamil Nadu",
      title: "River level monitoring continues in flood-prone districts",
      details:
        "Community updates and emergency teams remain focused on vulnerable river belts after sustained rainfall over the last 24 hours.",
      link: "https://x.com/search?q=%23FloodWatch%20India",
      time: "1 hr ago",
      tone: "critical",
    },
  ];

  const normalizedLocationSearch = locationSearch.trim().toLowerCase();

  const filteredSocialPosts = normalizedLocationSearch
    ? socialWeatherPosts.filter((post) =>
        `${post.location} ${post.title}`
          .toLowerCase()
          .includes(normalizedLocationSearch)
      )
    : socialWeatherPosts;

  const visibleSocialPosts = showAllSocialPosts
    ? filteredSocialPosts
    : filteredSocialPosts.slice(0, 3);

async function loadReports() {
  try {
    const response = await fetch(
      "http://localhost:5000/api/reports"
    );

    const data = await response.json();

    if (data.success) {
      setReports(data.reports);
    }
  } catch (error) {
    console.error("Failed to load reports:", error);
  } finally {
    setLoadingReports(false);
  }
}
useEffect(() => {
  loadReports();
  loadLiveWeather();
  loadRecentUpdates();
}, []);

useEffect(() => {
  function onNewAlert(e: any) {
    const alert = e.detail;
    setRecentAlerts((prev) => [alert, ...prev].slice(0, 10));
  }

  function onIngestion() {
    // reload sources and reports briefly
    loadReports();
    loadLiveWeather();
    loadRecentUpdates();
  }

  window.addEventListener("new-official-alert", onNewAlert as any);
  window.addEventListener("ingestion-completed", onIngestion as any);

  return () => {
    window.removeEventListener("new-official-alert", onNewAlert as any);
    window.removeEventListener("ingestion-completed", onIngestion as any);
  };
}, []);

async function loadRecentUpdates() {
  try {
    const resp = await fetch("http://localhost:5000/api/weather/alerts");

    if (!resp.ok) {
      setRecentAlerts([]);
      return;
    }

    const data = await resp.json();

    if (data.success && Array.isArray(data.alerts)) {
      setRecentAlerts(data.alerts.slice(0, 5));
    } else {
      setRecentAlerts([]);
    }
  } catch (err) {
    console.error("Failed to load recent alerts:", err);
    setRecentAlerts([]);
  }
}
async function loadLiveWeather() {
  try {
    setLoadingWeather(true);

    const response = await fetch(
      "http://localhost:5000/api/weather/india-live"
    );

    const data = await response.json();

    if (data.success) {
      setLiveWeather(data.weather);
        try {
          (window as any).__VAYU_LIVE_WEATHER = {
            weather: data.weather,
            generated_at: data.generated_at || new Date().toISOString(),
            ts: Date.now(),
          };
        } catch (e) {}
    }
  } catch (error) {
    console.error("Failed to load live weather:", error);
  } finally {
    setLoadingWeather(false);
  }
}
const reportLocationText = (report: any) =>
  `${report.city || ""} ${report.state || ""}`.toLowerCase();

const normalizedLocationSearchText = locationSearch.trim().toLowerCase();

const filteredReports = reports.filter((report) => {
  // EVENT FILTER
  const eventMatch =
    eventFilter === "all" ||
    report.event_category?.toLowerCase() ===
      eventFilter.toLowerCase();

  // LOCATION FILTER
  const locationMatch =
    locationFilter === "all" ||
    (
      report.state &&
      report.state.toLowerCase().includes(
        locationFilter.toLowerCase()
      )
    );

  const searchLocationMatch =
    !normalizedLocationSearchText ||
    reportLocationText(report).includes(normalizedLocationSearchText) ||
    `${report.city || ""} ${report.state || ""} ${report.title || ""}`
      .toLowerCase()
      .includes(normalizedLocationSearchText);

  // DATE FILTER
  const reportDate = new Date(report.event_time);
  const now = new Date();

  let dateMatch = true;

  if (dateFilter === "today") {
    dateMatch =
      reportDate.toDateString() === now.toDateString();
  }

  if (dateFilter === "7days") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    dateMatch = reportDate >= sevenDaysAgo;
  }

  if (dateFilter === "30days") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    dateMatch = reportDate >= thirtyDaysAgo;
  }

  return eventMatch && locationMatch && searchLocationMatch && dateMatch;
});

const filteredLiveWeather = normalizedLocationSearchText
  ? liveWeather.filter((item) =>
      `${item.city} ${item.state}`
        .toLowerCase()
        .includes(normalizedLocationSearchText)
    )
  : liveWeather;

 async function submitReport() {
  if (!title || !description || !city || !state) {
    setMessageType("error");
    setMessage("Please fill all required fields: title, description, city and state.");
    setValidationBadges([]);
    return;
  }

  setSubmitting(true);
  setMessageType("info");
  setMessage("Submitting weather report and validating location... ");
  setValidationBadges([]);

  try {
    const formData = new FormData();

    formData.append("source_type", "citizen_report");
    formData.append(
      "source_name",
      "VayuDrishti Citizen Portal"
    );
    formData.append("title", title);
    formData.append("description", description);
    formData.append(
      "event_category",
      eventCategory.toLowerCase()
    );
    formData.append("severity", severity);
    formData.append("city", city);
    formData.append("state", state);

    if (latitude) {
      formData.append("latitude", latitude);
    }

    if (longitude) {
      formData.append("longitude", longitude);
    }

    formData.append(
      "event_time",
      new Date().toISOString()
    );

    // PHOTO
    if (photo) {
      formData.append("photo", photo);
    }

    // VIDEO
    if (video) {
      formData.append("video", video);
    }

    const response = await fetch(
      "http://localhost:5000/api/reports",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (data.success) {
      setMessageType("success");
      setMessage(
        `Report submitted successfully! Report ID: ${data.report_id}. It is now visible in the live dashboard.`
      );
      setValidationBadges(["Location validated", "Image verified"]);

      await loadReports();
      await loadRecentUpdates();
      await loadLiveWeather();
      setLocationSearch(city);
      setShowReportForm(false);

      setTitle("");
      setDescription("");
      setCity("");
      setState("");
      setLatitude("");
      setLongitude("");
      setEventCategory("Rainfall");
      setSeverity("medium");

      // Clear uploaded files
      setPhoto(null);
      setVideo(null);
    } else {
      const reason =
        data?.location_validation?.message ||
        data?.image_verification?.message ||
        data?.message ||
        "Failed to submit report. Please check the entered location and image details.";

      setMessageType("error");
      setValidationBadges([]);
      setMessage(reason + (data?.code ? ` (Code: ${data.code})` : ""));
    }
  } catch (error) {
    console.error(error);

    setMessageType("error");
    setValidationBadges([]);
    setMessage(
      "Backend server se connection nahi ho raha. Please start the backend and try again."
    );
  } finally {
    setSubmitting(false);
  }
}
  return (
    <>
    {/* DASHBOARD HERO */}
    <div className="dashboard-hero">
      <div className="hero-left">
        <div className="eyebrow-label">VAYUDRISHTI COMMAND CENTER</div>
        <h2>{greetingText}</h2>
        <p>Here's what's happening with weather across India</p>
      </div>

      <div className="hero-status">
        <div className="hero-badge live">
          <div className="dot" style={{ background: 'var(--vd-live)' }}></div>
          <div>
            <div style={{ fontSize: 12 }}>System</div>
            <div style={{ fontSize: 13 }}>Online</div>
          </div>
        </div>

        <div className="hero-badge">
          <div style={{ fontSize: 12 }}>Live Weather</div>
          <div style={{ fontSize: 13, fontWeight: 800, marginLeft: 8 }}>{loadingWeather ? 'Loading' : `${(window as any).__VAYU_LIVE_WEATHER?.weather?.length || liveWeather.length} cities`}</div>
        </div>

        <div className="hero-badge">
          <div style={{ fontSize: 12 }}>Data Sources</div>
          <div style={{ fontSize: 13, fontWeight: 800, marginLeft: 8 }}>{sourceCount}</div>
        </div>

        <div className="hero-badge">
          <div style={{ fontSize: 12 }}>AI Verification</div>
          <div style={{ fontSize: 13, fontWeight: 800, marginLeft: 8 }}>{reports.filter((report) => report.verification_status === "verified").length}</div>
        </div>
      </div>
    </div>
   
      {/* CITIZEN REPORT BANNER */}
      <div className="citizen-report-banner">
        <div>
          <h3>📡 Citizen Weather Report</h3>

          <p>
            Report rainfall, flooding, thunderstorms and
            other weather events.
          </p>
        </div>

        <button
          className="report-button"
          onClick={() => {
            setShowReportForm(true);
            setMessage("");
          }}
        >
          + Submit Weather Report
        </button>
      </div>

      {/* REPORT FORM */}
      {showReportForm && (
        <div className="report-form">
          <div className="report-form-header">
            <div>
              <h2>Submit Weather Report</h2>

              <p>
                Enter the details of the weather event.
              </p>
            </div>

            <button
              className="close-button"
              onClick={() => setShowReportForm(false)}
            >
              ✕
            </button>
          </div>

          <input
            type="text"
            placeholder="Report title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            placeholder="Describe what happened..."
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />

          <select
            value={eventCategory}
            onChange={(e) =>
              setEventCategory(e.target.value)
            }
          >
            <option>Rainfall</option>
            <option>Flooding</option>
            <option>Thunderstorm</option>
            <option>Heatwave</option>
            <option>Fog</option>
            <option>Dust Storm</option>
            <option>Strong Wind</option>
          </select>

          <select
            value={severity}
            onChange={(e) =>
              setSeverity(e.target.value)
            }
          >
            <option value="low">Low Severity</option>
            <option value="medium">Medium Severity</option>
            <option value="high">High Severity</option>
            <option value="critical">
              Critical Severity
            </option>
          </select>

          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <input
            type="text"
            placeholder="State"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
          <div className="media-upload-section">
  <label>
    📷 Upload Photo
  </label>

  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      const file = e.target.files?.[0] || null;
      setPhoto(file);
      if (file) {
        setPhotoPreview(URL.createObjectURL(file));
      } else {
        setPhotoPreview(null);
      }
    }}
  />

  {photoPreview && (
    <div className="image-preview-box">
      <img
        className="report-image-preview"
        src={photoPreview}
        alt="Weather report preview"
      />
    </div>
  )}

  <label>
    🎥 Upload Video
  </label>

  <input
    type="file"
    accept="video/*"
    onChange={(e) =>
      setVideo(e.target.files?.[0] || null)
    }
  />
</div> 


          <input
  type="number"
  step="any"
  placeholder="Latitude (optional)"
  value={latitude}
  onChange={(e) => setLatitude(e.target.value)}
/>

<input
  type="number"
  step="any"
  placeholder="Longitude (optional)"
  value={longitude}
  onChange={(e) => setLongitude(e.target.value)}
/>

          {message && (
            <div className={`report-message ${messageType}`}>
              <div>{message}</div>
              {validationBadges.length > 0 && (
                <div className="validation-badges">
                  {validationBadges.map((badge) => (
                    <span key={badge} className="validation-badge">
                      ✓ {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            className="report-button"
            onClick={submitReport}
            disabled={submitting}
          >
            {submitting
              ? "Submitting..."
              : "Submit Report"}
          </button>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="toolbar">
        <div className="section-title">
          <span className="weather-icon">☁</span>

          <div>
            <h3>Weather Intelligence</h3>
            <p>
              National weather monitoring overview
            </p>
          </div>
        </div>

        <div className="location-search-wrap">
          <span className="search-icon">⌕</span>
          <input
            className="location-search-input"
            type="text"
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            placeholder="Search city or state…"
            aria-label="Search location"
          />
        </div>

        <select
  value={dateFilter}
  onChange={(e) => setDateFilter(e.target.value)}
>
  <option value="today">Today</option>
  <option value="7days">Last 7 Days</option>
  <option value="30days">Last 30 Days</option>
</select>
        <select
  value={eventFilter}
  onChange={(e) => setEventFilter(e.target.value)}
>
  <option value="all">All Events</option>
  <option value="rainfall">Rainfall</option>
  <option value="flooding">Flooding</option>
  <option value="thunderstorm">Thunderstorm</option>
  <option value="heatwave">Heatwave</option>
  <option value="fog">Fog</option>
  <option value="dust_storm">Dust Storm</option>
  <option value="strong_wind">Strong Wind</option>
</select>
      <select
  value={locationFilter}
  onChange={(e) => setLocationFilter(e.target.value)}
>
  <option value="all">All India</option>
  <option value="Rajasthan">Rajasthan</option>
  <option value="Delhi">Delhi</option>
  <option value="Maharashtra">Maharashtra</option>
  <option value="West Bengal">West Bengal</option>
  <option value="Tamil Nadu">Tamil Nadu</option>
  <option value="Karnataka">Karnataka</option>
</select>
      </div>

     {/* STATISTICS */}
<div className="stats-grid">
  <KPIStat
    icon="reports"
    title="Total Reports"
    value={filteredReports.length.toString()}
    description="Reports collected by platform"
    trend="LIVE"
  />

  <KPIStat
    icon="verified"
    title="Verified Reports"
   value={filteredReports.filter(
  (report) =>
    report.verification_status === "verified" &&
    report.source_type !== "public_dataset"
).length.toString()}
    description="Reports verified by admin/system"
        trend="LIVE"
  />

  <KPIStat
    icon="pending"
    title="Needs Verification"
    value={filteredReports.filter(
  (report) =>
    report.verification_status === "pending" &&
    report.source_type !== "public_dataset"
).length.toString()}
    description="Citizen/web reports pending review"
    trend="LIVE"
  />

  <KPIStat
    icon="events"
    title="Active Events"
    value={filteredReports.filter(
      (report) =>
        report.severity === "high" ||
        report.severity === "critical"
    ).length.toString()}
    description="High priority weather reports"
    trend="LIVE"
  />
</div>
      {/* DASHBOARD GRID */}
      <div className="dashboard-grid">
        <section className="panel map-panel">
          <div className="panel-header">
            <div>
              <h3>India Weather Map</h3>
              <p>Weather events by location</p>
            </div>

            <button className="small-button">
              View full map →
            </button>
          </div>

          <IndiaWeatherMap
            reports={filteredReports}
            eventFilter="all"
            liveWeather={filteredLiveWeather}
            alerts={recentAlerts}
          />
        </section>

        <div className="right-column">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Official Weather Alerts</h3>
                <p>Latest official alerts</p>
              </div>
              <button className="small-button">View All →</button>
            </div>
            <div style={{ padding: 12 }}>
              <AlertList alerts={recentAlerts} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Official Weather Alerts</h3>
                <p>Latest official alerts</p>
              </div>
              <button className="small-button">View All →</button>
            </div>
            <div style={{ padding: 12 }}>
              <AlertList alerts={recentAlerts} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Recent Weather Reports</h3>
                <p>Latest incoming reports</p>
              </div>
              <button className="small-button">View all →</button>
            </div>
            <div className="reports">
              {loadingReports ? (
                <p>Loading reports...</p>
              ) : reports.length === 0 ? (
                <p>No weather reports available.</p>
              ) : (
                filteredReports.slice(0, 5).map((report) => (
                  <Report
                    key={report.id}
                    event={report.event_category}
                    location={`${report.city}, ${report.state}`}
                    status={report.verification_status}
                    time={new Date(report.event_time).toLocaleString()}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="social-weather-panel">
        <section className="panel social-panel">
          <div className="panel-header">
            <div>
              <h3>Social Weather Pulse</h3>
              <p>Live weather-related conversations from X / Twitter and Instagram</p>
            </div>
            <button
              className="small-button"
              onClick={() => setShowAllSocialPosts((prev) => !prev)}
            >
              {showAllSocialPosts ? "View Less" : "View All"}
            </button>
          </div>

          <div className="social-feed-grid">
            {visibleSocialPosts.length === 0 ? (
              <div className="social-empty-state">
                No weather news found for this location yet.
              </div>
            ) : (
              visibleSocialPosts.map((item) => (
                <div key={`${item.platform}-${item.hashtag}`} className="social-post-card">
                  <div className="social-top-row">
                    <span className={`social-platform ${item.tone}`}>{item.platform}</span>
                    <span className="social-time">{item.time}</span>
                  </div>

                  <div className="social-handle-row">
                    <span>{item.handle}</span>
                    <span className="social-tag">{item.hashtag}</span>
                  </div>

                  <h4>{item.title}</h4>
                  <p>{item.details}</p>

                  <div className="social-link-row">
                    <a href={item.link} target="_blank" rel="noreferrer">Open source link</a>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="local-confirmation-panel">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Current Location Verification</h3>
              <p>
                {normalizedLocationSearchText
                  ? `Local weather news, reports and media for ${locationSearch}`
                  : "Local weather news, reports and media around your active area"}
              </p>
            </div>
          </div>

          <div className="local-confirmation-grid">
            <div className="local-confirmation-card">
              <h4>Local weather news</h4>
              {visibleSocialPosts.length === 0 ? (
                <p className="empty-local-text">No local weather updates are available yet.</p>
              ) : (
                <div className="local-news-list">
                  {visibleSocialPosts.slice(0, 3).map((item) => (
                    <div key={`local-news-${item.platform}-${item.hashtag}`} className="local-news-item">
                      <div className="local-news-tag">{item.hashtag}</div>
                      <strong>{item.title}</strong>
                      <p>{item.details}</p>
                      <a href={item.link} target="_blank" rel="noreferrer">Open source</a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="local-confirmation-card">
              <h4>Local reports & media</h4>
              {filteredReports.length === 0 ? (
                <p className="empty-local-text">No matching local reports found for this location.</p>
              ) : (
                <div className="local-report-list">
                  {filteredReports.slice(0, 3).map((report) => (
                    <div key={`local-report-${report.id}`} className="local-report-item">
                      <div className="local-report-meta">
                        <strong>{report.title || report.event_category || "Weather report"}</strong>
                        <span>{report.city}, {report.state}</span>
                      </div>

                      <div className="local-report-media">
                        {report.image_url && (
                          <img
                            src={`http://localhost:5000${report.image_url}`}
                            alt={report.title || "Weather report image"}
                          />
                        )}
                        {report.video_url && (
                          <video controls src={`http://localhost:5000${report.video_url}`} />
                        )}
                      </div>

                      <p>{report.description || "Weather event reported by a local source."}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div style={{ marginTop: 12 }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Recent Weather Updates</h3>
              <p>Latest official alerts and citizen reports</p>
            </div>

            <button
              className="small-button"
              onClick={loadRecentUpdates}
            >
              ↻ Refresh
            </button>
          </div>

          <div className="reports">
            {recentAlerts.length === 0 && reports.length === 0 ? (
              <p>No recent updates available.</p>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                  <AlertList alerts={recentAlerts} />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function AdminPanel() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAdminReports() {
    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/reports"
      );

      const data = await response.json();

      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error(
        "Admin reports load error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminReports();

    const interval = setInterval(
      loadAdminReports,
      10000
    );

    return () => clearInterval(interval);
  }, []);

  const pendingReports = reports.filter(
    (report) =>
      report.verification_status === "pending"
  );

  return (
    <div className="admin-page">

      <section className="panel admin-panel">

        <div className="panel-header">
          <div>
            <h3>🛡️ Admin Verification</h3>

            <p>
              Review, verify and manage incoming weather reports
            </p>
          </div>

          <span className="admin-badge">
            ADMIN
          </span>
        </div>

        <div className="admin-summary">
          <div>
            <strong>{pendingReports.length}</strong>
            <span>Pending Verification</span>
          </div>

          <div>
            <strong>
              {
                reports.filter(
                  (report) =>
                    report.verification_status ===
                    "verified"
                ).length
              }
            </strong>
            <span>Verified Reports</span>
          </div>

          <div>
            <strong>
              {
                reports.filter(
                  (report) =>
                    report.verification_status ===
                    "rejected"
                ).length
              }
            </strong>
            <span>Rejected Reports</span>
          </div>
        </div>

        <div className="admin-reports">

          {loading ? (
            <p className="no-pending">
              Loading reports...
            </p>
          ) : pendingReports.length === 0 ? (
            <p className="no-pending">
              ✓ No reports pending verification.
            </p>
          ) : (
            pendingReports
              .slice(0, 10)
              .map((report) => (
                <AdminReport
                  key={report.id}
                  report={report}
                  onVerified={loadAdminReports}
                />
              ))
          )}

        </div>

      </section>

    </div>
  );
}
/* ================= ADMIN REPORT ================= */

function AdminReport({
  report,
  onVerified,
}: {
  report: any;
  onVerified: () => void;
}) {
  const [processing, setProcessing] = useState(false);

  async function updateStatus(
    status: "verified" | "rejected"
  ) {
    setProcessing(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/reports/${report.id}/verify`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: status,
            reason:
              status === "verified"
                ? "Report verified by admin"
                : "Report rejected by admin",
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        await onVerified();
      } else {
        alert("Failed to update report.");
      }
    } catch (error) {
      console.error(error);
      alert(
        "Backend server se connection nahi ho raha."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="admin-report">
      <div className="admin-report-info">
        <strong>{report.title}</strong>

        <span>
          {report.event_category} • {report.city},{" "}
          {report.state}
        </span>

        <small>
          Severity: {report.severity} • Report ID:{" "}
          {report.id}
        </small>
        {report.image_url && (
  <div>
    <small>📷 Photo attached</small>

    <img
      src={`http://localhost:5000${report.image_url}`}
      alt="Weather report"
      className="report-media-thumb"
    />
  </div>
)}
  
{report.video_url && (
  <div>
    <small>🎥 Video attached</small>

    <video
      src={`http://localhost:5000${report.video_url}`}
      controls
      className="report-media-video"
    />
  </div>
)}

       <small>
  AI Category: {report.ai_category || "Not available"} •
  Confidence:{" "}
  {report.ai_confidence
    ? `${(report.ai_confidence * 100).toFixed(0)}%`
    : "N/A"}
</small>

<small>
  Risk: {report.risk_level || "Low"} •
  Score: {report.risk_score ?? 0}
</small>

{report.verification_recommendation && (
  <small>
    Recommendation: {report.verification_recommendation}
  </small>
)} 
      </div>

      <div className="admin-actions">
        <button
          className="verify-button"
          onClick={() => updateStatus("verified")}
          disabled={processing}
        >
          ✓ Verify
        </button>

        <button
          className="reject-button"
          onClick={() => updateStatus("rejected")}
          disabled={processing}
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
}

/* ================= REPORT ================= */

function Report({
  event,
  location,
  status,
  time,
}: {
  event: string;
  location: string;
  status: string;
  time: string;
}) {
  return (
    <div className="report">
      <div className="report-icon">
        ☁
      </div>

      <div className="report-info">
        <strong>{event}</strong>

        <span>{location}</span>
      </div>

      <div className="report-right">
        <span
          className={`status ${status.toLowerCase()}`}
        >
          {status}
        </span>

        <small>{time}</small>
      </div>
    </div>
  );
}
/* ================= REPORTS PAGE ================= */
function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function loadReports() {
    try {
      const response = await fetch(
        "http://localhost:5000/api/reports"
      );

      const data = await response.json();

      if (data.success) {
        setReports(data.reports);
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  }

  async function verifyReport(
    id: number,
    status: "verified" | "rejected"
  ) {
    try {
      const response = await fetch(
        `http://localhost:5000/api/reports/${id}/verify`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            reason:
              status === "verified"
                ? "Verified by admin"
                : "Rejected by admin",
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        loadReports();
      } else {
        alert(data.message || "Verification failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      alert("Failed to update verification status");
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = reports.filter((report) => {
 const reportEvent = String(report.event_category || "")
  .toLowerCase()
  .replace(/_/g, " ")
  .trim();

const selectedEvent = eventFilter.toLowerCase().trim();

const matchesEvent =
  selectedEvent === "all" ||
  reportEvent === selectedEvent;
    const matchesStatus =
      statusFilter === "all" ||
      report.verification_status === statusFilter;

    const locationText =
      `${report.city || ""} ${report.state || ""}`.toLowerCase();

    const matchesLocation =
      locationFilter === "" ||
      locationText.includes(locationFilter.toLowerCase());

    const reportDate = report.event_time
      ? new Date(report.event_time)
          .toISOString()
          .split("T")[0]
      : "";

    const matchesFromDate =
      dateFrom === "" || reportDate >= dateFrom;

    const matchesToDate =
      dateTo === "" || reportDate <= dateTo;

    return (
      matchesEvent &&
      matchesStatus &&
      matchesLocation &&
      matchesFromDate &&
      matchesToDate
    );
  });

  return (
    <div className="reports-page">

      <div className="reports-page-header">
        <div>
          <p className="eyebrow">
            VAYUDRISHTI / DATA MANAGEMENT
          </p>

          <h2>Weather Reports</h2>

          <p>
            View, filter and analyse all weather reports
            collected by the platform.
          </p>
        </div>

        <button
          className="small-button"
          onClick={loadReports}
        >
          ↻ Refresh Data
        </button>
      </div>

      <div className="reports-filters">

        <div className="filter-box">
          <label>Event Type</label>

          <select
            value={eventFilter}
            onChange={(e) =>
              setEventFilter(e.target.value)
            }
          >
            <option value="all">All Events</option>
            <option value="rainfall">Rainfall</option>
            <option value="flooding">Flooding</option>
            <option value="thunderstorm">
              Thunderstorm
            </option>
            <option value="heatwave">Heatwave</option>
            <option value="fog">Fog</option>
            <option value="dust storm">
              Dust Storm
            </option>
            <option value="strong wind">
              Strong Wind
            </option>
          </select>
        </div>

        <div className="filter-box">
          <label>Verification Status</label>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="filter-box search-filter">
          <label>Location</label>

          <input
            type="text"
            placeholder="Search city or state..."
            value={locationFilter}
            onChange={(e) =>
              setLocationFilter(e.target.value)
            }
          />
        </div>

        <div className="filter-box">
          <label>From Date</label>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) =>
              setDateFrom(e.target.value)
            }
          />
        </div>

        <div className="filter-box">
          <label>To Date</label>

          <input
            type="date"
            value={dateTo}
            onChange={(e) =>
              setDateTo(e.target.value)
            }
          />
        </div>

      </div>

      <div className="reports-summary">
        <span>
          Showing <strong>{filteredReports.length}</strong>{" "}
          of <strong>{reports.length}</strong> reports
        </span>
      </div>

      <div className="reports-table-panel">

        {loading ? (
          <div className="table-message">
            Loading weather reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="table-message">
            No reports match the selected filters.
          </div>
        ) : (
          <div className="table-wrapper">

            <table className="reports-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Report</th>
                  <th>Event</th>
                  <th>Location</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Duplicate</th>
                  <th>AI Classification</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {filteredReports.map((report) => (

                  <tr key={report.id}>

                    <td>
                      #{report.id}
                    </td>

                    <td>
                      <div className="table-report-title">
                        {report.title ||
                          "Untitled Report"}
                      </div>

                      <small>
                        {report.source_name ||
                          report.source_type}
                      </small>
                    </td>

                    <td>
                      <span className="event-tag">
                        {report.event_category ||
                          "Other"}
                      </span>
                    </td>

                    <td>
                      <div className="location-city">
                        {report.city || "Unknown"}
                      </div>

                      <small className="location-state">
                        {report.state || "Unknown"}
                      </small>
                    </td>

                    <td>
                      <span
                        className={`severity ${String(
                          report.severity || "medium"
                        ).toLowerCase()}`}
                      >
                        {report.severity || "medium"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`status ${String(
                          report.verification_status ||
                            "pending"
                        ).toLowerCase()}`}
                      >
                        {report.verification_status ||
                          "pending"}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {report.risk_score ?? 0}
                      </strong>
                      <br />
                      <small>
                        {report.risk_level || "Low"}
                      </small>
                    </td>

                    <td>
                      {report.duplicate_of ? (
                        <span>
                          Yes
                          <br />
                          <small>
                            #{report.duplicate_of}
                          </small>
                        </span>
                      ) : (
                        <span>No</span>
                      )}
                    </td>

                    <td>
                      <strong>
                        {report.ai_category ||
                          "Not classified"}
                      </strong>

                      {report.ai_confidence != null && (
                        <small>
                          <br />
                          {Math.round(
                            report.ai_confidence * 100
                          )}
                          % confidence
                        </small>
                      )}
                    </td>

                    <td>
                      {report.event_time
                        ? new Date(
                            report.event_time
                          ).toLocaleString()
                        : "N/A"}
                    </td>
                    

                    <td>
                      <div className="report-actions">

                        {report.verification_status ===
                          "pending" && (
                          <>
                            <button
                              className="verify-button"
                              onClick={() =>
                                verifyReport(
                                  report.id,
                                  "verified"
                                )
                              }
                            >
                              ✓ Verify
                            </button>

                            <button
                              className="reject-button"
                              onClick={() =>
                                verifyReport(
                                  report.id,
                                  "rejected"
                                )
                              }
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}

                        {report.verification_status ===
                          "verified" && (
                          <span className="action-done">
                            ✓ Verified
                          </span>
                        )}

                        {report.verification_status ===
                          "rejected" && (
                          <span className="action-rejected">
                            ✕ Rejected
                          </span>
                        )}

                      </div>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}
/* ================= SOURCES PAGE ================= */

function SourcesPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSources() {
    try {
      const response = await fetch(
        "http://localhost:5000/api/sources"
      );

      const data = await response.json();

      if (data.success) {
        setSources(data.sources);
      }
    } catch (error) {
      console.error("Failed to load sources:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSources();
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">
            VAYUDRISHTI / DATA INGESTION
          </p>

          <h2>🌐 Data Sources</h2>

          <p>
            Monitor weather information sources connected to
            the platform.
          </p>
        </div>

        <button
          className="small-button"
          onClick={loadSources}
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading data sources...</p>
      ) : sources.length === 0 ? (
        <p>No data sources available.</p>
      ) : (
        <div className="reports">
          {sources.map((source) => (
            <div className="report-card" key={source.id}>
              <div>
                <h3>{source.name}</h3>

                <p>Type: {source.type}</p>

                <p>{source.description}</p>

                <p>
                  <strong>Last update:</strong>{" "}
                  {source.last_sync || "Never"}
                </p>

                <p>
                  <strong>Records:</strong>{" "}
                  {source.records_collected || 0}
                </p>
              </div>

              <div>
                <span className={`status ${source.health || "unknown"}`}>
                  {source.status}
                </span>

                {(!source.health || source.health === "unavailable") && (
                  <p style={{ marginTop: 8, color: "#b33" }}>
                    Configured but credentials or endpoint unavailable
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
/* ================= SETTINGS PAGE ================= */

function SettingsPage() {
  const [apiStatus, setApiStatus] = useState("Checking...");
  const [databaseStatus, setDatabaseStatus] = useState("Checking...");
  const [sourcesStatus, setSourcesStatus] = useState("Checking...");

  async function checkSystemStatus() {
    setApiStatus("Checking...");
    setDatabaseStatus("Checking...");
    setSourcesStatus("Checking...");

    try {
      const healthResponse = await fetch(
        "http://localhost:5000/api/health"
      );

      if (healthResponse.ok) {
        setApiStatus("Online");
        setDatabaseStatus("Connected");
      } else {
        setApiStatus("Offline");
        setDatabaseStatus("Unavailable");
      }
    } catch (error) {
      console.error("Health check failed:", error);
      setApiStatus("Offline");
      setDatabaseStatus("Unavailable");
    }

    try {
      const sourcesResponse = await fetch(
        "http://localhost:5000/api/sources"
      );

      const sourcesData = await sourcesResponse.json();

      if (sourcesData.success) {
        setSourcesStatus("Active");
      } else {
        setSourcesStatus("Unavailable");
      }
    } catch (error) {
      console.error("Sources check failed:", error);
      setSourcesStatus("Unavailable");
    }
  }

  useEffect(() => {
    checkSystemStatus();
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">
            VAYUDRISHTI / SYSTEM CONFIGURATION
          </p>

          <h2>⚙️ Platform Settings</h2>

          <p>
            Monitor the configuration and operational status
            of the VayuDrishti weather analytics platform.
          </p>
        </div>

        <button
          className="small-button"
          onClick={checkSystemStatus}
        >
          ↻ Check Status
        </button>
      </div>

      <div className="reports">

        <div className="report-card">
          <div>
            <h3>Backend API</h3>
            <p>
              Node.js + Express backend service
            </p>
          </div>

          <div>
            <span className="status">
              {apiStatus}
            </span>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>Central Database</h3>
            <p>
              SQLite database used by the working prototype
            </p>
          </div>

          <div>
            <span className="status">
              {databaseStatus}
            </span>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>Data Sources</h3>
            <p>
              Open-Meteo, citizen reports and government
              rainfall dataset
            </p>
          </div>

          <div>
            <span className="status">
              {sourcesStatus}
            </span>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>AI Processing</h3>
            <p>
              Weather event classification, confidence,
              duplicate detection and risk analysis
            </p>
          </div>

          <div>
            <span className="status">
              Active
            </span>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>GIS Visualization</h3>
            <p>
              India weather visualization using Leaflet
              and OpenStreetMap
            </p>
          </div>

          <div>
            <span className="status">
              Active
            </span>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>Automatic Refresh</h3>
            <p>
              Live Events monitoring refreshes periodically
              to display incoming reports.
            </p>
          </div>

          <div>
            <span className="status">
              Enabled
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
/* ================= HELP PAGE ================= */

function HelpPage() {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">
            VAYUDRISHTI / DOCUMENTATION
          </p>

          <h2>❓ Help & Documentation</h2>

          <p>
            Learn how the VayuDrishti National Weather Big Data
            Analytics Platform works.
          </p>
        </div>
      </div>

      <div className="reports">

        <div className="report-card">
          <div>
            <h3>🌦️ How VayuDrishti Works</h3>
            <p>
              VayuDrishti collects weather information from
              connected data sources and processes it through
              classification, duplicate detection, risk analysis
              and verification workflows.
            </p>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>📡 Data Sources</h3>
            <p>
              The prototype integrates live weather information,
              citizen reports and government rainfall datasets.
              Additional public web and social-feed adapters can
              be connected through the ingestion architecture.
            </p>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>📋 Citizen Reports</h3>
            <p>
              Citizens can submit weather-related reports with
              event details, location, severity, photos and videos.
            </p>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>🤖 AI Classification</h3>
            <p>
              Incoming reports are analysed to identify weather
              event categories and generate a confidence score.
            </p>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>🔍 Duplicate Detection</h3>
            <p>
              Similar reports are analysed to identify possible
              duplicate entries and reduce repeated information.
            </p>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>⚠️ Risk Analysis</h3>
            <p>
              Reports receive a risk score and risk level based
              on available report information and source signals.
            </p>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>✅ Admin Verification</h3>
            <p>
              Administrators can review incoming reports and
              mark them as verified or rejected.
            </p>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>🗺️ India Weather Map</h3>
            <p>
              Weather reports with location information can be
              visualized on the India GIS map for geographic
              monitoring.
            </p>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>📊 Analytics</h3>
            <p>
              The analytics module provides event counts,
              verification statistics and weather-event insights
              from collected reports.
            </p>
          </div>
        </div>

        <div className="report-card">
          <div>
            <h3>🔐 Verification Status</h3>
            <p>
              Reports can have pending, verified or rejected
              verification states so administrators can track
              report reliability.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ================= SIMPLE PAGE ================= */


/* ================= ICONS ================= */

function getIcon(item: Page) {
  const icons: Record<Page, string> = {
    Dashboard: "▦",
    "Live Events": "◉",
    "Live Weather": "☁",
    "India Map": "⌖",
    Analytics: "▥",
    Reports: "▤",
    "Admin Panel": "♙",
    Sources: "◎",
    Settings: "⚙",
    Help: "?",
  };

  return icons[item];
}
  
export default App;