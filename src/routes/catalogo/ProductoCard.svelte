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
  class={`animate-card group relative flex h-full transform touch-manipulation flex-col overflow-hidden rounded-3xl outline-none transition-transform duration-300 focus-within:ring-2 hover:-translate-y-1 hover:scale-[1.015] active:scale-95
    ${
      activeCard === producto.id
        ? 'bg-white shadow-2xl ring-2 ring-pink-400/60 dark:bg-gray-900'
        : 'bg-white/80 shadow-md backdrop-blur-xl hover:shadow-xl dark:bg-gray-800/80'
    }`}
  tabindex="0"
  in:fly={{ y: 50, duration: 500, delay: index * 100 }}
  on:click={() => dispatch('toggle')}
>
  <!-- Imagen con fondo desenfocado -->
  <div class="relative w-full aspect-[3/4] rounded-t-3xl overflow-hidden">
    <!-- Fondo extendido difuminado -->
    <div
      class="absolute inset-0 z-0 blur-sm opacity-25 scale-110 bg-center bg-cover"
      style="background-image: url({producto.imagen})"
    ></div>

    <!-- Imagen foreground -->
    <img
      src={producto.imagen}
      alt={producto.nombre}
      loading="lazy"
      class="relative z-10 w-full h-full object-contain p-4 transition-transform duration-500 ease-in-out group-hover:scale-105"
    />
  </div>

  <!-- Botón favorito -->
  <button
    aria-label="Marcar como favorito"
    class={`sticky right-3 top-3 z-20 mt-[-1.5rem] flex h-10 w-10 items-center justify-center self-end rounded-full shadow-md transition hover:shadow-lg active:scale-95
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
  <div class="relative flex flex-1 flex-col overflow-hidden">
    <div class="content-scroll relative flex-1 overflow-y-auto px-4 py-4 text-left sm:p-6">
      <h3 class="text-lg font-bold leading-snug text-gray-900 sm:text-xl dark:text-white">
        {producto.nombre}
      </h3>
      <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600 sm:text-base dark:text-gray-300">
        {producto.descripcion}
      </p>
      <p class="mt-2 text-base font-extrabold text-pink-600 sm:text-lg dark:text-pink-400">
        {producto.precio}
      </p>
    </div>

    {#if activeCard === producto.id}
      <div
        class="animate-actions shadow-button sticky bottom-0 z-10 flex flex-col gap-3 border-t border-pink-100 bg-white px-4 pb-4 pt-3 sm:px-6 dark:border-gray-700 dark:bg-gray-900"
      >
        <button
          class="w-full rounded-xl bg-pink-500 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-pink-600"
          on:click|stopPropagation={() => dispatch('abrirModal')}
        >
          🍰 Ver más
        </button>
        <button
          class="w-full rounded-xl border border-pink-400 py-3 text-base font-semibold text-pink-500 transition hover:bg-pink-100"
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
