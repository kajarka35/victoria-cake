
import sys

def read_file(path):
    print(f"--- Reading {path} ---")
    try:
        # Try utf-16le first (PowerShell default often)
        with open(path, 'r', encoding='utf-16le') as f:
            print(f.read())
    except:
        try:
            # Try utf-8
            with open(path, 'r', encoding='utf-8') as f:
                print(f.read())
        except Exception as e:
            print(f"Error reading {path}: {e}")

if len(sys.argv) > 1:
    read_file(sys.argv[1])
else:
    read_file("lint_report.txt")
    read_file("check_report.txt")
