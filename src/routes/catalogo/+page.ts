import { supabase } from '$lib/supabaseClient.js';

export async function load() {
  const { data: productos, error } = await supabase
    .from('productos')
    .select('*')
    .order('id', { ascending: true });

  console.log('Productos desde Supabase:', productos);
  console.log('Error:', error);

  return {
    productos: productos ?? []
  };
}
