<script lang="ts">
  import { supabase } from '$lib/supabaseClient.js';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';

  export let data;
  const productos = data.productos;

  let eliminarId: number | null = null;
  let showConfirm = false;
  let darkMode = false;
  let show = false;
  let cargando = true;

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  function confirmarEliminacion(id: number) {
    eliminarId = id;
    showConfirm = true;
  }
  async function eliminarProducto() {
    if (eliminarId !== null) {
      await supabase.from('productos').delete().eq('id', eliminarId);
      location.reload();
    }
  }
  function cancelarEliminacion() {
    eliminarId = null;
    showConfirm = false;
  }
  function agregarProducto() { goto('/admin/agregar') }
  function irInicio() { goto('/') }
  function toggleDarkMode() {
    darkMode = !darkMode;
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('modoOscuro', darkMode ? 'true' : 'false');
  }

  onMount(async () => {
    const modo = localStorage.getItem('modoOscuro');
    if (modo === 'true') {
      darkMode = true;
      document.documentElement.classList.add('dark');
    }
    await delay(500);
    cargando = false;
    show = true;
  });
</script>

<svelte:head>
  <title>Panel de Productos | Victoria Cake</title>
</svelte:head>

{#if show}
<section class="min-h-screen bg-gradient-to-b from-pink-100 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 text-gray-900 dark:text-white transition-colors duration-500 px-4 py-10 font-[Inter] animate-fade-in relative overflow-hidden">
  <!-- Fondo decorativo estilo blur -->
  <div class="absolute -top-10 -left-10 w-96 h-96 bg-pink-300 rounded-full opacity-20 blur-3xl animate-pulse"></div>
  <div class="absolute bottom-0 right-0 w-72 h-72 bg-purple-200 rounded-full opacity-20 blur-2xl animate-pulse delay-300"></div>

  <div class="max-w-7xl mx-auto space-y-8 relative z-10">
    <h1 class="text-3xl sm:text-4xl font-extrabold text-center sm:text-left text-pink-600 dark:text-pink-400 drop-shadow-md animate-fade-in">Panel de Productos</h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each productos as p, i (p.id)}
        <article class="relative flex flex-col h-full rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-[1.01] transition duration-300 overflow-hidden"
                 tabindex="0"
                 in:fly={{ y: 40, duration: 500, delay: i * 100 }}>
          <img src={p.imagen} alt={p.nombre} class="w-full h-44 object-cover group-hover:scale-105 transition duration-500" loading="lazy"/>

          <div class="flex-1 p-4 flex flex-col">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">{p.nombre}</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{p.descripcion}</p>
            <p class="mt-3 font-extrabold text-pink-600 dark:text-pink-400">{p.precio}</p>
          </div>

          <div class="flex flex-col p-4 gap-2 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-t border-pink-200 dark:border-gray-700 rounded-b-2xl">
            <button on:click={() => goto(`/admin/editar/${p.id}`)}
                    class="flex items-center justify-center gap-2 py-2 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300 transition">
              ✏️ Editar
            </button>
            <button on:click={() => confirmarEliminacion(p.id)}
                    class="flex items-center justify-center gap-2 py-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300 transition">
              🗑️ Eliminar
            </button>
          </div>
        </article>
      {/each}
    </div>
  </div>

  <!-- Botones flotantes con estilo exotico blur -->
  <div class="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-4">
    <button on:click={agregarProducto}
            class="bg-pink-500/80 hover:bg-pink-600/80 text-white backdrop-blur-sm px-5 py-3 rounded-full shadow-lg flex items-center gap-2 transition transform hover:scale-105">
      🎂 Agregar
    </button>
    <button on:click={irInicio}
            class="bg-white/80 dark:bg-gray-800/60 text-pink-600 dark:text-white backdrop-blur-sm px-4 py-2 rounded-full shadow hover:scale-105 transition">
      ← Inicio
    </button>
  </div>

  {#if showConfirm}
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" transition:fly={{ y:20, duration:300 }}>
      <div class="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm space-y-4 text-center">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-white">¿Eliminar producto?</h2>
        <p class="text-gray-600 dark:text-gray-400">¿Estás seguro? Esta acción no se puede deshacer.</p>
        <div class="flex justify-center gap-4 mt-4">
          <button on:click={cancelarEliminacion}
                  class="px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            Cancelar
          </button>
          <button on:click={eliminarProducto}
                  class="px-4 py-2 rounded-full bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-semibold transition">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  {/if}
</section>
{/if}

<style>
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in { animation: fade-in 0.8s ease-out both; }

  @keyframes card {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .animate-card { animation: card 0.5s ease-out both; }

  @keyframes actions {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-actions { animation: actions 0.4s ease-out both; animation-delay:0.1s; }

  .line-clamp-2 {
    display: -webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  }
  .shadow-button { box-shadow: 0 -8px 16px -8px rgba(0,0,0,0.1); }
  .content-scroll::after {
    content: ''; position:absolute; bottom:0; left:0; right:0;
    height:24px; background:linear-gradient(to top,rgba(255,255,255,0.7),transparent); pointer-events:none;
  }
  html { scroll-behavior:smooth; font-family:'Inter',sans-serif; overscroll-behavior:none; }
</style>
