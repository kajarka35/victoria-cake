<script lang="ts">
  import { supabase } from '$lib/supabaseClient.js';
  import { goto } from '$app/navigation';
  import { tick } from 'svelte';

  export let data;
  let { nombre, descripcion, precio, imagen } = data.producto;
  let loading = false;
  let success = false;
  let error = '';

  async function guardarCambios() {
    loading = true;
    error = '';
    success = false;
    try {
      const { error: updateError } = await supabase.from('productos').update({ nombre, descripcion, precio, imagen }).eq('id', data.producto.id);
      if (updateError) throw updateError;
      success = true;
      await tick();
      setTimeout(() => goto('/admin/panel'), 1500);
    } catch (e) {
      error = 'Hubo un error al actualizar. Intenta nuevamente.';
    } finally {
      loading = false;
    }
  }
</script>

<section class="min-h-screen bg-gradient-to-br from-pink-100 via-white to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-white px-4 py-20 transition-colors duration-500 font-[Inter] flex items-center justify-center relative overflow-hidden">
  <div class="absolute -top-10 -left-10 w-96 h-96 bg-pink-300 rounded-full opacity-20 blur-3xl animate-pulse"></div>
  <div class="absolute bottom-0 right-0 w-72 h-72 bg-purple-200 rounded-full opacity-20 blur-2xl animate-pulse delay-300"></div>

  <form on:submit|preventDefault={guardarCambios} class="w-full max-w-xl bg-white/60 dark:bg-gray-800/50 backdrop-blur-2xl shadow-2xl rounded-3xl p-6 sm:p-10 space-y-6 animate-fade-in z-10">
    <h1 class="text-3xl sm:text-4xl font-extrabold text-center text-pink-600 dark:text-pink-400 drop-shadow-md">Editar Producto</h1>

    <input bind:value={nombre} required placeholder="Nombre del producto" class="w-full px-4 sm:px-5 py-3 rounded-2xl border border-pink-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 backdrop-blur-md text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all duration-300" />

    <textarea bind:value={descripcion} required placeholder="Descripción" class="w-full px-4 sm:px-5 py-3 rounded-2xl border border-pink-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 backdrop-blur-md text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all duration-300"></textarea>

    <input bind:value={precio} required placeholder="Precio" type="number" step="0.01" class="w-full px-4 sm:px-5 py-3 rounded-2xl border border-pink-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 backdrop-blur-md text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all duration-300" />

    <input bind:value={imagen} required placeholder="URL de imagen" type="url" class="w-full px-4 sm:px-5 py-3 rounded-2xl border border-pink-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 backdrop-blur-md text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all duration-300" />

    {#if error}
      <div class="text-sm text-red-500 text-center">{error}</div>
    {/if}
    {#if success}
      <div class="text-sm text-green-500 text-center animate-fade-in">✅ Cambios guardados correctamente</div>
    {/if}

    <button type="submit" class="w-full flex justify-center items-center gap-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-3 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.03] disabled:opacity-50">
      {#if loading} <span class="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span> Guardando... {:else} 💾 Guardar cambios {/if}
    </button>
  </form>
</section>

<style>
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.8s ease-out both;
  }
  html {
    scroll-behavior: smooth;
  }
</style>
