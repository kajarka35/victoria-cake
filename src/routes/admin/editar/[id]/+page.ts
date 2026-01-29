import { supabase } from '$lib/supabaseClient.js';

export async function load({ params }) {
	const { data: producto, error } = await supabase
		.from('productos')
		.select('*')
		.eq('id', params.id)
		.single();
	if (error) throw new Error(error.message);
	return { producto };
}
