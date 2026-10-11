// Gratisperiode: alle butikker er gratis frem til lansering + 3 måneder.
// Lanseringsdatoen settes som miljøvariabel LAUNCH_DATE i Vercel (f.eks. "2026-11-01").
// Er den ikke satt, regnes nettsiden som ikke lansert ennå, og alt er gratis.

const FREE_MONTHS = 3;

export type FreePeriod = {
  free: boolean;
  freeUntil: string | null; // ISO-dato, null hvis lanseringsdato ikke er satt
};

export function getFreePeriod(now: Date = new Date()): FreePeriod {
  const raw = process.env.LAUNCH_DATE?.trim();
  if (!raw) return { free: true, freeUntil: null };

  const launch = new Date(raw);
  if (isNaN(launch.getTime())) {
    console.error(`Ugyldig LAUNCH_DATE: "${raw}" (bruk formatet ÅÅÅÅ-MM-DD)`);
    return { free: true, freeUntil: null };
  }

  const freeUntil = new Date(launch);
  freeUntil.setMonth(freeUntil.getMonth() + FREE_MONTHS);
  return { free: now < freeUntil, freeUntil: freeUntil.toISOString() };
}
