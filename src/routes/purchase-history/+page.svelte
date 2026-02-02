<script lang="ts">
	import {
		addPurchase,
		deletePurchase,
		getPurchases,
		updatePurchase
	} from '$lib/remote/purchases.remote';
	import type { NewPurchase, Purchase } from '$lib/server/db/schema';
	import { onMount } from 'svelte';

	let purchases: Purchase[] = $state([]);
	let activePurchase = $state<Partial<Purchase> | null>(null);
	let averagePurchasePriceGBP = $state(0);
	let averagePurchasePriceUSD = $derived(await gbpToUsd(averagePurchasePriceGBP));
	let currentPrice = $state(0);

	function getAvgPurchasePrice() {
		if (!purchases) return null;
		return purchases.reduce((a, b) => a + Number(b.priceGBP), 0) / purchases.length;
	}

	async function getCurrentPrice() {
		const simple = await fetch(
			'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,gbp'
		).then((r) => r.json());

		currentPrice = simple.bitcoin.gbp;
	}

	async function gbpToUsd(gbp: number) {
		const response = await fetch('https://api.exchangerate-api.com/v4/latest/GBP').then((r) =>
			r.json()
		);
		return gbp * response.rates.USD;
	}

	async function handleAdd() {
		if (!purchases) return;
		const currentDate = new Date();

		const newPurchase: Purchase = {
			id: crypto.randomUUID(),
			amountBTC: '0',
			priceGBP: '0',
			date:
				currentDate.getFullYear() + '-' + (currentDate.getMonth() + 1) + '-' + currentDate.getDate()
		};

		const result = await addPurchase(newPurchase);
		purchases[purchases.length - 1] = result[0] as Purchase;

		activePurchase = purchases[purchases.length - 1];
	}

	function handleEdit(purchase: Purchase) {
		activePurchase = purchase;
	}

	async function handleSave(purchase: Purchase) {
		if (!purchases) return;
		await updatePurchase(purchase);
		activePurchase = null;
	}

	async function handleDelete(purchase: Purchase) {
		const confirm = window.confirm('Are you sure you want to delete this purchase?');
		if (!confirm) return;
		await deletePurchase(purchase.id);
		purchases = purchases.filter((p) => p.id !== purchase.id);
	}

	onMount(async () => {
		purchases = await getPurchases();
		await getCurrentPrice();
		averagePurchasePriceGBP = getAvgPurchasePrice() ?? 0;
	});
</script>

<div class="flex flex-col gap-4">
	<section>
		<div class="card bg-base-200 card-border">
			<div class="card-body w-full flex-row items-center">
				<!-- Average Purchase Price -->
				<div>
					<div class="text-lg font-bold">${averagePurchasePriceUSD.toFixed(2)}</div>
					<div class="text-sm text-gray-500">£{averagePurchasePriceGBP.toFixed(2)}</div>
				</div>
				<!-- Profit/Loss (%) -->
				<div class="text-xl font-bold">
					{(((currentPrice - averagePurchasePriceGBP) / averagePurchasePriceGBP) * 100).toFixed(2)}%
				</div>
				<div class="flex w-full justify-end">
					<button class="btn btn-sm btn-primary" onclick={() => handleAdd()}>+</button>
				</div>
			</div>
		</div>
	</section>
	<section>
		<div id="container" class="card h-[calc(100vh-9rem)] overflow-auto bg-base-200">
			<table class="table-pin-cols table-pin-rows table table-auto p-4">
				<thead>
					<tr>
						<!-- <th>ID</th> -->
						<th class="bg-base-200">Amount (₿)</th>
						<th class="bg-base-200">Price (£)</th>
						<th class="bg-base-200">Date</th>
						<th class="bg-base-200">Profit/Loss</th>
						<th class="bg-base-200">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each purchases as p (p.id)}
						<tr>
							{#if activePurchase?.id == p.id}
								<!-- <td>{p.id}</td> -->
								<td
									><input
										class="input-bordered input"
										type="number"
										step="any"
										bind:value={p.amountBTC}
									/></td
								>
								<td
									><input
										class="input-bordered input"
										type="number"
										step="any"
										bind:value={p.priceGBP}
									/></td
								>
								<td><input class="input-bordered input" type="date" bind:value={p.date} /></td>
								<td></td>
								<td class="flex gap-2"
									><button class="btn btn-primary" onclick={() => handleSave(p)}>Save</button></td
								>
							{:else}
								{@const date = new Date(p.date as string)}
								<!-- <td>{p.id}</td> -->
								<td>{p.amountBTC}</td>
								<td>{p.priceGBP}</td>
								<td>{date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear()}</td>
								<td
									>{(
										((Number(currentPrice) - Number(p.priceGBP)) / Number(p.priceGBP)) *
										100
									).toFixed(2)}%</td
								>
								<td class="flex gap-2"
									><button class="btn btn-sm btn-primary" onclick={() => handleEdit(p)}>Edit</button
									><button class="btn btn-sm btn-primary" onclick={() => handleDelete(p)}
										>Delete</button
									></td
								>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</div>
