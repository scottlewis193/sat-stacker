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

		let result = runBacktest(holdersSeries, (date) => priceHistory[date] ?? NaN, {
			monthlyBudgetUSD,
			smaWindow: 7
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
