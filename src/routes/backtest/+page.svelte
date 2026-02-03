<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';

	import annotationPlugin from 'chartjs-plugin-annotation';
	import { getBands } from '$lib/remote/dca.remote';
	import { backtest } from '$lib/remote/backtest.remote';

	Chart.register(...registerables, annotationPlugin);

	let loading = $state(false);
	let error: string | null = $state(null);
	let startDate: string = $state('2020-01-01');
	let monthlyBudget: number = $state(1100);
	let bands = await getBands();

	let summary: {
		totalUSDSpent: number;
		totalBTC: number;
		totalFeesPaidUSD: number;
		averageCostBasisUSD: number;
		cashBalanceUSD: number;
	} = $state({
		totalUSDSpent: 0,
		totalBTC: 0,
		totalFeesPaidUSD: 0,
		averageCostBasisUSD: 0,
		cashBalanceUSD: 0
	});

	let days: {
		date: string;
		cumulativeBTC: number;
		cumulativeUSDBalance: number;
		feePaidUSD: number;
		btcPriceUSD: number;
		btcBought: number;
		twoHundredWeekMovingAveragePriceUSD: number;
		holdersRaw: number;
		holdersAdjusted: number;
		profitPct: number;
	}[] = $state([]);

	let latestDay = $derived(days.length ? days[days.length - 1] : null);
	let currentValueUSD = $derived(latestDay ? latestDay.cumulativeBTC * latestDay.btcPriceUSD : 0);
	let currentProfitUSD = $derived(
		latestDay && summary && currentValueUSD ? currentValueUSD - summary.totalUSDSpent : 0
	);

	let chartCanvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;

	async function runBacktest() {
		if (!startDate) return;

		loading = true;
		error = null;

		try {
			const backtestConfig = {
				startDate,
				monthlyBudgetUSD: monthlyBudget
			};
			const data = await backtest(backtestConfig);

			summary = data.summary;
			days = data.days.map((d: any) => ({
				date: d.date,
				cumulativeBTC: d.cumulativeBTC,
				cumulativeUSDBalance: d.cumulativeUSDBalance,
				btcPriceUSD: d.btcPriceUSD,
				btcBought: d.btcBought,
				twoHundredWeekMovingAveragePriceUSD: d.twoHundredWeekMovingAveragePriceUSD,
				feePaidUSD: d.feePaidUSD,
				holdersRaw: d.holdersRaw ?? 0,
				holdersAdjusted: d.holdersAdjusted ?? d.holdersRaw,
				profitPct:
					d.cumulativeBTC > 0 && d.cumulativeUSDSpent > 0
						? ((d.cumulativeBTC * d.btcPriceUSD - d.cumulativeUSDSpent) / d.cumulativeUSDSpent) *
							100
						: 0
			}));

			// Build contiguous-band annotations
			const annotations: Record<string, any> = {};
			const maxCumulativeBTC = Math.max(...days.map((d) => d.cumulativeBTC)) * 1.1;

			bands.forEach((band) => {
				let startIndex: number | null = null;

				days.forEach((d, i) => {
					const inBand = d.holdersAdjusted >= band.min && d.holdersAdjusted <= band.max;

					if (inBand && startIndex === null) {
						startIndex = i;
					} else if ((!inBand || i === days.length - 1) && startIndex !== null) {
						const endIndex = inBand && i === days.length - 1 ? i : i - 1;

						annotations[`band-${band.label}-${startIndex}`] = {
							type: 'box',

							// X range in index space
							xMin: startIndex - 0.5,
							xMax: endIndex + 0.5,

							// FULL chart height (not tied to any scale)
							yMin: 0,
							yMax: 1,
							yScaleID: 'undefined',

							backgroundColor: band.color,
							borderWidth: 0,
							drawTime: 'beforeDatasetsDraw'
						};

						startIndex = null;
					}
				});
			});

			// destroy previous chart
			chartInstance?.destroy();

			// create chart
			chartInstance = new Chart(chartCanvas, {
				type: 'line',
				data: {
					labels: days.map((d) => d.date),
					datasets: [
						{
							label: 'Cumulative BTC',
							data: days.map((d) => d.cumulativeBTC),
							borderColor: 'white',
							backgroundColor: 'rgba(0,255,0,0.1)',
							fill: true,
							tension: 0.2,
							yAxisID: 'y1'
						},
						{
							label: 'BTC Price USD',
							data: days.map((d) => d.btcPriceUSD),
							borderColor: 'dimgray',
							backgroundColor: 'rgba(255,165,0,0.1)',
							fill: false,
							tension: 0.2,
							yAxisID: 'y2'
						},
						{
							label: '200 Week Moving Average Price USD',
							data: days.map((d) => d.twoHundredWeekMovingAveragePriceUSD),
							borderColor: 'black',
							backgroundColor: 'rgba(0,0,255,0.1)',
							fill: false,
							tension: 0.2,
							yAxisID: 'y2'
						}
					]
				},
				options: {
					elements: {
						point: {
							pointStyle: false
						}
					},
					responsive: true,
					interaction: { mode: 'index', intersect: false },
					plugins: {
						legend: { display: false },
						tooltip: {
							mode: 'index',
							intersect: false,
							callbacks: {
								label: function (tooltipItem) {
									const datasetLabel = tooltipItem.dataset.label ?? '';
									if (datasetLabel === 'Cumulative BTC') {
										return `${datasetLabel}: ${tooltipItem.raw}`;
									}
									const value = tooltipItem.raw;
									const date = tooltipItem.label;
									const day = days.find((d) => d.date === date);
									const profitLabel = day ? `Profit %: ${day.profitPct.toFixed(2)}%` : '';
									const holdersLabel = day
										? `Holders: ${day.holdersRaw.toFixed(1)}% → ${day.holdersAdjusted.toFixed(1)}%`
										: '';
									const cashBalanceLabel = day
										? `Cash Balance: ${day.cumulativeUSDBalance.toFixed(2)}`
										: '';

									return [`${datasetLabel}: ${value}`, profitLabel, holdersLabel, cashBalanceLabel];
								}
							}
						},
						annotation: { annotations }
					},
					scales: {
						x: { display: false, title: { display: false, text: 'Date' } },
						y1: {
							type: 'linear',
							position: 'left',
							title: { display: false, text: 'Cumulative BTC' }
						},
						y2: {
							type: 'logarithmic',
							position: 'right',
							title: { display: false, text: 'BTC Price USD' },
							grid: { drawOnChartArea: false }
						}
					}
				}
			});
		} catch (err: any) {
			error = err.message ?? 'Fetch error';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await runBacktest();
		if (days.length) {
			startDate = days[0].date;
		}
	});
