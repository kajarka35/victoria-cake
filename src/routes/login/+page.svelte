<script lang="ts">
  import { supabase } from '$lib/supabaseClient.js';
  import { goto } from '$app/navigation';
  import InputField from '$lib/components/InputField.svelte';
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { browser } from '$app/environment';

  let email = '';
  let password = '';
  let cargando = false;
  let errorMsg = '';
  let successMsg = '';
  let show = false;
  let showPassword = false;
  let darkMode = false;

  onMount(async () => {
    setTimeout(() => (show = true), 100);

    if (browser) {
      darkMode = localStorage.getItem('dark') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', darkMode);

      const { data } = await supabase.auth.getSession();
      if (data.session) goto('/admin/panel');
    }
  });

  async function login() {
    cargando = true;
    errorMsg = '';
    successMsg = '';

    if (!email.trim() || !password.trim()) {
      errorMsg = '⚠️ Completa todos los campos';
      cargando = false;
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    cargando = false;

    if (error) {
      errorMsg = '❌ Usuario o contraseña incorrectos';
    } else if (data.session?.access_token) {
      const session = data.session;
      document.cookie = `sb-access-token=${session.access_token}; Path=/; Secure; SameSite=Strict`;
      document.cookie = `sb-refresh-token=${session.refresh_token}; Path=/; Secure; SameSite=Strict`;
      successMsg = '✅ Bienvenido, redirigiendo...';
      setTimeout(() => goto('/admin/panel'), 1500);
    }
  }

  function toggleDarkMode() {
    darkMode = !darkMode;
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('dark', String(darkMode));
  }

  function goHome() {
    goto('/');
  }

  function goContact() {
    goto('/contacto');
  }
</script>

<svelte:head>
  <title>Iniciar sesión | Victoria Cake</title>
</svelte:head>

{#if show}
  <div class="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-pink-100 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 relative overflow-hidden">
    <!-- Fondo animado -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute w-[300px] h-[300px] rounded-full bg-pink-300/30 blur-3xl top-10 left-[-80px] animate-pulse"></div>
      <div class="absolute w-[200px] h-[200px] rounded-full bg-purple-400/20 blur-2xl bottom-10 right-[-50px] animate-ping"></div>
    </div>

    <!-- Toggle dark -->
    <button
      class="absolute top-5 right-5 p-2 rounded-full bg-white/70 dark:bg-gray-700 text-pink-600 dark:text-white shadow hover:scale-110 transition"
      on:click={toggleDarkMode}
      aria-label="Cambiar modo"
    >
      {#if darkMode} 🌞 {:else} 🌙 {/if}
    </button>

    <!-- Volver -->
    <button
      on:click={goHome}
      class="absolute top-5 left-5 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 bg-white/70 dark:bg-gray-700/80 text-pink-600 dark:text-white border border-pink-300 dark:border-gray-600 backdrop-blur-md shadow hover:scale-105 transition-all"
      aria-label="Volver al inicio"
    >
      ← Inicio
    </button>

    <!-- Panel -->
    <div
      class="w-full max-w-md bg-white/90 dark:bg-gray-800/80 rounded-3xl shadow-2xl backdrop-blur-md p-6 sm:p-8 space-y-6 animate-slide-fade"
      transition:fly={{ y: 30, duration: 500 }}
    >
      <h1 class="text-3xl sm:text-4xl font-extrabold text-center text-pink-600 dark:text-pink-400">
        Panel Admin
      </h1>
      <p class="text-sm text-center text-gray-600 dark:text-gray-300">
        Ingresa tus credenciales para continuar
      </p>

      {#if errorMsg}
        <div class="bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 border border-red-300 dark:border-red-700 p-3 rounded-xl text-sm text-center font-medium animate-fade-in">
          {errorMsg}
        </div>
      {/if}

      {#if successMsg}
        <div class="bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-200 border border-green-300 dark:border-green-700 p-3 rounded-xl text-sm text-center font-medium animate-fade-in">
          {successMsg}
        </div>
      {/if}

      <form on:submit|preventDefault={login} class="space-y-5">
        <InputField
          id="email"
          label="Correo electrónico"
          type="email"
          bind:value={email}
          placeholder="admin@victoriacake.com"
        />

        <div class="relative">
          <InputField
            id="password"
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            bind:value={password}
            placeholder="••••••••"
          />
          <button
            type="button"
            class="absolute top-9 right-3 text-base text-gray-500 dark:text-gray-300 hover:scale-110 transition"
            on:click={() => (showPassword = !showPassword)}
            aria-label="Mostrar u ocultar contraseña"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        <button
          type="submit"
          class="w-full py-3 bg-pink-600 hover:bg-pink-700 active:scale-95 text-white font-semibold rounded-xl transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
          disabled={cargando}
        >
          {cargando ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
      </form>
    </div>

    <!-- Botones flotantes -->
    <div class="fixed bottom-5 right-5 z-[999] flex flex-col gap-3 items-end pointer-events-auto">
      <button
        on:click={goHome}
        class="p-3 rounded-full backdrop-blur-md bg-white/60 dark:bg-gray-800/60 text-pink-600 dark:text-white border border-pink-200 dark:border-pink-400 shadow-xl hover:scale-105 transition-all duration-300"
        aria-label="Ir al catálogo"
      >
        🏠
      </button>
      <button
        on:click={goContact}
        class="p-3 rounded-full backdrop-blur-md bg-pink-500/90 text-white shadow-xl hover:bg-pink-600 hover:scale-105 transition-all duration-300"
        aria-label="Contactar"
      >
        📞
      </button>
    </div>
  </div>
{/if}

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slide-fade {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.4s ease-out both;
  }

  .animate-slide-fade {
    animation: slide-fade 0.6s ease-out both;
  }

  html {
    scroll-behavior: smooth;
  }

  @media (max-width: 640px) {
    h1 {
      font-size: 1.8rem;
    }

    .p-6 {
      padding: 1.5rem !important;
    }
  }
</style>
