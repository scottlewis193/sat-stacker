import { query } from '$app/server';
import { data } from '$lib/server/data';

export const getLatestData = query(async () => {
	return data;
});