</script>

<div
	class="grid h-[calc(100vh-6rem)] grid-cols-1 grid-rows-[12rem_12rem_1fr] items-center justify-center gap-4 lg:grid-cols-2 lg:grid-rows-[12rem_1fr]"
>
	<section id="parameters" class="h-full w-full">
		<div class="card h-full w-full bg-base-200 card-border">
			<div class="card-body">
				<label class="input input-ghost">
					<span class="label min-w-32">Start Date</span>
					<input type="date" bind:value={startDate} />
				</label>
				<label class="input input-ghost">
					<span class="label">Monthly Budget</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-dollar-sign-icon lucide-dollar-sign"
						><line x1="12" x2="12" y1="2" y2="22" /><path
							d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
						/></svg
					>

					<input
						type="text"
						pattern={'^\$\d{(1, 3)}(,\d{3})*(\.\d+)?$'}
						data-type="currency"
						bind:value={monthlyBudget}
					/>
				</label>
				<div class="card-actions justify-end">
					<button class="btn btn-primary" onclick={runBacktest} disabled={loading}>
						{loading ? 'Running...' : 'Run Backtest'}
					</button>
				</div>
			</div>
		</div>
		{#if error}
			<p style="color:red">{error}</p>
		{/if}
	</section>

	{#if summary && latestDay}
		<section id="summary" class="h-full w-full">
			<div class="card h-full w-full bg-base-200 card-border">
				<div class="card-body">
					<p>
						<strong>Current Value:</strong>
						${currentValueUSD.toFixed(2)}
						<span class="ml-1">
							({currentProfitUSD >= 0 ? '+' : ''}${currentProfitUSD.toFixed(2)})
						</span><br />

						<strong>Cash Balance:</strong> ${summary.cashBalanceUSD.toFixed(2)}<br />
						<strong>Profit:</strong>
						{latestDay.profitPct.toFixed(2)}%<br />

						<strong>Total Spent:</strong> ${summary.totalUSDSpent.toFixed(2)}<br />
						<strong>Total Fee Paid:</strong> ${summary.totalFeesPaidUSD.toFixed(2)}<br />
						<strong>Total BTC:</strong> ₿{summary.totalBTC.toFixed(6)}<br />

						<strong>Average Cost Basis:</strong> ${summary.averageCostBasisUSD.toFixed(2)}
					</p>
				</div>
			</div>
		</section>
	{/if}

	<section id="chart" class="h-full w-full lg:col-span-2">
		<div class="card h-full w-full bg-base-200 card-border">
			<div class="card-body">
				<!-- Legend for DCA Bands -->
				<div style="display:flex; gap:1rem; margin-bottom:1rem;">
					{#each bands as band}
						<div style="display:flex; align-items:center; gap:0.25rem;">
							<div
								style="width:10px; height:10px; background-color:{band.color}; border:1px solid #000;"
							></div>
							<span class="text-sm">{band.label}</span>
						</div>
					{/each}
				</div>

				<canvas bind:this={chartCanvas} style="max-height:50vh"></canvas>
			</div>
		</div>
	</section>
</div>
