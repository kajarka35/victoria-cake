<script lang="ts">
  import { fly } from 'svelte/transition';
  import { onMount } from 'svelte';
  import ProductoCard from './ProductoCard.svelte';
  import ProductoModal from './ProductoModal.svelte';
  import { goto } from '$app/navigation';

  interface Producto {
    id: number;
    nombre: string;
    descripcion: string;
    precio: string;
    imagen: string;
    ingredientes?: string;
    tamano?: string;
    galeria?: string[];
  }

  export let data;
  const productos: Producto[] = data.productos;

  let show = false;
  let activeCard: number | null = null;
  let modalProducto: Producto | null = null;
  let search = '';
  let cargando = true;
  let enviado = false;

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  onMount(async () => {
    await delay(600);
    cargando = false;
    show = true;

    const cerrarConEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarModal();
    };
    window.addEventListener('keydown', cerrarConEscape);

    return () => {
      window.removeEventListener('keydown', cerrarConEscape);
    };
  });

  function abrirModal(producto: Producto) {
    modalProducto = producto;
    document.body.style.overflow = 'hidden';
  }

  function cerrarModal() {
    modalProducto = null;
    document.body.style.overflow = '';
  }

  function toggleCard(id: number) {
    activeCard = activeCard === id ? null : id;
  }

  async function pedirPorWhatsApp(producto: Producto) {
    enviado = true;
    await delay(500);
    enviado = false;
    const mensaje = `¡Hola Victoria Cake! 🌽\n\nEstoy interesado/a en el siguiente producto:\n\n*${producto.nombre}*\nPrecio: ${producto.precio}\n\n¿Podrías darme más información y disponibilidad? ¡Gracias! 💖`;
    const url = `https://wa.me/573126589467?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank', 'noopener');
  }

  function irInicio() {
    goto('/');
  }

  function irContacto() {
    goto('/contacto');
  }

  $: productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );
</script>

<svelte:head>
  <title>Catálogo | Victoria Cake</title>
  <meta name="description" content="Explora nuestros pasteles artesanales únicos, con sabor, diseño y calidad en cada detalle." />
</svelte:head>

{#if show}
<!-- Barra de búsqueda flotante -->
<div class="sticky top-0 z-[100] bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-pink-200 dark:border-pink-500 py-4 px-4 shadow-sm">
  <div class="max-w-7xl mx-auto flex justify-center">
    <input
      type="text"
      placeholder="Buscar pastel..."
      class="w-full max-w-md py-2 px-4 rounded-xl border border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm dark:bg-gray-900 dark:text-white"
      bind:value={search}
    />
  </div>
</div>

<section
  class="min-h-screen bg-gradient-to-b from-pink-100 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 py-20 px-4 sm:px-6 lg:px-24 font-[Inter,sans-serif] relative animate-fade-in"
>
  <!-- Fondo decorativo -->
  <div class="absolute -top-10 -left-10 w-96 h-96 bg-pink-300 rounded-full opacity-20 blur-3xl animate-pulse"></div>
  <div class="absolute bottom-0 right-0 w-72 h-72 bg-purple-200 rounded-full opacity-20 blur-2xl animate-pulse delay-300"></div>

  <div class="max-w-7xl mx-auto text-center space-y-6 relative z-10 mt-10">
    <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-pink-600 dark:text-pink-400 tracking-tight drop-shadow-md animate-fade-in">
      Nuestros Productos
    </h2>
    <p class="text-gray-600 dark:text-gray-300 text-base sm:text-lg max-w-2xl mx-auto animate-fade-in delay-200">
      Descubre el arte pastelero: diseño, sabor y dedicación en cada creación.
    </p>
  </div>

  <div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {#if cargando}
      {#each Array(6) as _, i}
        <div class="animate-pulse h-80 rounded-2xl bg-white/70 dark:bg-gray-800/60"></div>
      {/each}
    {:else if productosFiltrados.length === 0}
      <p class="text-center col-span-full text-gray-500 dark:text-gray-400 text-sm mt-8">No se encontraron productos.</p>
    {:else}
      {#each productosFiltrados as producto, i (producto.id)}
        <div class="fade-up" style="--delay: {i * 70}ms">
          <ProductoCard
            {producto}
            {activeCard}
            index={i}
            on:abrirModal={() => abrirModal(producto)}
            on:pedirWhatsApp={() => pedirPorWhatsApp(producto)}
            on:toggle={() => toggleCard(producto.id)}
          />
        </div>
      {/each}
    {/if}
  </div>
</section>
{/if}

<!-- Botones SIEMPRE visibles para TODAS las resoluciones -->
<div class="fixed bottom-5 right-5 z-[999] flex flex-col gap-3 items-end pointer-events-auto">
  <button
    on:click={irInicio}
    class="p-3 rounded-full backdrop-blur-md bg-white/60 dark:bg-gray-800/60 text-pink-600 dark:text-white border border-pink-200 dark:border-pink-400 shadow-xl hover:scale-105 transition-all duration-300"
    aria-label="Inicio"
  >
    🏠
  </button>
  <button
    on:click={irContacto}
    class="p-3 rounded-full backdrop-blur-md bg-pink-500/90 text-white shadow-xl hover:bg-pink-600 hover:scale-105 transition-all duration-300"
    aria-label="Contáctanos"
  >
    📞
  </button>
</div>

{#if modalProducto}
  <ProductoModal
    producto={modalProducto}
    on:cerrar={cerrarModal}
    on:pedirWhatsApp={() => pedirPorWhatsApp(modalProducto)}
  />
{/if}

{#if enviado}
  <div class="fixed bottom-4 right-4 z-50 bg-pink-500 text-white px-4 py-2 rounded-xl text-sm shadow-lg animate-fade-in">
    Abriendo WhatsApp...
  </div>
{/if}

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
     transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.8s ease-out both;
  }

  .delay-200 {
    animation-delay: 0.2s;
  }

  .fade-up {
    opacity: 0;
    transform: translateY(20px);
    animation: fadeUp 0.5s ease-out forwards;
    animation-delay: var(--delay, 0ms);
  }

  @keyframes fadeUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  html {
    scroll-behavior: smooth;
    overscroll-behavior: none;
  }

  body {
    overflow-x: hidden;
  }
</style>
