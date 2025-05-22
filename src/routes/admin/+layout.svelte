<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  export let data;
  const user = data.user;
  let darkMode = false;

  onMount(() => {
    const prefersDark =
      localStorage.getItem('dark') === 'true' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    darkMode = prefersDark;
    document.documentElement.classList.toggle('dark', darkMode);
  });

  function toggleDarkMode() {
    darkMode = !darkMode;
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('dark', String(darkMode));
  }

  async function logout() {
    document.cookie = 'sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict';
    document.cookie = 'sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict';
    goto('/login');
  }

  function goHome() {
    goto('/');
  }
</script>

<div class="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-pink-100 via-white to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-white transition-colors duration-500 font-[Inter,sans-serif] relative overflow-hidden">
  <!-- Fondo decorativo estilo blur -->
  <div class="absolute -top-10 -left-10 w-96 h-96 bg-pink-300 rounded-full opacity-20 blur-3xl animate-pulse"></div>
  <div class="absolute bottom-0 right-0 w-72 h-72 bg-purple-200 rounded-full opacity-20 blur-2xl animate-pulse delay-300"></div>

  <!-- Floating Controls -->
  <div class="fixed bottom-6 right-6 flex flex-col gap-3 z-50 animate-fade-in">
    <button on:click={toggleDarkMode} aria-label="Toggle theme"
      class="p-3 rounded-full backdrop-blur-md bg-white/70 dark:bg-gray-800/70 text-pink-600 dark:text-white shadow-lg hover:scale-110 active:scale-95 transition-all duration-300">
      {#if darkMode} 🌞 {:else} 🌙 {/if}
    </button>
    <button on:click={goHome} aria-label="Go home"
      class="p-3 rounded-full backdrop-blur-md bg-white/70 dark:bg-gray-800/70 text-pink-600 dark:text-white shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 md:hidden">
      🏠
    </button>
  </div>

  <!-- Sidebar -->
  <aside class="w-full md:w-64 flex-shrink-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl shadow-xl md:rounded-r-2xl border-b md:border-b-0 md:border-r border-pink-200 dark:border-gray-700 p-6 sm:p-8 space-y-10 animate-fade-in z-10">
    <h2 class="text-4xl font-extrabold text-pink-600 dark:text-pink-400 tracking-tight animate-fade-in">Victoria Cake</h2>
    <nav class="space-y-3">
      <a href="/" class="flex items-center gap-3 px-4 py-2 rounded-2xl text-base font-medium hover:bg-pink-100 dark:hover:bg-pink-900/30 text-gray-800 dark:text-gray-200 transition-all duration-300 hover:scale-[1.02] active:scale-95">
        🏠 Inicio
      </a>
      <a href="/admin/panel" class="flex items-center gap-3 px-4 py-2 rounded-2xl text-base font-medium hover:bg-pink-100 dark:hover:bg-pink-900/30 text-gray-800 dark:text-gray-200 transition-all duration-300 hover:scale-[1.02] active:scale-95">
        📋 Panel
      </a>
      <a href="/admin/agregar" class="flex items-center gap-3 px-4 py-2 rounded-2xl text-base font-medium hover:bg-pink-100 dark:hover:bg-pink-900/30 text-gray-800 dark:text-gray-200 transition-all duration-300 hover:scale-[1.02] active:scale-95">
        ➕ Agregar producto
      </a>
    </nav>
    <div class="pt-6 border-t border-pink-200 dark:border-gray-700 animate-fade-in">
      <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email ?? 'Desconocido'}</p>
      <button on:click={logout}
        class="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-red-100 to-red-200 dark:from-red-800/40 dark:to-red-700/30 text-red-600 dark:text-red-300 hover:scale-[1.05] active:scale-95 transition-transform duration-300">
        🔓 Cerrar sesión
      </button>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 w-full p-6 sm:p-8 md:p-12 animate-fade-in z-10">
    <slot />
  </main>
</div>

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(24px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.7s ease-out both;
  }

  html {
    scroll-behavior: smooth;
    touch-action: manipulation;
  }

  @media (max-width: 768px) {
    aside {
      border-radius: 0 !important;
    }
  }
</style>
