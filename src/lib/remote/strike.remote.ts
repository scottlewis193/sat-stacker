import { query } from '$app/server';
import { createExchangeQuote, getBalances, getQuote, getRates } from '$lib/server/strike';

export const getStrikeBalances = query(async () => {
	return await getBalances();
});

export const getStrikeCurrentPrice = query(async () => {
	const { usdRate, gbpRate } = await getRates();
	return { currentPriceUSD: usdRate, currentPriceGBP: gbpRate };
});

export const createAndGetStrikeQuote = query('unchecked', async (gbpAmount: number) => {
	const quote = await createExchangeQuote(gbpAmount);
	const quoteData = await getQuote(quote.id);

	return quoteData;
});
