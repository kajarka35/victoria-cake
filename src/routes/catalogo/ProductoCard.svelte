<script lang="ts">
  import { fly } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';

  export let producto: {
    id: number;
    nombre: string;
    descripcion: string;
    precio: string;
    imagen: string;
    ingredientes?: string;
    tamano?: string;
    galeria?: string[];
  };

  export let index: number;
  export let activeCard: number | null;

  const dispatch = createEventDispatcher();
  let esFavorito = false;

  // Detectar si la imagen es vertical
  let isVertical = false;

  function detectarOrientacion(e: Event) {
    const img = e.target as HTMLImageElement;
    isVertical = img.naturalHeight > img.naturalWidth;
  }

  function toggleFavorito(event: Event) {
    event.stopPropagation();
    esFavorito = !esFavorito;
  }
</script>

<article
  class={`relative flex flex-col h-full rounded-3xl transition-transform duration-300 overflow-hidden transform hover:-translate-y-1 hover:scale-[1.015] active:scale-95 touch-manipulation group focus-within:ring-2 outline-none animate-card
    ${activeCard === producto.id
      ? 'bg-white dark:bg-gray-900 shadow-2xl ring-2 ring-pink-400/60'
      : 'bg-white/80 dark:bg-gray-800/80 shadow-md hover:shadow-xl backdrop-blur-xl'
    }`}
  tabindex="0"
  in:fly={{ y: 50, duration: 500, delay: index * 100 }}
  on:click={() => dispatch('toggle')}
>
  <!-- Imagen con orientación dinámica -->
  <div class="relative w-full aspect-[4/3] bg-white dark:bg-gray-800 rounded-t-3xl overflow-hidden flex items-center justify-center">
    <img
      src={producto.imagen}
      alt={producto.nombre}
      loading="lazy"
      class={`w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-105
        ${isVertical ? 'object-contain p-2' : 'object-cover'}`}
      on:load={detectarOrientacion}
    />
  </div>

  <!-- Botón favorito -->
  <button
    aria-label="Marcar como favorito"
    class={`sticky top-3 right-3 self-end z-20 rounded-full w-10 h-10 flex items-center justify-center shadow-md hover:shadow-lg transition active:scale-95 mt-[-1.5rem]
      ${esFavorito
        ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/20 dark:text-pink-300 ring-2 ring-pink-300'
        : 'bg-white/90 dark:bg-gray-700/80 text-pink-600 dark:text-pink-300'
      }`}
    on:click|stopPropagation={toggleFavorito}
  >
    <span class:heart-icon={esFavorito}>{esFavorito ? '❤️' : '🤍'}</span>
  </button>

  <!-- Contenido -->
  <div class="relative flex flex-col flex-1 overflow-hidden">
    <div class="px-4 py-4 sm:p-6 text-left overflow-y-auto flex-1 content-scroll relative">
      <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-snug">
        {producto.nombre}
      </h3>
      <p class="text-sm sm:text-base text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed mt-2">
        {producto.descripcion}
      </p>
      <p class="text-base sm:text-lg font-extrabold text-pink-600 dark:text-pink-400 mt-2">
        {producto.precio}
      </p>
    </div>

    {#if activeCard === producto.id}
      <div class="sticky bottom-0 z-10 bg-white dark:bg-gray-900 px-4 sm:px-6 pb-4 pt-3 border-t border-pink-100 dark:border-gray-700 flex flex-col gap-3 animate-actions shadow-button">
        <button
          class="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-xl text-base font-semibold transition shadow-sm"
          on:click|stopPropagation={() => dispatch('abrirModal')}
        >
          🍰 Ver más
        </button>
        <button
          class="w-full border border-pink-400 text-pink-500 hover:bg-pink-100 py-3 rounded-xl text-base font-semibold transition"
          on:click|stopPropagation={() => dispatch('pedirWhatsApp')}
        >
          💬 Pedir por WhatsApp
        </button>
      </div>
    {/if}
  </div>
</article>

<style>
  @keyframes card {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes actions {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes heartbeat {
    0%, 100% {
      transform: scale(1);
    }
    14% {
      transform: scale(1.3);
    }
    28% {
      transform: scale(1);
    }
    42% {
      transform: scale(1.25);
    }
    70% {
      transform: scale(1);
    }
  }

  .animate-card {
    animation: card 0.5s ease-out both;
  }

  .animate-actions {
    animation: actions 0.4s ease-out both;
    animation-delay: 0.1s;
  }

  .heart-icon {
    font-size: 1.25rem;
    animation: heartbeat 2.2s infinite ease-in-out;
    transition: transform 0.3s ease;
  }

  .heart-icon:active {
    transform: scale(1.3);
  }

  .content-scroll::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 24px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.05), transparent);
    pointer-events: none;
    z-index: 5;
  }

  .shadow-button {
    box-shadow: 0 -8px 12px -6px rgba(0, 0, 0, 0.08);
  }

  .overflow-y-auto::-webkit-scrollbar {
    width: 0;
    background: transparent;
  }
</style>
