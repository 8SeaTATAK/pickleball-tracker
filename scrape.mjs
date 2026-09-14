// Tennis World North Ryde pickleball availability scraper.
// Fetches the MindBody widget's Next.js RSC schedule payload per court,
// extracts the embedded `initialAvailabilityData`, filters to the hours
// Victor cares about, and writes data/availability.json.
//
// Run: node scrape.mjs

const WIDGET_ID = "7b9803fef1";
const RSC_ID = "1k46u"; // any stable RSC build id works for this endpoint

const COURTS = [
  ["Ct1", 132, "100000022"], ["Ct2", 132, "100000023"], ["Ct3", 132, "100000024"], ["Ct4", 132, "100000025"],
  ["Ct5", 120, "100000152"], ["Ct6", 120, "100000153"], ["Ct7", 120, "100000154"], ["Ct8", 120, "100000155"],
  ["Ct9", 120, "100000156"], ["Ct10", 120, "100000157"], ["Ct11", 120, "100000158"], ["Ct12", 120, "100000159"],
  ["Ct13", 120, "100000162"], ["Ct14", 120, "100000163"], ["Ct15", 120, "100000164"], ["Ct16", 120, "100000165"],
];

function extractAvailability(text) {
  const key = 'initialAvailabilityData":';
  const i0 = text.indexOf(key);
  if (i0 < 0) return null;
  let i = i0 + key.length;
  let depth = 0, start = i;
  for (let k = i; k < text.length; k++) {
    const c = text[k];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, k + 1);
    }
  }
  return null;
}

function keep(dateStr, hhmm) {
  const dow = new Date(dateStr + "T00:00:00").getDay(); // 0 Sun .. 6 Sat
  const mins = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
  const weekend = dow === 0 || dow === 6;
  return weekend ? mins >= 14 * 60 : mins >= 19 * 60;
}

function todayStr() {
  // Sydney local date (site's own timezone), not the runner's UTC date.
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

async function fetchCourt(svc, staffId) {
  const url = `https://go.mindbodyonline.com/book/widgets/appointments/view/${WIDGET_ID}/schedule?locationId=1&serviceId=${svc}&staffId=${staffId}&_rsc=${RSC_ID}`;
  const res = await fetch(url, { headers: { RSC: "1" } });
  if (!res.ok) throw new Error(`fetch failed ${res.status} for staffId ${staffId}`);
  const text = await res.text();
  const block = extractAvailability(text);
  if (!block) return {};
  return JSON.parse(block);
}

async function main() {
  const today = todayStr();
  const byDate = {};

  for (const [name, svc, staffId] of COURTS) {
    let data;
    try {
      data = await fetchCourt(svc, staffId);
    } catch (e) {
      console.error(`Skipping ${name}: ${e.message}`);
      continue;
    }
    for (const [date, parts] of Object.entries(data)) {
      if (date < today) continue; // drop past dates
      const all = [
        ...(parts.Morning || []),
        ...(parts.Afternoon || []),
        ...(parts.Evening || []),
        ...(parts.Night || []),
      ];
      const times = all.map((s) => s.time.slice(11, 16)).filter((t) => keep(date, t));
      if (times.length) {
        byDate[date] = byDate[date] || {};
        byDate[date][name] = times;
      }
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    data: byDate,
  };

  const fs = await import("node:fs/promises");
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile("data/availability.json", JSON.stringify(out, null, 2));
  console.log(`Wrote data/availability.json — ${Object.keys(byDate).length} dates.`);

  // Prune past dates from Victor's own bookings file too, so old green
  // markings disappear on their own instead of piling up.
  try {
    const mineRaw = await fs.readFile("data/mine.json", "utf8");
    const mine = JSON.parse(mineRaw);
    const pruned = Object.fromEntries(Object.entries(mine).filter(([date]) => date >= today));
    if (JSON.stringify(pruned) !== JSON.stringify(mine)) {
      await fs.writeFile("data/mine.json", JSON.stringify(pruned, null, 2) + "\n");
      console.log("Pruned past dates from data/mine.json.");
    }
  } catch (e) {
    console.error(`Could not prune mine.json: ${e.message}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
