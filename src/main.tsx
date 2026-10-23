import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CalendarDays, CloudSun, Droplets, RefreshCw, Sun, ThermometerSun, Waves, Wind } from "lucide-react";
import { appConfig, labelForRating } from "./config/scoring";
import { loadTides } from "./providers/tides";
import { loadWeather } from "./providers/weather";
import { registerServiceWorker } from "./services/registerServiceWorker";
import { buildRecommendation, describeUv, evaluateInterval } from "./services/recommendationEngine";
import { currentLocalIso, formatDateLong, formatTime, hourOf, toDateInputValue } from "./services/time";
import { describeWindDirection } from "./services/wind";
import type { BathingSlot, DayRecommendation, EvaluationInterval, TideExtreme } from "./types/domain";
import "./styles.css";

registerServiceWorker();

function App() {
  const today = toDateInputValue(new Date());
  const tomorrow = toDateInputValue(new Date(Date.now() + 86400000));
  const [date, setDate] = useState(today);
  const [recommendation, setRecommendation] = useState<DayRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([loadTides(date), loadWeather(date)])
      .then(([tides, weather]) => {
        if (cancelled) return;
        setRecommendation(
          buildRecommendation(date, tides.extremes, weather.hours, {
            tides: tides.status,
            weather: weather.status,
            messages: [tides.message, weather.message].filter(Boolean) as string[],
          })
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  const best = recommendation?.bestSlot;
  const nowInterval =
    recommendation && date === today
      ? evaluateInterval(currentLocalIso(), recommendation.tideExtremes, recommendation.weatherHours)
      : null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p>SofiPlaya</p>
          <h1>Sanlúcar de Barrameda</h1>
        </div>
        <Waves aria-hidden="true" />
      </header>

      <section className="date-controls" aria-label="Selección de fecha">
        <button className={date === today ? "active" : ""} onClick={() => setDate(today)} type="button">
          Hoy
        </button>
        <button className={date === tomorrow ? "active" : ""} onClick={() => setDate(tomorrow)} type="button">
          Mañana
        </button>
        <label>
          <CalendarDays size={18} aria-hidden="true" />
          <input aria-label="Elegir fecha" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </section>

      {loading && (
        <section className="status-card">
          <RefreshCw className="spin" aria-hidden="true" />
          Calculando condiciones para {formatDateLong(date)}...
        </section>
      )}

      {!loading && recommendation && (
        <>
          <SourceWarnings recommendation={recommendation} />
          <CurrentConditions interval={nowInterval} selectedDate={date} today={today} />
          <BestSlot slot={best} />
          <Timeline intervals={recommendation.intervals} />
          <Slots slots={recommendation.slots} />
          <TideSection date={date} extremes={recommendation.tideExtremes} intervals={recommendation.intervals} bestSlot={best} />
          <WeatherSection intervals={recommendation.intervals} />
        </>
      )}
    </main>
  );
}

function CurrentConditions({
  interval,
  selectedDate,
  today,
}: {
  interval: EvaluationInterval | null;
  selectedDate: string;
  today: string;
}) {
  if (selectedDate !== today) {
    return (
      <section className="current-card muted">
        <div>
          <p>Ahora mismo</p>
          <h2>Mostrando otro día</h2>
        </div>
        <span>Selecciona Hoy para ver las condiciones del momento de la consulta.</span>
      </section>
    );
  }

  if (!interval) return null;

  const isBathingTime = hourOf(interval.time) >= appConfig.schedule.startHour && hourOf(interval.time) < appConfig.schedule.endHour;
  const label = isBathingTime && interval.hardConstraints.length === 0 ? labelForRating(interval.rating) : "No recomendable";

  return (
    <section className={`current-card rating-${interval.rating}`}>
      <div>
        <p>Ahora mismo · {formatTime(interval.time)}</p>
        <h2>{label}</h2>
        <strong>{interval.score}/100</strong>
      </div>
      <div className="current-metrics">
        <Metric icon={<ThermometerSun size={18} />} value={temperatureMetric(interval)} />
        <Metric icon={<Droplets size={18} />} value={interval.tide ? `${Math.round(interval.tide.percentage)} % ${interval.tide.trend === "rising" ? "↑" : "↓"}` : "Sin marea"} />
        <Metric icon={<Wind size={18} />} value={windMetric(interval)} />
        <Metric icon={<Sun size={18} />} value={uvMetric(interval)} />
      </div>
      <ul>
        {(interval.hardConstraints.length ? interval.hardConstraints : interval.reasons.slice(0, 3)).map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <UvNotice interval={interval} />
    </section>
  );
}

function SourceWarnings({ recommendation }: { recommendation: DayRecommendation }) {
  const hasWarnings =
    recommendation.sourceStatus.messages.length ||
    recommendation.sourceStatus.tides !== "ok" ||
    recommendation.sourceStatus.weather !== "ok";

  if (!hasWarnings) return null;

  return (
    <section className="notice">
      {recommendation.sourceStatus.tides === "simulated" && <p>Predicción de mareas en modo simulado.</p>}
      {recommendation.sourceStatus.weather === "simulated" && <p>Datos meteorológicos en modo simulado.</p>}
      {recommendation.sourceStatus.messages.map((message) => (
        <p key={message}>{message}</p>
      ))}
    </section>
  );
}

function BestSlot({ slot }: { slot: BathingSlot | null | undefined }) {
  if (!slot) {
    return (
      <section className="hero-card muted">
        <p>Mejor momento para bañarse</p>
        <h2>Sin franja recomendable</h2>
        <span>No hay suficientes condiciones útiles dentro de 09:00-21:00.</span>
      </section>
    );
  }

  const first = slot.intervals[0];

  return (
    <section className={`hero-card rating-${slot.rating}`}>
      <p>Mejor momento para bañarse</p>
      <h2>
        {formatTime(slot.startTime)}-{formatTime(slot.endTime)}
      </h2>
      <strong>
        {labelForRating(slot.rating)} · {slot.averageScore}/100
      </strong>
      <div className="hero-metrics">
        <Metric icon={<ThermometerSun size={18} />} value={temperatureMetric(first)} />
        <Metric icon={<Droplets size={18} />} value={first.tide ? `Marea ${Math.round(first.tide.percentage)} % ${first.tide.trend === "rising" ? "↑" : "↓"}` : "Sin marea"} />
        <Metric icon={<Wind size={18} />} value={windMetric(first)} />
        <Metric icon={<Sun size={18} />} value={uvMetric(first)} />
        <Metric icon={<Waves size={18} />} value={first.tide ? `Pleamar ${nextHigh(first)}` : "Sin pleamar"} />
      </div>
      <UvNotice interval={first} variant="hero" />
    </section>
  );
}

function Metric({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span>
      {icon}
      {value}
    </span>
  );
}

function Timeline({ intervals }: { intervals: EvaluationInterval[] }) {
  const hourly = intervals.filter((_, index) => index % 2 === 0);
  const hourLabels = Array.from({ length: appConfig.schedule.endHour - appConfig.schedule.startHour + 1 }, (_, index) =>
    `${String(appConfig.schedule.startHour + index).padStart(2, "0")}:00`
  );

  return (
    <section className="section-block">
      <div className="section-title">
        <h2>Resumen del día</h2>
        <span>Desliza para ver horas</span>
      </div>
      <div className="timeline-scroll">
        <div className="timeline-board">
          <div className="timeline" aria-label="Resumen visual de condiciones">
            {intervals.map((interval) => (
              <span
                key={interval.time}
                className={`rating-${interval.rating}`}
                title={`${formatTime(interval.time)} ${labelForRating(interval.rating)} ${interval.score}/100`}
              />
            ))}
          </div>
          <div className="timeline-labels">
            {hourLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="hourly-summary" aria-label="Resumen por horas">
        {hourly.map((interval) => (
          <article className={`hour-card rating-${interval.rating}`} key={interval.time}>
            <strong>{formatTime(interval.time)}</strong>
            <span>{interval.score}/100</span>
            <small>{labelForRating(interval.rating)}</small>
            <small>{interval.tide ? `Marea ${Math.round(interval.tide.percentage)} %` : "Sin marea"}</small>
            <small>{temperatureMetric(interval)}</small>
            <small>{uvMetric(interval)}</small>
          </article>
        ))}
      </div>
      <div className="rating-legend" aria-label="Leyenda de colores">
        {appConfig.ratingBands.map((band) => (
          <span key={band.rating}>
            <i className={`rating-${band.rating}`} aria-hidden="true" />
            {band.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function Slots({ slots }: { slots: BathingSlot[] }) {
  return (
    <section className="slot-list">
      {slots.map((slot) => (
        <article className={`slot-card rating-${slot.rating}`} key={slot.startTime}>
          <header>
            <div>
              <h3>
                {formatTime(slot.startTime)}-{formatTime(slot.endTime)}
              </h3>
              <p>
                {labelForRating(slot.rating)} · {slot.averageScore}/100 · mínimo {slot.minimumScore}
              </p>
            </div>
            {!slot.isRecommended && <span className="badge">No recomendable</span>}
          </header>
          <ul>
            {slot.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <UvNotice interval={slot.intervals[Math.floor(slot.intervals.length / 2)]} />
        </article>
      ))}
    </section>
  );
}

function TideSection({
  date,
  extremes,
  intervals,
  bestSlot,
}: {
  date: string;
  extremes: TideExtreme[];
  intervals: EvaluationInterval[];
  bestSlot: BathingSlot | null | undefined;
}) {
  const points = intervals.filter((interval) => interval.tide);
  const polyline = points
    .map((interval, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 100;
      const y = 100 - (interval.tide?.percentage ?? 0);
      return `${x},${y}`;
    })
    .join(" ");

  const bestStartIndex = bestSlot ? points.findIndex((interval) => interval.time === bestSlot.startTime) : -1;
  const bestEndIndex = bestSlot ? points.findIndex((interval) => interval.endTime === bestSlot.endTime) : -1;
  const bandX = bestStartIndex >= 0 ? (bestStartIndex / Math.max(1, points.length - 1)) * 100 : 0;
  const bandWidth =
    bestStartIndex >= 0 && bestEndIndex >= 0 ? ((bestEndIndex - bestStartIndex + 1) / Math.max(1, points.length - 1)) * 100 : 0;

  return (
    <section className="section-block">
      <div className="section-title">
        <h2>Mareas</h2>
        <span>{appConfig.location.tideStationName}</span>
      </div>
      <div className="tide-extremes">
        {extremes
          .filter((extreme) => extreme.time.startsWith(date))
          .map((extreme) => (
            <span key={`${extreme.time}-${extreme.type}`}>
              {extreme.type === "high" ? "Pleamar" : "Bajamar"} {formatTime(extreme.time)} · {extreme.heightMeters.toFixed(2)} m
            </span>
          ))}
      </div>
      <svg className="tide-chart" viewBox="0 0 100 100" role="img" aria-label="Evolución de la marea entre 09:00 y 21:00">
        <rect x="0" y="0" width="100" height="100" rx="4" />
        {bestSlot && <rect className="best-band" x={bandX} y="0" width={Math.max(5, bandWidth)} height="100" />}
        <line x1="0" y1="50" x2="100" y2="50" />
        <polyline points={polyline} />
      </svg>
      <p className="formula-note">
        Altura estimada con interpolación cosenoidal entre bajamar y pleamar para evitar cambios lineales artificiales.
      </p>
    </section>
  );
}

function WeatherSection({ intervals }: { intervals: EvaluationInterval[] }) {
  return (
    <section className="section-block">
      <div className="section-title">
        <h2>Meteorología</h2>
        <span>Resumen horario</span>
      </div>
      <div className="weather-strip">
        {intervals
          .filter((_, index) => index % 2 === 0)
          .map((interval) => (
            <article key={interval.time}>
              <strong>{formatTime(interval.time)}</strong>
              <CloudSun size={18} aria-hidden="true" />
              <span>{temperatureMetric(interval)}</span>
              <span>{humidityMetric(interval)}</span>
              <span>{windMetric(interval)}</span>
              <span>{uvMetric(interval)}</span>
              <small>{interval.weather?.skyState ?? "Sin datos"}</small>
            </article>
          ))}
      </div>
    </section>
  );
}

function nextHigh(interval: EvaluationInterval) {
  if (interval.tide?.nextExtreme.type === "high") return formatTime(interval.tide.nextExtreme.time);
  const high = interval.tide ? interval.tide.nextExtreme.time : null;
  return high ? formatTime(high) : "--:--";
}

function windMetric(interval: EvaluationInterval) {
  const wind = interval.weather?.windSpeedKmh;
  if (wind === null || wind === undefined) return "Sin viento";
  const direction = describeWindDirection(interval.weather?.windDirectionDeg, wind);
  return `${direction.label} · ${Math.round(wind)} km/h`;
}

function temperatureMetric(interval: EvaluationInterval) {
  const temp = interval.weather?.airTemperatureC;
  if (temp === null || temp === undefined) return "Sin temp.";
  const feels = interval.weather?.apparentTemperatureC;
  if (feels === null || feels === undefined || Math.round(feels) === Math.round(temp)) return `${Math.round(temp)} °C`;
  return `${Math.round(temp)} °C · sens. ${Math.round(feels)} °C`;
}

function humidityMetric(interval: EvaluationInterval) {
  const humidity = interval.weather?.relativeHumidityPercent;
  if (humidity === null || humidity === undefined) return "Humedad --";
  return `Humedad ${Math.round(humidity)} %`;
}

function uvMetric(interval: EvaluationInterval) {
  const uv = interval.weather?.uvIndex;
  if (uv === null || uv === undefined) return "UV --";
  return describeUv(uv).split(":")[0];
}

function UvNotice({ interval, variant = "default" }: { interval: EvaluationInterval; variant?: "default" | "hero" }) {
  const uv = interval.weather?.uvIndex;
  if (uv === null || uv === undefined) return null;
  const text = describeUv(uv);
  return (
    <p className={`uv-notice ${variant === "hero" ? "hero-uv-notice" : ""}`}>
      <Sun size={16} aria-hidden="true" />
      {text}
    </p>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
