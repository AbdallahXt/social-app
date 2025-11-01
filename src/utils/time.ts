export function parseDurationToMs(v: string): number {
  const m = /^([0-9]+)\s*([smhd])$/.exec(v.trim());
  if (!m) return Number(v) || 0;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  switch (unit) {
    case 's':
      return n * 1000;
    case 'm':
      return n * 60 * 1000;
    case 'h':
      return n * 60 * 60 * 1000;
    case 'd':
      return n * 24 * 60 * 60 * 1000;
    default:
      return n;
  }
}

export function addMs(date: Date, ms: number) {
  return new Date(date.getTime() + ms);
}
