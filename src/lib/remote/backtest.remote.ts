import { query } from '$app/server';
import { runBacktest } from '$lib/backtest';
import { fetchHoldersDataset } from '$lib/server/holders';
import { fetchBtcUsdPrices } from '$lib/server/prices';

export const backtest = query(
	'unchecked',
	async (config: { startDate: string; monthlyBudgetUSD: number }) => {
		const { startDate, monthlyBudgetUSD } = config;

		// ... fetch holdersSeries and priceHistory
		const holdersSeries = await fetchHoldersDataset();
		const priceHistory = await fetchBtcUsdPrices();
		const twoHundredWeekMovingAverage = movingAverageByDate(priceHistory, 200 * 7);

		let result = runBacktest(holdersSeries, (date) => priceHistory[date] ?? NaN, {
			monthlyBudgetUSD,
			smaWindow: 7,
			twoHundredWeekMovingAverage
		});

		// filter days to start from requested date
		if (startDate) {
			result.days = result.days.filter((d) => d.date >= startDate);
		}

		// compute cumulative BTC and USD from filtered days
		let cumulativeBTC = 0;
		let cumulativeUSDSpent = 0;
		let cumulativeUSDBalance = 0;
		let cumulativeFeePaidUSD = 0;
		const days = result.days.map((d) => {
			cumulativeUSDSpent += d.adjustedDailyBudget;
			cumulativeBTC += d.btcBought ?? 0;
			cumulativeUSDBalance += d.baseDailyBudget ?? 0;
			cumulativeUSDBalance -= d.usdSpentToday ?? 0;
			cumulativeFeePaidUSD += d.feePaidUSD ?? 0;
			return { ...d, cumulativeBTC, cumulativeUSDSpent, cumulativeUSDBalance };
		});

		return {
			ok: true,
			summary: {
				totalUSDSpent: cumulativeUSDSpent,
				cashBalanceUSD: cumulativeUSDBalance,
				totalBTC: cumulativeBTC,
				totalFeesPaidUSD: cumulativeFeePaidUSD,
				averageCostBasisUSD: cumulativeBTC > 0 ? cumulativeUSDSpent / cumulativeBTC : 0
			},
			config: result.config,
			days
		};
	}
);

function movingAverage(data: number[], period: number): (number | null)[] {
	const result: (number | null)[] = new Array(data.length).fill(null);

	for (let i = period - 1; i < data.length; i++) {
		let sum = 0;
		for (let j = i - period + 1; j <= i; j++) {
			sum += data[j];
		}
		result[i] = sum / period;
	}

	return result;
}

//data is date: value
function movingAverageByDate(
	data: Record<string, number>,
	period: number
): Record<string, number | null> {
	const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b)); // ISO date-safe sort

	const result: Record<string, number | null> = {};

	for (let i = 0; i < entries.length; i++) {
		if (i + 1 < period) {
			result[entries[i][0]] = null;
			continue;
		}

		let sum = 0;
		for (let j = i - period + 1; j <= i; j++) {
			sum += entries[j][1];
		}

		result[entries[i][0]] = sum / period;
	}

	return result;
}
