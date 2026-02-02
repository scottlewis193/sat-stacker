<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	// Manual Chart.js registration
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		LogarithmicScale,
		CategoryScale,
		Title,
		Tooltip,
		Legend
	} from 'chart.js';
	import { getPrices } from '$lib/remote/prices.remote';

	let { chartData }: { chartData: { time: string; price: number }[] | null } = $props();

	let chart: Chart | null = null;

	Chart.register(
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		LogarithmicScale,
		CategoryScale,
		Title,
		Tooltip,
		Legend
	);

	let canvasEl: HTMLCanvasElement;

	// Selected time range (default: 90 days)

	let scaleType: 'linear' | 'logarithmic' = 'logarithmic';

	const ranges = [
		{ label: '7D', days: 7 },
		{ label: '30D', days: 30 },
		{ label: '90D', days: 90 },
		{ label: '1Y', days: 365 },
		{ label: '5Y', days: 5 * 365 },
		{ label: 'Max', days: 'max' }
	];

	function linearRegression(data: number[]): { slope: number; intercept: number } {
		const n = data.length;
		if (n === 0) return { slope: 0, intercept: 0 };

		let sumX = 0,
			sumY = 0,
			sumXY = 0,
			sumXX = 0;
		for (let i = 0; i < n; i++) {
			sumX += i;
			sumY += data[i];
			sumXY += i * data[i];
			sumXX += i * i;
		}
		const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

		// Adjust intercept to start from first y-value
		const intercept = data[0] - slope * 0; // starts exactly at first point
		return { slope, intercept };
	}

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

	export function resize() {
		if (!chart) return;
		chart.resize();
	}

	let resizeTimeout: any;

	export function debouncedResize() {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			chart?.resize();
		}, 100);
	}

	async function render() {
		if (!chartData) return;

		const yValues = chartData.map((p: { price: number }) => p.price);
		const { slope, intercept } = linearRegression(yValues);
		// Weeks → days (BTC data is daily)
		const MA_50W = movingAverage(yValues, 50 * 7);
		const MA_100W = movingAverage(yValues, 100 * 7);
		const MA_200W = movingAverage(yValues, 200 * 7);

		// Compute trend line points
		const trendLine = yValues.map((_: number, i: number) => intercept + slope * i);

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		// DaisyUI theme-aware colors
		const primary = getComputedStyle(document.documentElement)
			.getPropertyValue('--color-primary')
			.trim();
		const textColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--color-base-content')
			.trim();
		const secondary = getComputedStyle(document.documentElement)
			.getPropertyValue('--color-secondary')
			.trim();
		const errorColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--color-error')
			.trim();

		// If chart exists, destroy before drawing new one
		if (chart) chart.destroy();

		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: chartData.map((p: { time: string }) => p.time),
				datasets: [
					{
						label: 'BTC Price',
						data: chartData.map((p: { price: number }) => p.price),
						borderColor: textColor,
						backgroundColor: textColor + '33', // 20% alpha
						borderWidth: 2,
						pointRadius: 0,
						tension: 0.5
					},
					{
						label: '50W MA',
						data: MA_50W,
						borderColor: 'oklch(26.9% 0 0)',
						borderWidth: 1.5,
						pointRadius: 0,
						tension: 0.1
					},
					{
						label: '100W MA',
						data: MA_100W,
						borderColor: 'oklch(26.9% 0 0)',
						borderWidth: 1.5,
						pointRadius: 0,
						tension: 0.1
					},
					{
						label: '200W MA',
						data: MA_200W,
						borderColor: 'oklch(26.9% 0 0)',
						borderWidth: 1.5,
						pointRadius: 0,
						tension: 0.1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,

				plugins: {
					legend: {
						display: false,
						labels: {
							color: textColor
						}
					},
					tooltip: {
						displayColors: false
					}
				},
				scales: {
					x: {
						display: false,
						ticks: {
							color: textColor
						}
					},
					y: {
						display: false,
						type: scaleType,
						ticks: {
							color: textColor,
							backdropColor: textColor
						}
					}
				}
			}
		});
	}

	$effect(() => {
		if (!chartData) return;
		render();
	});

	onDestroy(() => {
		if (chart) chart.destroy();
	});
</script>

<canvas bind:this={canvasEl}></canvas>
