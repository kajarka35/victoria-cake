<script lang="ts">
  export let onLoginClick = () => {};
</script>

<!-- Este contenedor ya no tiene in:fly para evitar interferencias -->
<div class="relative w-full">
  <div class="relative group w-full max-w-md animate-float">
    <div class="relative overflow-hidden rounded-3xl shadow-2xl transition-transform duration-700 group-hover:scale-[1.05] group-hover:rotate-[1deg]">
      <img
        src="https://szhoripztfaqkqneofbt.supabase.co/storage/v1/object/public/imagenes-productos/productos/imagen.webp"
        alt="Pastel decorado"
        class="w-full h-auto object-cover rounded-3xl transition duration-700 group-hover:brightness-110 group-hover:contrast-105"
        loading="lazy"
      />

      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-0 left-0 h-full w-1/4 bg-white opacity-10 blur-sm rotate-12 animate-shine"></div>
      </div>

      <div class="absolute -top-14 left-1/2 h-36 w-36 sm:h-44 sm:w-44 -translate-x-1/2 bg-white/60 blur-3xl rounded-full opacity-50 animate-pulse"></div>

      <svg class="absolute top-[8%] left-[8%] w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 drop-shadow animate-twinkle" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 15.4l3.76 2.27-.99-4.28L18.5 9.5l-4.38-.38L12 5l-2.12 4.12-4.38.38 3.73 3.89-1 4.28z"/>
      </svg>
      <svg class="absolute top-[22%] right-[10%] w-3 h-3 sm:w-4 sm:h-4 text-white drop-shadow-lg animate-twinkle-delay" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 15.4l3.76 2.27-.99-4.28L18.5 9.5l-4.38-.38L12 5l-2.12 4.12-4.38.38 3.73 3.89-1 4.28z"/>
      </svg>

      <svg class="absolute bottom-[12%] left-[14%] w-5 h-5 sm:w-6 sm:h-6 animate-float-heart" viewBox="0 0 24 24" fill="#f472b6">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.13 2.44h1.74C14.09 5.01 15.76 4 17.5 4 20 4 22 6 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <svg class="absolute bottom-[16%] right-[16%] w-5 h-5 sm:w-6 sm:h-6 animate-float-heart-delay" viewBox="0 0 24 24" fill="#fb7185">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.13 2.44h1.74C14.09 5.01 15.76 4 17.5 4 20 4 22 6 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>

      <div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div class="absolute bottom-6 left-1/3 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-white/40 rounded-full blur-sm animate-bubble"></div>
        <div class="absolute bottom-10 right-1/4 h-1 w-1 sm:h-1.5 sm:w-1.5 bg-pink-200/60 rounded-full blur-sm animate-bubble-delay"></div>
        <div class="absolute bottom-5 left-1/2 h-2 w-2 sm:h-2.5 sm:w-2.5 bg-yellow-100/80 rounded-full blur animate-bubble"></div>
      </div>

      <div
        class="absolute bottom-4 left-4 cursor-pointer rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-pink-600 shadow-md backdrop-blur-md select-none"
        title="Victoria Cake"
        on:click={onLoginClick}
      >
        Hecho con amor ♥
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  @keyframes twinkle {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.2); }
  }
  .animate-twinkle {
    animation: twinkle 3s ease-in-out infinite;
  }
  .animate-twinkle-delay {
    animation: twinkle 3.5s ease-in-out infinite 1.5s;
  }
  @keyframes float-heart {
    0% { transform: translateY(0); opacity: 1; }
    50% { transform: translateY(-10px); opacity: 0.7; }
    100% { transform: translateY(-20px); opacity: 0; }
  }
  .animate-float-heart {
    animation: float-heart 4.5s ease-in-out infinite;
  }
  .animate-float-heart-delay {
    animation: float-heart 5s ease-in-out infinite 2s;
  }
  @keyframes shine {
    0% { transform: translateX(-100%) rotate(12deg); }
    100% { transform: translateX(100%) rotate(12deg); }
  }
  .animate-shine {
    animation: shine 6s ease-in-out infinite;
  }
  @keyframes bubble {
    0% { transform: translateY(0) scale(1); opacity: 0.9; }
    50% { transform: translateY(-16px) scale(1.1); opacity: 0.5; }
    100% { transform: translateY(-32px) scale(0.9); opacity: 0; }
  }
  .animate-bubble {
    animation: bubble 6s ease-in-out infinite;
  }
  .animate-bubble-delay {
    animation: bubble 7s ease-in-out infinite 2s;
  }
</style>
