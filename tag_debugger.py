import re

with open('src/routes/admin/recetas/[id]/+page.svelte', 'r', encoding='utf-8') as f:
    content = f.read()

# Simple tag extraction
tags = re.findall(r'<(div|/div|section|/section|header|/header|aside|/aside)', content)

stack = []
for tag in tags:
    if tag.startswith('/'):
        clean_tag = tag[1:]
        if not stack:
            print(f"Error: Found </{clean_tag}> but nothing is open")
        else:
            last = stack.pop()
            if last != clean_tag:
                print(f"Error: Mismatched tag. Found </{clean_tag}>, expected </{last}>")
    else:
        stack.append(tag)

print(f"Final Stack: {stack}")
