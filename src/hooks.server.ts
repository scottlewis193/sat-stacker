import { updateData } from '$lib/server/data';
import type { ServerInit } from '@sveltejs/kit';

let interval: NodeJS.Timeout;

export const init: ServerInit = async () => {
	console.log('init');
	await updateData();

	interval = setInterval(async () => {
		await updateData();
	}, 60000);
};
