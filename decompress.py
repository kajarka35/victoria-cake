import gzip
import shutil

input_file = "db_cluster-31-07-2025@21-53-38.backup.gz"
output_file = "db_cluster-31-07-2025@21-53-38.backup"

with gzip.open(input_file, 'rb') as f_in:
    with open(output_file, 'wb') as f_out:
        shutil.copyfileobj(f_in, f_out)

print(f"Decompressed to: {output_file}")
