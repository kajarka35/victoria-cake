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
		{id}
		{type}
		bind:value
		{placeholder}
		class="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:outline-none dark:bg-gray-700 dark:text-white"
		{required}
	/>
</div>
