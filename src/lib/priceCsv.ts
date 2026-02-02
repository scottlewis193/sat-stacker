// src/lib/priceCsv.ts
import fs from 'fs';

let priceMap: Record<string, number> | null = null;

export function loadBtcUsdPrices(filePath: string): Record<string, number> {
	if (priceMap) return priceMap;

	const csv = fs.readFileSync(filePath, 'utf-8');
	const lines = csv.split('\n').slice(1); // skip header

	priceMap = {};

	lines.forEach((line) => {
		if (!line.trim()) return;
		const [dateStr, open, high, low, close] = line.split(',');
		const date = new Date(dateStr).toISOString().slice(0, 10);
		const price = Number(close);
		if (!isNaN(price)) {
			priceMap![date] = price;
		}
	});

	return priceMap;
}
