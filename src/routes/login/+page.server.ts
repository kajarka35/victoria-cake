// src/routes/admin/login/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('sb-access-token');
	if (token) {
		throw redirect(303, '/admin/panel');
	}
	return {};
};
