with open('src/routes/admin/recetas/[id]/+page.svelte', 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    line_num = i + 1
    # Simple tag detection
    import re
    tokens = re.findall(r'<div|</div|<section|</section|<header|</header|<aside|</aside', line)
    for token in tokens:
        if token.startswith('</'):
            tag = token[2:]
            if not stack:
                print(f"Error: Found </{tag}> at line {line_num} but stack is empty")
            else:
                last_tag, last_line = stack.pop()
                if last_tag != tag:
                    print(f"Error: Mismatched tag at line {line_num}. Found </{tag}>, expected </{last_tag}> (opened at line {last_line})")
        else:
            tag = token[1:]
            stack.append((tag, line_num))

if stack:
    print("Error: The following tags were left open:")
    for tag, line in stack:
        print(f"  <{tag}> opened at line {line}")
else:
    print("Success: All structural tags (div, section, header, aside) are balanced.")
