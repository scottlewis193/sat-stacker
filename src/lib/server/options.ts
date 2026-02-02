import { db } from '$lib/server/db';
import { options } from '$lib/server/db/schema';

export const getOptions = async () => {
	const result = await db.select().from(options).limit(1).execute();
	return result[0];
};
