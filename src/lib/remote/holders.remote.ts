import { query } from '$app/server';
import { getLatestHoldersValue } from '$lib/server/holders';

export const getHoldersValue = query(async () => {
	return await getLatestHoldersValue();
});
