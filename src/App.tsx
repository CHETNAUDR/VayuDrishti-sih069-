import { useEffect, useState } from "react";
type LiveWeather = {
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  weather: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    rain: number;
    weather_code: number;
    wind_speed_10m: number;
  };
};
import "./App.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Page =
  | "Dashboard"
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

  const [eventFilter, setEventFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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
      console.error("Failed to load live events:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();

    const interval = setInterval(() => {
      loadReports();
    }, 10000);

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
      ) : filteredReports.length === 0 ? (
        <p>No weather events match the selected filters.</p>
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
  }, []);

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
      <IndiaWeatherMap
  reports={reports}
  eventFilter={eventFilter}
/>   
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

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const menu: Page[] = [
  "Dashboard",
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
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">VD</div>

          <div>
            <h2>VayuDrishti</h2>
            <p>National Weather Intelligence</p>
          </div>
        </div>

        <div className="menu-title">MONITORING</div>

        <nav>
          {menu.map((item) => (
            <button
              key={item}
              className={`nav-item ${page === item ? "active" : ""}`}
              onClick={() => setPage(item)}
            >
              <span>{getIcon(item)}</span>
              {item}

              {item === "Live Events" && (
                <span className="badge">12</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="live-dot"></span>
            System Online
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <header className="header">
          <div>
            <p className="eyebrow">
              VAYUDRISHTI / NATIONAL WEATHER
            </p>
            <h1>{page}</h1>
          </div>

          <div className="header-actions">
            <span className="live">
              <span className="live-dot"></span>
              LIVE DATA
            </span>

            <button>⌕</button>
            <button>◐</button>
            <div className="avatar">A</div>
          </div>
        </header>

        <section className="content">
          {page === "Dashboard" && <Dashboard />}

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


function IndiaWeatherMap({
   reports,
  eventFilter,
}: {
  reports: any[];
  eventFilter: string;
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
    <MapContainer
      center={[22.9734, 78.6569]}
      zoom={5}
      scrollWheelZoom={true}
      style={{
        height: "420px",
        width: "100%",
        borderRadius: "14px",
      }}
    >
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
            <strong>
              {report.title || "Weather Report"}
            </strong>

            <br />

            Event: {report.event_category}

            <br />

            Location:{" "}
            {report.city || "Unknown"},{" "}
            {report.state || "Unknown"}

            <br />

            Severity: {report.severity}

            <br />

            Status: {report.verification_status}

            <br />

            Source: {report.source_name || "Unknown"}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
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
  const [reports, setReports] = useState<any[]>([]);
  const [liveWeather, setLiveWeather] = useState<LiveWeather[]>([]);
const [loadingWeather, setLoadingWeather] = useState(false);
const [loadingReports, setLoadingReports] = useState(true);

const [dateFilter, setDateFilter] = useState("today");
const [eventFilter, setEventFilter] = useState("all");
const [locationFilter, setLocationFilter] = useState("all");

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
}, []);
async function loadLiveWeather() {
  try {
    setLoadingWeather(true);

    const response = await fetch(
      "http://localhost:5000/api/weather/live"
    );

    const data = await response.json();

    if (data.success) {
      setLiveWeather(data.weather);
    }
  } catch (error) {
    console.error("Failed to load live weather:", error);
  } finally {
    setLoadingWeather(false);
  }
}
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

  return eventMatch && locationMatch && dateMatch;
});
 async function submitReport() {
  if (!title || !description || !city || !state) {
    setMessage("Please fill all required fields.");
    return;
  }

  setSubmitting(true);
  setMessage("");

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
      setMessage(
        `Report submitted successfully! Report ID: ${data.report_id}`
      );

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
      setMessage("Failed to submit report.");
    }
  } catch (error) {
    console.error(error);

    setMessage(
      "Backend server se connection nahi ho raha."
    );
  } finally {
    setSubmitting(false);
  }
}
  return (
    <>
    {/* LIVE WEATHER */}
<div className="panel">
  <div className="panel-header">
    <div>
      <h3>🌦️ Live Weather</h3>
      <p>Real-time weather data from Open-Meteo</p>
    </div>
  </div>

  {loadingWeather ? (
    <p>Loading live weather...</p>
  ) : liveWeather.length === 0 ? (
    <p>No live weather data available.</p>
  ) : (
    <div className="weather-grid">
      {liveWeather.map((item) => (
        <div className="weather-card" key={item.city}>
          <h3>{item.city}</h3>

          <p>{item.state}</p>

          <div className="weather-temperature">
            {item.weather.temperature_2m}°C
          </div>

          <div>
            💧 Humidity: {item.weather.relative_humidity_2m}%
          </div>

          <div>
            💨 Wind: {item.weather.wind_speed_10m} km/h
          </div>

          <div>
            🌧️ Rain: {item.weather.rain} mm
          </div>
        </div>
      ))}
    </div>
  )}
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
    onChange={(e) =>
      setPhoto(e.target.files?.[0] || null)
    }
  />

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
            <div className="report-message">
              {message}
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
  <StatCard
    icon="◉"
    title="Total Reports"
    value={filteredReports.length.toString()}
    description="Reports collected by platform"
    trend="LIVE"
  />

  <StatCard
    icon="✓"
    title="Verified Reports"
   value={filteredReports.filter(
  (report) =>
    report.verification_status === "verified" &&
    report.source_type !== "public_dataset"
).length.toString()}
    description="Reports verified by admin/system"
        trend="LIVE"
  />

  <StatCard
    icon="!"
    title="Needs Verification"
    value={filteredReports.filter(
  (report) =>
    report.verification_status === "pending" &&
    report.source_type !== "public_dataset"
).length.toString()}
    description="Citizen/web reports pending review"
    trend="LIVE"
  />

  <StatCard
    icon="⚠"
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
/>
            </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Recent Weather Reports</h3>
              <p>Latest incoming reports</p>
            </div>

            <button className="small-button">
              View all →
            </button>
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
      style={{
        width: "180px",
        maxHeight: "120px",
        objectFit: "cover",
        borderRadius: "8px",
        marginTop: "6px",
      }}
    />
  </div>
)}
  
{report.video_url && (
  <div>
    <small>🎥 Video attached</small>

    <video
      src={`http://localhost:5000${report.video_url}`}
      controls
      style={{
        width: "240px",
        maxHeight: "160px",
        marginTop: "6px",
        borderRadius: "8px",
      }}
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

/* ================= STAT CARD ================= */
function StatCard({
  icon,
  title,
  value,
  description,
  trend,
}: {
  icon: string;
  title: string;
  value: string;
  description: string;
  trend: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-icon">
          {icon}
        </span>

        <span className="trend">
          {trend}
        </span>
      </div>

      <p>{title}</p>

      <strong>{value}</strong>

      <small>{description}</small>
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

                <p>
                  Type: {source.type}
                </p>

                <p>
                  {source.description}
                </p>
              </div>

              <div>
                <span className="status">
                  {source.status}
                </span>
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

function SimplePage({
  title,
}: {
  title: string;
}) {
  return (
    <div className="empty-page">
      <div className="empty-icon">
        ◈
      </div>

      <h2>{title}</h2>

      <p>
        This VayuDrishti module is ready for
        the next development phase.
      </p>

      <span>
        Real data + backend integration coming next.
      </span>
    </div>
  );
}

/* ================= ICONS ================= */

function getIcon(item: Page) {
  const icons: Record<Page, string> = {
    Dashboard: "▦",
    "Live Events": "◉",
    "India Map": "⌖",
    Analytics: "▥",
    Reports: "▤",
    Sources: "◎",
    Settings: "⚙",
    Help: "?",
  };

  return icons[item];
}

export default App;