<script lang="ts">
  export let id = '';
  export let label = '';
  export let type = 'text';
  export let value: string; // CAMBIO AQUÍ
  export let placeholder = '';
  export let required = true;
</script>


<div class="space-y-1">
  <label for={id} class="block text-sm font-semibold text-gray-700 dark:text-gray-300">
    {label}
  </label>
  <input
  id={id}
  type={type}
  bind:value
  placeholder={placeholder}
  class="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
  {required}
/>

</div>
