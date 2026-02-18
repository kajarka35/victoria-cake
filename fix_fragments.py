import re

with open('src/routes/admin/recetas/[id]/+page.svelte', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix split closing tags like </span\n>
content = re.sub(r'</(span|div|section|aside|header|p|h1|h2|h3|h4|button|a|td|tr|tbody|thead|table)\s*\n\s*>', r'</\1>', content)

# Fix split self-closing tags like /\n>
content = re.sub(r'/\s*\n\s*>', r'/>', content)

# Fix split opening tags attributes followed by > on new line
# This is trickier. Let's focus on the most common ones first.
content = re.sub(r'([a-zA-Z0-9"\'])\s*\n\s*>', r'\1>', content)

with open('src/routes/admin/recetas/[id]/+page.svelte', 'w', encoding='utf-8') as f:
    f.write(content)

print("Success: Tags unified.")
