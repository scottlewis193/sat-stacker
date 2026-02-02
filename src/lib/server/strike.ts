import { STRIKE_API_KEY, STRIKE_API_BASE } from '$env/static/private';

async function strikeFetch(path: string, options: RequestInit = {}) {
	const headers = {
		Authorization: `Bearer ${STRIKE_API_KEY}`,
		'Content-Type': 'application/json',
		...(options.headers ?? {})
	};

	const res = await fetch(`${STRIKE_API_BASE}${path}`, {
		...options,
		headers
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`${res.status} ${res.statusText} — ${text}`);
	}

	return res.json();
}

export async function getBalances() {
	return strikeFetch('/balances');
}

export async function getRates() {
	const rates: { sourceCurrency: string; targetCurrency: string; amount: string }[] =
		await strikeFetch('/rates/ticker');

	const usdRate =
		Object.values(rates).find(
			(rate) => rate.sourceCurrency === 'BTC' && rate.targetCurrency === 'USD'
		)?.amount || '0';

	const gbpRate =
		Object.values(rates).find(
			(rate) => rate.sourceCurrency === 'BTC' && rate.targetCurrency === 'GBP'
		)?.amount || '0';

	return { usdRate: parseFloat(usdRate).toFixed(2), gbpRate: parseFloat(gbpRate).toFixed(2) };
}

export async function createExchangeQuote(amountGbp: number) {
	return strikeFetch('/currency-exchange-quotes', {
		method: 'POST',
		body: JSON.stringify({
			sell: 'GBP',
			buy: 'BTC',
			amount: {
				amount: amountGbp.toFixed(2),
				currency: 'GBP',
				feePolicy: 'INCLUSIVE'
			}
		})
	});
}

export async function getQuote(quoteId: string) {
	return strikeFetch(`/currency-exchange-quotes/${quoteId}`);
}

export async function executeExchangeQuote(quoteId: string) {
	return strikeFetch(`/currency-exchange-quotes/${quoteId}/execute`, {
		method: 'POST'
	});
}
