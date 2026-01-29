
import sys

try:
    with open("check.log", 'r', encoding='utf-16le') as f:
        content = f.read()
except:
    with open("check.log", 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

with open("check_utf8.log", 'w', encoding='utf-8') as f:
    f.write(content)
