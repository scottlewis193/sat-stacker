// src/lib/holders.ts

import { fetchBtcUsdPrices } from './prices';
import { getRates } from './strike';

export type HolderPoint = {
	date: string; // YYYY-MM-DD
	supply_in_profit_pct: number; // % supply in profit
	supply_in_loss_pct: number; // % supply in loss
	raw_supply_in_profit_pct?: number; // optional original
};

const DATA_URL = 'https://charts.bgeometrics.com/files/profit_loss.json';

let cache: HolderPoint[] | null = null;

function applyHoldersDMA(points: HolderPoint[], days = 7): HolderPoint[] {
	if (points.length < days) return points;

	return points.map((p, i) => {
		if (i < days - 1) {
			return p;
		}

		const window = points.slice(i - days + 1, i + 1);
		const sum = window.reduce((acc, d) => acc + d.raw_supply_in_profit_pct!, 0);

		const dma = sum / days;

		return {
			...p,
			supply_in_profit_pct: round2(dma),
			supply_in_loss_pct: round2(100 - dma)
		};
	});
}

export async function fetchHoldersDataset(): Promise<HolderPoint[]> {
	if (cache) return cache;

	const res = await fetch(DATA_URL);
	if (!res.ok) throw new Error(`Holders dataset error: ${res.status}`);

	const raw: any[][] = await res.json();

	const mapped: HolderPoint[] = raw
		.filter(([ts, val]) => val !== null && Number.isFinite(val))
		.map(([ts, val]) => {
			const pct = Number(val);

			return {
				date: new Date(ts).toISOString().slice(0, 10),
				supply_in_profit_pct: pct, // temporary
				supply_in_loss_pct: 100 - pct,
				raw_supply_in_profit_pct: pct
			};
		});

	//  Apply 7DMA once, centrally
	cache = applyHoldersDMA(mapped, 7);

	return cache;
}

export async function getLatestHoldersValue(): Promise<number> {
	const series = await fetchHoldersDataset();

	const btcPriceUsd = parseFloat((await getRates()).usdRate);
	const priceByDate = await fetchBtcUsdPrices();
	return estimateTodaysHoldersInProfit(series, priceByDate, btcPriceUsd);
}

/**
 * Estimate today's holders-in-profit %
 * using last on-chain value + price delta
 */
export function estimateTodaysHoldersInProfit(
	series: HolderPoint[],
	priceByDate: Record<string, number>,
	currentBtcUsd: number
): number {
	if (series.length === 0) {
		throw new Error('Holder series is empty');
	}

	const latest = series[series.length - 1];
	const lastPrice = priceByDate[latest.date];

	if (!lastPrice) {
		throw new Error(`Missing BTC price for ${latest.date}`);
	}

	const priceRatio = currentBtcUsd / lastPrice;

	let estimated = latest.supply_in_profit_pct * priceRatio;

	// Clamp
	estimated = Math.max(0, Math.min(100, estimated));

	return round2(estimated);
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

/**
 * Simple trailing N-day SMA of supply_in_profit_pct
 */
export async function getHoldersSMA(days = 7): Promise<{
	date: string;
	raw: number;
	sma: number;
}> {
	const series = await fetchHoldersDataset();

	if (series.length < days) {
		throw new Error(`Not enough data for SMA${days}`);
	}

	const window = series.slice(-days);
	const sum = window.reduce((acc, p) => acc + p.supply_in_profit_pct, 0);

	const sma = sum / days;
	const latest = series[series.length - 1];

	return {
		date: latest.date,
		raw: latest.supply_in_profit_pct,
		sma
	};
}

function computeHoldersDMA(series: HolderPoint[], days = 7): number {
	if (series.length < days) {
		throw new Error(`Not enough holder data for ${days}DMA`);
	}

	const window = series.slice(-days);
	const sum = window.reduce((acc, p) => acc + p.supply_in_profit_pct, 0);

	return sum / days;
}
