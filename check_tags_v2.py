import re

with open('src/routes/admin/recetas/[id]/+page.svelte', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove comments to avoid false matches
content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
# Remove script and style blocks
content = re.sub(r'<script.*?>.*?</script>', '', content, flags=re.DOTALL)
content = re.sub(r'<style.*?>.*?</style>', '', content, flags=re.DOTALL)

tags = re.findall(r'<(div|section|aside|header|table|thead|tbody|tr|td|span|button|a|h1|h2|h3|h4|svelte:head)(?:\s+[^>]*?)?>|</(div|section|aside|header|table|thead|tbody|tr|td|span|button|a|h1|h2|h3|h4|svelte:head)>', content, re.IGNORECASE)

stack = []
for opening, closing in tags:
    if opening:
        stack.append(opening.lower())
    else:
        tag = closing.lower()
        if not stack:
            print(f"Error: Found </{tag}> but stack is empty")
        else:
            last_tag = stack.pop()
            if last_tag != tag:
                print(f"Error: Mismatched tag. Found </{tag}>, expected </{last_tag}>")

if stack:
    print("Error: The following tags were left open:")
    for tag in stack:
        print(f"  <{tag}>")
else:
    print("Success: All tags are balanced.")
