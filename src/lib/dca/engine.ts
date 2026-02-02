import { BASE_DAILY, MAX_DAILY, MONTHLY_BUDGET } from './config';
import { multiplierFromH, regimeNameFromH } from './regimes';
import { applyCrashOverride } from './crash';

export function computeDailyBuy({
	holdersInProfitSMA7,
	spentThisMonth,
	carryOver
}: {
	holdersInProfitSMA7: number;
	spentThisMonth: number;
	carryOver: number;
}) {
	const effectiveMonthlyBudget = MONTHLY_BUDGET + carryOver;
	const remainingBudget = effectiveMonthlyBudget - spentThisMonth;

	if (remainingBudget <= 0) return { normalBuy: 0, remainingBudget };

	const mult = multiplierFromH(holdersInProfitSMA7);
	const rawBuy = BASE_DAILY * mult;

	const normalBuy = Math.min(rawBuy, remainingBudget, MAX_DAILY);

	return {
		normalBuy: Number(normalBuy.toFixed(2)),
		remainingBudget,
		multiplier: mult,
		regime: regimeNameFromH(holdersInProfitSMA7)
	};
}
