// src/routes/admin/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (url.pathname === '/login') return {};

  const access_token = cookies.get('sb-access-token');
  const refresh_token = cookies.get('sb-refresh-token');

  if (!access_token || !refresh_token) {
    throw redirect(303, '/login');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) throw redirect(303, '/login');

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!roleData || roleData.role !== 'admin') {
    throw redirect(303, '/login');
  }

  return { user };
};
