import { appConfig } from "../config/scoring";

export function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localIso(date: string, hour: number, minute = 0) {
  return `${date}T${pad(hour)}:${pad(minute)}:00`;
}

export function currentLocalIso() {
  const now = new Date();
  return localIso(toDateInputValue(now), now.getHours(), now.getMinutes());
}

export function minutesBetween(startIso: string, endIso: string) {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}

export function addMinutes(iso: string, minutes: number) {
  const date = iso.slice(0, 10);
  const hour = Number(iso.slice(11, 13));
  const minute = Number(iso.slice(14, 16));
  const totalMinutes = hour * 60 + minute + minutes;
  const daysToAdd = Math.floor(totalMinutes / 1440);
  const minuteOfDay = ((totalMinutes % 1440) + 1440) % 1440;
  const base = new Date(`${date}T12:00:00`);
  base.setDate(base.getDate() + daysToAdd);

  return localIso(toDateInputValue(base), Math.floor(minuteOfDay / 60), minuteOfDay % 60);
}

export function hourOf(iso: string) {
  return Number(iso.slice(11, 13)) + Number(iso.slice(14, 16)) / 60;
}

export function formatTime(iso: string) {
  return iso.slice(11, 16);
}

export function formatDateLong(date: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: appConfig.location.timezone,
  }).format(new Date(`${date}T12:00:00`));
}

export function buildDayIntervals(date: string) {
  const intervals: string[] = [];
  const { startHour, endHour, intervalMinutes } = appConfig.schedule;

  for (let minutes = startHour * 60; minutes < endHour * 60; minutes += intervalMinutes) {
    intervals.push(localIso(date, Math.floor(minutes / 60), minutes % 60));
  }

  return intervals;
}
