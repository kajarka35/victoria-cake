<script lang="ts">
  import { onMount } from 'svelte';

  let darkMode = false;
  let show = false;

  onMount(() => {
    const prefersDark =
      localStorage.getItem('dark') === 'true' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    darkMode = prefersDark;
    document.documentElement.classList.toggle('dark', darkMode);

    setTimeout(() => {
      show = true;
    }, 200); // Animación sutil al cargar
  });
</script>

<svelte:head>
  <title>Contáctanos | Victoria Cake</title>
</svelte:head>

{#if show}
<section class="min-h-screen bg-gradient-to-br from-pink-100 via-white to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-white px-4 py-20 transition-colors duration-500 font-[Inter] flex items-center justify-center relative overflow-hidden animate-fade-in">
  <!-- Background blur elements -->
  <div class="absolute -top-10 -left-10 w-96 h-96 bg-pink-300 rounded-full opacity-20 blur-3xl animate-pulse"></div>
  <div class="absolute bottom-0 right-0 w-72 h-72 bg-purple-200 rounded-full opacity-20 blur-2xl animate-pulse delay-300"></div>

  <div class="relative z-10 w-full max-w-2xl bg-white/60 dark:bg-gray-800/50 backdrop-blur-2xl rounded-3xl shadow-xl p-8 space-y-8 animate-fade-in">
    <h1 class="text-4xl font-extrabold text-center text-pink-600 dark:text-pink-400">Contáctanos</h1>
    <p class="text-center text-gray-700 dark:text-gray-300 text-lg">Estamos aquí para ayudarte. Puedes contactarnos a través de cualquiera de los siguientes canales:</p>

    <div class="flex flex-col gap-6">
      <a href="https://wa.me/573126589467" target="_blank" class="flex items-center gap-4 px-5 py-4 rounded-2xl bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 shadow hover:shadow-lg hover:scale-105 transition duration-300">
        💚 WhatsApp: <span class="font-semibold">+57 312 658 946 7</span>
      </a>
      <a href="tel:+573126589467" class="flex items-center gap-4 px-5 py-4 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 shadow hover:shadow-lg hover:scale-105 transition duration-300">
        📞 Llamanos: <span class="font-semibold">(57) 312 658 946 7</span>
      </a>
      <a href="https://www.instagram.com/victoriacake.vc" target="_blank" class="flex items-center gap-4 px-5 py-4 rounded-2xl bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 shadow hover:shadow-lg hover:scale-105 transition duration-300">
        🦋 Instagram: <span class="font-semibold">@victoriacake.vc</span>
      </a>
    </div>

    <div class="flex flex-col sm:flex-row justify-center gap-4 pt-6">
      <a href="/" class="px-6 py-3 rounded-full bg-white/70 dark:bg-gray-900/40 text-pink-600 dark:text-pink-300 border border-pink-300 dark:border-pink-700 shadow hover:scale-105 hover:bg-pink-100 dark:hover:bg-pink-800/30 transition duration-300">
        ⬅️ Volver al inicio
      </a>
      <a href="/catalogo" class="px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition duration-300 transform hover:scale-105">
        🎂 Ver Catálogo
      </a>
    </div>
  </div>
</section>
{/if}

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
    font-family: 'Inter', sans-serif;
  }
</style>
