import Papa from 'papaparse';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const CSV_URL = 'https://www.cryptodatadownload.com/cdd/Bitstamp_BTCUSD_d.csv';

let allPricesCache: Record<string, number> | null = null;
let lastFetched = 0;

export const fetchBtcUsdPrices = async () => {
	const now = Date.now();
	if (allPricesCache && now - lastFetched < CACHE_TTL) return allPricesCache;

	const res = await fetch(CSV_URL);
	if (!res.ok) throw new Error(`Failed to fetch BTC CSV: ${res.status}`);

	const text = await res.text();

	// Remove comment lines and empty lines
	const lines = text.split('\n').map((l) => l);
	const url = lines.shift();

	const parsed = Papa.parse(lines.join('\n'), { header: true, skipEmptyLines: true })
		.data as Record<string, string>[];

	const map: Record<string, number> = {};

	parsed.forEach((row) => {
		const dateStr = row.date;
		const closeStr = row.close;

		if (!dateStr || !closeStr) return;

		const price = Number(closeStr);
		if (isNaN(price)) return;

		// parse date safely
		const dateObj = new Date(dateStr);
		if (isNaN(dateObj.getTime())) return; // skip invalid dates

		const date = dateObj.toISOString().slice(0, 10);

		map[date] = price;
	});

	allPricesCache = map;
	lastFetched = now;
	return allPricesCache;
};
