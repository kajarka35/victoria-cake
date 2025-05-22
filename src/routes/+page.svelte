<script lang="ts">
  import { createClient } from '@supabase/supabase-js';
  import { onMount } from 'svelte';

  let productos: any[] = [];
  let error: string | null = null;

  // Cliente Supabase
  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL!,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY!
  );

  onMount(async () => {
    const { data, error: err } = await supabase
      .from('productos')
      .select('*')
      .order('id', { ascending: true });

    if (err) {
      error = err.message;
    } else {
      productos = data ?? [];
    }
  });
</script>

<svelte:head>
  <title>Catálogo | Victoria Cake</title>
</svelte:head>

<main class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-6 py-12">
  <h1 class="text-4xl font-bold mb-8 text-pink-600">🎂 Catálogo de Productos</h1>

  {#if error}
    <p class="text-red-500">Error: {error}</p>
  {:else if productos.length === 0}
    <p>No hay productos disponibles.</p>
  {:else}
    <ul class="space-y-4">
      {#each productos as producto}
        <li class="p-4 rounded-lg bg-pink-100 dark:bg-gray-800 shadow">
          <h2 class="text-xl font-semibold">{producto.nombre}</h2>
          <p>{producto.descripcion}</p>
          <p class="text-pink-600 font-bold">${producto.precio}</p>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  html {
    font-family: system-ui, sans-serif;
  }
</style>
