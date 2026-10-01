export function level(xp: number) {
  return Math.floor(xp / 200) + 1;
}
export function rank(xp: number) {
  return xp >= 36000
    ? "S"
    : xp >= 18000
      ? "A"
      : xp >= 9000
        ? "B"
        : xp >= 4500
          ? "C"
          : xp >= 1500
            ? "D"
            : "E";
}
export function radarScore(xp: number) {
  return Math.min(100, 20 + Math.floor(2.5 * Math.sqrt(xp)));
}
export function localDate(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}
export function shiftDate(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function streak(dates: string[], today: string) {
  const active = new Set(dates);
  let date = active.has(today) ? today : shiftDate(today, -1);
  let count = 0;
  while (active.has(date)) {
    count++;
    date = shiftDate(date, -1);
  }
  return count;
}
