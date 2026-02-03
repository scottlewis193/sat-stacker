import { query } from '$app/server';
import { fetchBtcUsdPrices } from '$lib/server/prices';

export const getPrices = query(async () => {
	return await fetchBtcUsdPrices();
});
