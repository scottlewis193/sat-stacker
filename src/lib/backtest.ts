// src/lib/backtest.ts

import type { HolderPoint } from './server/holders';
import { getDailyBudgetFromHolders } from './server/dca';

export type BacktestConfig = {
	monthlyBudgetUSD: number;
	smaWindow: number;
	twoHundredWeekMovingAverage: Record<string, number | null>;
};

export type BacktestDay = {
	date: string;

	holdersRaw: number;
	holdersAdjusted: number;
	holdersSMA: number;

	bandLabel: string;
	multiplier: number;

	baseDailyBudget: number;
	adjustedDailyBudget: number;

	btcPriceUSD: number;
	btcBought: number;
	twoHundredWeekMovingAveragePriceUSD: number | null;

	usdSpentToday: number;
	feePaidUSD: number;

	cashBalanceUSD: number;

	cumulativeUSDSpent: number;
	cumulativeBTC: number;

	adjustedHoldersForBand: number;
	ma200DistancePct: number;
};

export type BacktestResult = {
	config: BacktestConfig;
	days: BacktestDay[];
	totalUSDSpent: number;
	totalBTC: number;
	averageCostBasisUSD: number;
	cashBalanceUSD: number;
	totalFeesPaidUSD: number;
};

const STRIKE_FEE_RATE = 0.0129; // 1.29%

/**
 * Simple trailing SMA for holders-in-profit.
 */
function smaAt(series: HolderPoint[], idx: number, window: number): number | null {
	if (idx + 1 < window) return null;

	const slice = series.slice(idx + 1 - window, idx + 1);
	const sum = slice.reduce((acc, p) => acc + p.supply_in_profit_pct, 0);

	return sum / window;
}

/**
 * Core backtest loop.
 *
 * btcPriceLookup(date) must return BTC price in GBP for that day.
 */
export function runBacktest(
	holdersSeries: HolderPoint[],
	btcPriceLookup: (date: string) => number | null,

	config: BacktestConfig
): BacktestResult {
	const { monthlyBudgetUSD, smaWindow, twoHundredWeekMovingAverage } = config;

	let cumulativeUSDSpent = 0;
	let cumulativeBTC = 0;
	let cashBalanceUSD = 0;
	let totalFeesPaidUSD = 0;

	const days: BacktestDay[] = [];

	for (let i = 0; i < holdersSeries.length; i++) {
		const point = holdersSeries[i];

		const sma = smaAt(holdersSeries, i, smaWindow);
		if (sma === null) continue;

		const btcPriceUSD = btcPriceLookup(point.date);
		const twoHundredWeekMovingAveragePriceUSD = twoHundredWeekMovingAverage[point.date];

		if (!btcPriceUSD) continue;

		const decision = getDailyBudgetFromHolders(
			point.supply_in_profit_pct,
			monthlyBudgetUSD,
			btcPriceUSD,
			twoHundredWeekMovingAveragePriceUSD
		);

		// 1 Receive today's budget
		cashBalanceUSD += decision.baseDailyBudget;

		// 2 Desired spend based on DCA band
		const desiredSpend = decision.adjustedDailyBudget;

		// 3 Actual spend is constrained by available cash
		const usdSpentToday = Math.min(desiredSpend, cashBalanceUSD);

		// 4 Execute purchase
		cashBalanceUSD -= usdSpentToday;

		// 5 Strike fee
		const feePaidUSD = usdSpentToday * STRIKE_FEE_RATE;
		const netUsdForBtc = usdSpentToday - feePaidUSD;

		const btcBought = netUsdForBtc / btcPriceUSD;

		// 6 Update totals
		totalFeesPaidUSD += feePaidUSD;
		cumulativeUSDSpent += usdSpentToday;
		cumulativeBTC += btcBought;

		const adjustedHolders = adjustHoldersFor200Wma(
			point.supply_in_profit_pct,
			btcPriceUSD,
			twoHundredWeekMovingAveragePriceUSD
		);

		days.push({
			date: point.date,

			holdersRaw: point.supply_in_profit_pct,
			holdersAdjusted: decision.holdersAdjusted,
			holdersSMA: sma,

			bandLabel: decision.band.label,
			multiplier: decision.band.multiplier,
			twoHundredWeekMovingAveragePriceUSD: twoHundredWeekMovingAveragePriceUSD,
			baseDailyBudget: decision.baseDailyBudget,
			adjustedDailyBudget: desiredSpend,

			usdSpentToday,
			cashBalanceUSD: round2(cashBalanceUSD),

			btcPriceUSD,
			btcBought,

			cumulativeUSDSpent: round2(cumulativeUSDSpent),
			cumulativeBTC,
			feePaidUSD: round2(feePaidUSD),

			adjustedHoldersForBand: round2(adjustedHolders),
			ma200DistancePct: round2(
				((btcPriceUSD - (twoHundredWeekMovingAveragePriceUSD ?? 0)) /
					(twoHundredWeekMovingAveragePriceUSD ?? 0)) *
					100
			)
		});
	}

	const totalUSDSpent = round2(cumulativeUSDSpent);
	const totalBTC = cumulativeBTC;
	const averageCostBasisUSD = totalBTC > 0 ? round2(totalUSDSpent / totalBTC) : 0;

	return {
		config,
		days,
		totalUSDSpent,
		totalBTC,
		averageCostBasisUSD,
		cashBalanceUSD,
		totalFeesPaidUSD: round2(totalFeesPaidUSD)
	};
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

function adjustHoldersFor200Wma(
	holdersInProfit: number,
	price: number,
	ma200: number | null
): number {
	if (!ma200) return holdersInProfit;

	const distance = (price - ma200) / ma200;

	// Bias ranges (in percentage points)
	let adjustment = 0;

	if (distance <= -0.4) adjustment = -20;
	else if (distance <= -0.2) adjustment = -12;
	else if (distance <= 0) adjustment = -5;
	else if (distance <= 0.3) adjustment = +5;
	else if (distance <= 0.6) adjustment = +12;
	else adjustment = +20;

	return Math.min(100, Math.max(0, holdersInProfit + adjustment));
}
