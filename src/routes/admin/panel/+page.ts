import { supabase } from '$lib/supabaseClient.js';

export async function load() {
  const { data: productos, error } = await supabase.from('productos').select('*');
  if (error) throw new Error(error.message);
  return { productos };
}
