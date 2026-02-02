// src/lib/price.ts
type PricePoint = {
	price: number;
	timestamp: number;
};

export type PriceSnapshot = {
	price: number;
	drawdown24hPct: number;
	drawdown72hPct: number;
};

async function fetchMarketChart(days: number): Promise<PricePoint[]> {
	const url =
		'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart' +
		`?vs_currency=gbp&days=${days}&interval=hourly`;

	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`CoinGecko error: ${res.status}`);
	}

	const data = await res.json();

	return data.prices.map((p: [number, number]) => ({
		timestamp: p[0],
		price: p[1]
	}));
}

export async function getPriceSnapshot(): Promise<PriceSnapshot> {
	const points = await fetchMarketChart(4); // 4 days ≈ 96 hours

	const latest = points[points.length - 1];
	const nowPrice = latest.price;

	const hoursAgo = (h: number) => {
		const targetTs = latest.timestamp - h * 60 * 60 * 1000;
		return (
			points.reduce((prev, curr) =>
				Math.abs(curr.timestamp - targetTs) < Math.abs(prev.timestamp - targetTs) ? curr : prev
			) ?? latest
		);
	};

	const p24 = hoursAgo(24).price;
	const p72 = hoursAgo(72).price;

	const drawdown24hPct = ((nowPrice - p24) / p24) * 100;
	const drawdown72hPct = ((nowPrice - p72) / p72) * 100;

	return {
		price: Number(nowPrice.toFixed(2)),
		drawdown24hPct: Number(drawdown24hPct.toFixed(2)),
		drawdown72hPct: Number(drawdown72hPct.toFixed(2))
	};
}
