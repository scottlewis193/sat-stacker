import { BASE_DAILY, CRASH_OVERRIDE_CAP, CRASH_OVERRIDE_MULT } from './config';

export function applyCrashOverride({
	normalBuy,
	drawdownPct,
	remainingBudget
}: {
	normalBuy: number;
	drawdownPct: number;
	remainingBudget: number;
}) {
	if (drawdownPct > -15) return normalBuy;

	const crashBuy = Math.min(BASE_DAILY * CRASH_OVERRIDE_MULT, remainingBudget, CRASH_OVERRIDE_CAP);

	return Math.max(normalBuy, crashBuy);
}
