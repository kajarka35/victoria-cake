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
</script>

<article
  class={`animate-card group relative flex flex-col overflow-hidden rounded-2xl transition-transform duration-300 focus-within:ring-2 hover:-translate-y-1 hover:scale-[1.015] active:scale-95 w-full max-w-xs sm:max-w-sm
    ${
      activeCard === producto.id
        ? 'bg-white shadow-2xl ring-2 ring-pink-400/60 dark:bg-gray-900'
        : 'bg-white shadow hover:shadow-xl dark:bg-gray-800/90'
    }`}
  tabindex="0"
  in:fly={{ y: 50, duration: 500, delay: index * 100 }}
  on:click={() => dispatch('toggle')}
>
  <!-- Imagen con fondo difuso y producto centrado -->
  <div class="relative w-full h-48 sm:h-56 overflow-hidden">
    <!-- Imagen de fondo difusa -->
    <div
      class="absolute inset-0 z-0 bg-center bg-cover blur-2xl scale-110 opacity-30"
      style="background-image: url({producto.imagen})"
    ></div>

    <!-- Overlay suave -->
    <div class="absolute inset-0 z-0 bg-gradient-to-t from-white/90 via-white/50 to-transparent dark:from-gray-900/90"></div>

    <!-- Imagen principal centrada -->
    <img
      src={producto.imagen}
      alt={producto.nombre}
      loading="lazy"
      class="relative z-10 h-full w-full object-contain transition-transform duration-500 ease-in-out group-hover:scale-105"
    />
  </div>

  <!-- Botón favorito -->
  <button
    aria-label="Marcar como favorito"
    class={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full shadow-md transition hover:shadow-lg active:scale-95
      ${
        esFavorito
          ? 'bg-pink-100 text-pink-600 ring-2 ring-pink-300 dark:bg-pink-900/20 dark:text-pink-300'
          : 'bg-white/90 text-pink-600 dark:bg-gray-700/80 dark:text-pink-300'
      }`}
    on:click|stopPropagation={() => (esFavorito = !esFavorito)}
  >
    <span class:heart-icon={esFavorito}>{esFavorito ? '❤️' : '🤍'}</span>
  </button>

  <!-- Contenido -->
  <div class="flex-1 px-4 py-3 sm:px-5 sm:py-4 text-left">
    <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug">
      {producto.nombre}
    </h3>
    <p class="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-300 line-clamp-2">
      {producto.descripcion}
    </p>
    <p class="mt-2 text-pink-600 dark:text-pink-400 text-sm sm:text-base font-extrabold">
      {producto.precio}
    </p>
  </div>

  {#if activeCard === producto.id}
    <div class="animate-actions shadow-button sticky bottom-0 z-10 flex flex-col gap-3 border-t border-pink-100 bg-white px-4 pb-4 pt-3 sm:px-5 dark:border-gray-700 dark:bg-gray-900">
      <button
        class="w-full rounded-xl bg-pink-500 py-2.5 text-base font-semibold text-white transition hover:bg-pink-600"
        on:click|stopPropagation={() => dispatch('abrirModal')}
      >
        🍰 Ver más
      </button>
      <button
        class="w-full rounded-xl border border-pink-400 py-2.5 text-base font-semibold text-pink-500 transition hover:bg-pink-100"
        on:click|stopPropagation={() => dispatch('pedirWhatsApp')}
      >
        💬 Pedir por WhatsApp
      </button>
    </div>
  {/if}
</article>

<style>
  .animate-card {
    animation: card 0.5s ease-out both;
  }

  .animate-actions {
    animation: actions 0.4s ease-out both;
    animation-delay: 0.1s;
  }

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

  .heart-icon {
    font-size: 1.2rem;
    animation: heartbeat 2.2s infinite ease-in-out;
    transition: transform 0.3s ease;
  }

  .heart-icon:active {
    transform: scale(1.3);
  }

  .shadow-button {
    box-shadow: 0 -8px 12px -6px rgba(0, 0, 0, 0.08);
  }
</style>
