// src/routes/admin/logout/+server.ts
import { redirect } from '@sveltejs/kit';

export const GET = async ({ cookies }) => {
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });
  return redirect(303, '/admin/login');
};
