const fs = require('fs');

const content = fs.readFileSync('c:/Users/kajar/Desktop/Recetas olga/victoria-cake/src/routes/admin/recetas/[id]/+page.svelte', 'utf8');

function countTags(tagName) {
    const openRegex = new RegExp(`<${tagName}(\\s|>|$)`, 'g');
    const closeRegex = new RegExp(`</${tagName}>`, 'g');
    const openMatches = content.match(openRegex) || [];
    const closeMatches = content.match(closeRegex) || [];
    return { open: openMatches.length, close: closeMatches.length };
}

['div', 'section', 'aside', 'header', 'table', 'thead', 'tbody', 'tr', 'td', 'span', 'button', 'a', 'h1', 'h2', 'h3', 'h4'].forEach(tag => {
    const counts = countTags(tag);
    console.log(`${tag.padEnd(10)}: Open=${counts.open.toString().padEnd(3)} Close=${counts.close.toString().padEnd(3)} Diff=${counts.open - counts.close}`);
});

// Check if/each blocks
const ifOpen = (content.match(/\{#if/g) || []).length;
const ifClose = (content.match(/\{\/if\}/g) || []).length;
console.log(`if        : Open=${ifOpen.toString().padEnd(3)} Close=${ifClose.toString().padEnd(3)} Diff=${ifOpen - ifClose}`);

const eachOpen = (content.match(/\{#each/g) || []).length;
const eachClose = (content.match(/\{\/each\}/g) || []).length;
console.log(`each      : Open=${eachOpen.toString().padEnd(3)} Close=${eachClose.toString().padEnd(3)} Diff=${eachOpen - eachClose}`);
