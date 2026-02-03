<script lang="ts">
	import { updateBudget } from '$lib/remote/budget.remote';
	import { formatCurrency, formatNumber } from '$lib/utils';
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { getDcaDecision } from '$lib/remote/dca.remote';
	import { getOptions } from '$lib/remote/options.remote';
	import { getHoldersValue } from '$lib/remote/holders.remote';
	import {
		createAndGetStrikeQuote,
		getStrikeBalances,
		getStrikeCurrentPrice
	} from '$lib/remote/strike.remote';
	import BTCChart from './BTCChart.svelte';
	import ResizablePanel from './ResizablePanel.svelte';
	import { getPrices } from '$lib/remote/prices.remote';

	type Options = {
		id: string;
		monthlyBudget: number;
		purchaseHistory: string;
	};

	let balances:
		| {
				currency: string;
				current: number;
				pending: number;
				outgoing: number;
				reserved: number;
				available: number;
				total: number;
		  }[]
		| null = $state(null);

	let options = $state<Options | null>(null);
	let chartData = $state<{ time: string; price: number }[] | null>(null);
	let purchaseHistory:
		| { date: string; amountGBP: number; amountBTC: number; feeGBP: number; exchangeRate: number }[]
		| null = $state(null);
	let interval: string | number | NodeJS.Timeout | undefined = undefined;
	let nextPurchaseInterval: string | number | NodeJS.Timeout | undefined = undefined;
	let gbpBuy = $state(10);
	let purchaseResult: any = $state(null);
	let dcaDecision: {
		holdersInProfit: number;
		band: {
			min: number;
			max: number;
			multiplier: number;
			label: string;
			graphLabel: string;
			color: string;
		};
		baseDailyBudget: number;
		adjustedDailyBudget: number;
		monthlyBudget: number;
		holdersMultiplier: number;
		// ma200Multiplier: number;
	} | null = $state(null);
	let currentPriceUSD = new Tween(0, {
		duration: 600,
		easing: cubicOut
	});
	let currentPriceGBP = new Tween(0, {
		duration: 600,
		easing: cubicOut
	});
	let holdersInProfit = new Tween(0, {
		duration: 600,
		easing: cubicOut
	});
	let fiftyWeekMovingAverage = new Tween(0, {
		duration: 600,
		easing: cubicOut
	});
	let oneHundredWeekMovingAverage = new Tween(0, {
		duration: 600,
		easing: cubicOut
	});
	let twoHundredWeekMovingAverage = new Tween(0, {
		duration: 600,
		easing: cubicOut
	});

	//Monthly Budget
	let monthlyBudget = $derived(options ? options.monthlyBudget : 0);
	let budgetEditMode = $state(false);
	//svelte-ignore non_reactive_update
	let monthlyBudgetInput: HTMLInputElement | null = null;

	async function fetchBalance() {
		balances = await fetch('/api/balance').then((r) => r.json());
	}

	async function handleBudgetButtonClick() {
		//toggle budget edit mode
		budgetEditMode = !budgetEditMode;

		//if budget edit mode is on, focus on the input field
		if (budgetEditMode) {
			//workaround for focus not working immediately
			setTimeout(() => {
				monthlyBudgetInput?.focus();
				monthlyBudgetInput?.select();
			}, 0);
		}

		//if budget edit mode is off, update the monthly budget
		if (!budgetEditMode) {
			await updateBudget(monthlyBudget);
		}
	}

	async function handleQuoteDebug() {
		const data = await createAndGetStrikeQuote(dcaDecision?.adjustedDailyBudget ?? 0);
	}

	async function refreshData() {
		balances = await getStrikeBalances();
		options = await getOptions();
		purchaseHistory = JSON.parse(options.purchaseHistory);
		const currentHolderProfitPercentage = await getHoldersValue();
		const prices = await getStrikeCurrentPrice();

		chartData = await loadChartData();

		const movingAverageData = [
			...chartData.map((data) => data.price),
			Number(prices.currentPriceUSD)
		];
		fiftyWeekMovingAverage.target = Number(lastMovingAverage(movingAverageData, 50 * 7));
		oneHundredWeekMovingAverage.target = Number(lastMovingAverage(movingAverageData, 100 * 7));
		twoHundredWeekMovingAverage.target = Number(lastMovingAverage(movingAverageData, 200 * 7));

		dcaDecision = await getDcaDecision({
			rawHolderProfitPercentage: currentHolderProfitPercentage,
			monthlyBudget: options.monthlyBudget,
			price: Number(prices.currentPriceUSD),
			ma200: twoHundredWeekMovingAverage.target as number
		});

		currentPriceUSD.target = parseFloat(prices.currentPriceUSD);
		currentPriceGBP.target = parseFloat(prices.currentPriceGBP);
		holdersInProfit.target = dcaDecision.holdersInProfit;
	}

	async function loadChartData() {
		const data = await getPrices();

		const prices = [];
		for (const [time, price] of Object.entries(data).reverse()) {
			prices.push({ time, price });
		}

		return prices;
	}

	function lastMovingAverage(data: number[], period: number): string | undefined {
		const result: (number | null)[] = new Array(data.length).fill(null);

		for (let i = period - 1; i < data.length; i++) {
			let sum = 0;
			for (let j = i - period + 1; j <= i; j++) {
				sum += data[j];
			}
			result[i] = sum / period;
		}

		return result[result.length - 1]?.toFixed(2);
	}

	function initNextPurchaseCountdown() {
		//12:00
		let purchaseTime =
			new Date().setHours(12, 0, 0, 0) < Date.now()
				? new Date().setHours(12, 0, 0, 0) + 86400000
				: new Date().setHours(12, 0, 0, 0);
		let timeLeft = purchaseTime - Date.now();
		if (timeLeft < 0) timeLeft = 0;

		nextPurchaseInterval = setInterval(async () => {
			const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
			const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
			const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);

			const hoursEl = document.querySelector<HTMLSpanElement>('#hours');
			if (!hoursEl) return;
			hoursEl.style.setProperty('--value', hours.toString());

			const minutesEl = document.querySelector<HTMLSpanElement>('#minutes');
			if (!minutesEl) return;
			minutesEl.style.setProperty('--value', minutes.toString());

			const secondsEl = document.querySelector<HTMLSpanElement>('#seconds');
			if (!secondsEl) return;
			secondsEl.style.setProperty('--value', seconds.toString());

			if (timeLeft <= 0) {
				clearInterval(nextPurchaseInterval);
			}

			timeLeft -= 1000;
		}, 1000);
	}

	let chartContainer: HTMLElement | null = null;
	let chartRef: { resize: () => void } | null = null;

	onMount(async () => {
		await refreshData();
		initNextPurchaseCountdown();

		interval = setInterval(async () => {
			await refreshData();
		}, 10000);
	});

	onDestroy(() => {
		clearInterval(interval);
		clearInterval(nextPurchaseInterval);
	});
