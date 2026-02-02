import { query } from '$app/server';
import { fetchBtcUsdPrices } from '$lib/server/prices';

export const getPrices = query(async () => {
	console.log('Fetching BTC prices...');
	return await fetchBtcUsdPrices();
});