</script>

<div class="flex flex-col gap-4">
	{#if balances && currentPriceGBP && currentPriceUSD}
		<section in:fade id="balances" class="grid grid-cols-1 gap-4 lg:grid-cols-4">
			{#each Object.values(balances) as balance}
				<div class="stat place-items-center rounded-2xl bg-base-200 card-border">
					{#if balance.currency === 'BTC'}
						<div class="stat-title">{'SATS'}</div>
						<div class="stat-value min-h-12">
							{formatNumber(String(balance.current * 100000000))}
						</div>
					{:else}
						<div class="stat-title">{balance.currency}</div>
						<div class="stat-value">{balance.current}</div>
					{/if}
				</div>
			{/each}
			<div class="stat place-items-center rounded-2xl bg-base-200 card-border">
				<div class="stat-title">Current Price GBP</div>
				<div id="price-gbp" class="stat-value">
					{currentPriceGBP.current.toFixed(2)}
				</div>
			</div>
			<div class="stat place-items-center rounded-2xl bg-base-200 card-border">
				<div class="stat-title">Current Price USD</div>
				<div id="price-usd" in:fade class="stat-value">{currentPriceUSD.current.toFixed(2)}</div>
			</div>
		</section>
	{/if}

	{#if dcaDecision}
		<section in:fade id="dca-decision" class="grid grid-cols-1 gap-4 lg:grid-cols-4">
			<div class="stat place-items-center rounded-2xl bg-base-200 card-border">
				<div class="stat-title">DCA Daily Amount GBP</div>
				<div in:fade class="stat-value">{dcaDecision.adjustedDailyBudget}</div>
			</div>
			<div class="stat place-items-center rounded-2xl bg-base-200 card-border">
				<div class="stat-title">Current DCA Band</div>
				<div in:fade class="stat-value">
					{dcaDecision.band.label}
				</div>
			</div>
			<div class="stat place-items-center rounded-2xl bg-base-200 card-border">
				<div class="stat-title">Current DCA Multiplier</div>
				<div in:fade class="stat-value">
					{dcaDecision.holdersMultiplier}
				</div>
			</div>
			<div class="stat place-items-center rounded-2xl bg-base-200 card-border">
				<div class="stat-title">Holders In Profit (%)</div>
				<div class="stat-value">{holdersInProfit.current.toFixed(2)}</div>
			</div>
		</section>

		<section in:fade class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div class="stat place-items-center rounded-2xl bg-base-200 card-border">
				<div class="stat-title">Time Till Next Purchase</div>
				<!-- <div in:fade class="stat-value"> -->
				<span class="countdown text-4xl font-bold">
					<span id="hours" style="--value:10; --digits:2;" aria-live="polite" aria-label="10"
						>10</span
					>
					:
					<span id="minutes" style="--value:24; --digits:2;" aria-live="polite" aria-label="24"
						>24</span
					>
					:
					<span id="seconds" style="--value:59; --digits:2;" aria-live="polite" aria-label="59"
						>59</span
					>
				</span>
				<!-- </div> -->
			</div>

			<div class="stat place-items-center rounded-2xl bg-base-200 card-border">
				<h2 class="stat-title">Monthly Budget GBP</h2>
				<p></p>
				<div class="stat-value">
					<input
						class={'input input-sm ' + (budgetEditMode ? '' : 'hidden')}
						id="monthlyBudgetInput"
						bind:this={monthlyBudgetInput}
						type="text"
						pattern={'^\$\d{(1, 3)}(,\d{3})*(\.\d+)?$'}
						data-type="currency"
						onkeyup={(e) => formatCurrency(e.currentTarget, '')}
						bind:value={monthlyBudget}
					/>
					{budgetEditMode ? '' : monthlyBudget}
				</div>
				<div class="stat-actions">
					<button
						class={'btn w-20 btn-xs ' + (budgetEditMode ? 'btn-primary' : 'btn-secondary')}
						onclick={() => handleBudgetButtonClick()}>{budgetEditMode ? 'Save' : 'Edit'}</button
					>
				</div>
			</div>
		</section>
	{/if}

	{#if chartData}
		<section in:fade class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<div class="stat place-items-center rounded-2xl bg-base-200 card-border">
				<div class="stat-title">50 Week Moving USD</div>
				<div in:fade class="stat-value">
					{fiftyWeekMovingAverage.current.toFixed(2)}
				</div>
			</div>
			<div class="stat place-items-center rounded-2xl bg-base-200 card-border">
				<div class="stat-title">100 Week Moving Average USD</div>
				<div in:fade class="stat-value">
					{oneHundredWeekMovingAverage.current.toFixed(2)}
				</div>
			</div>
			<div class="stat place-items-center rounded-2xl bg-base-200 card-border">
				<div class="stat-title">200 Week Moving Average USD</div>
				<div in:fade class="stat-value">
					{twoHundredWeekMovingAverage.current.toFixed(2)}
				</div>
			</div>
		</section>
	{/if}

	<section id="chart">
		<ResizablePanel
			initialHeight={400}
			minHeight={250}
			maxHeight={900}
			persistKey="btc-chart-height"
		>
			<BTCChart {chartData} />
		</ResizablePanel>
	</section>

	<section id="quote-purchase-debug">
		<div class="card bg-base-200 card-border">
			<div class="card-body items-center">
				<h2 class="card-title">Quote Purchase Debug</h2>
				<div class="card-actions">
					<button class="btn btn-xs btn-primary" onclick={() => handleQuoteDebug()}>Debug</button>
				</div>
			</div>
		</div>
	</section>
</div>
