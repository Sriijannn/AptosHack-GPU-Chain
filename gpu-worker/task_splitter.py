# task_splitter.py
# Splits a large compute job into smaller chunks for distribution

import sys
import json

def split_task(data, num_chunks):
    """Split data (list or numpy array) into num_chunks nearly equal parts."""
    chunk_size = len(data) // num_chunks
    chunks = [data[i*chunk_size:(i+1)*chunk_size] for i in range(num_chunks)]
    # Add remainder to last chunk
    if len(data) % num_chunks:
        chunks[-1].extend(data[num_chunks*chunk_size:])
    return chunks

# Example usage:
if __name__ == "__main__":
    if len(sys.argv) > 2:
        arr = json.loads(sys.argv[1])
        num_chunks = int(sys.argv[2])
        print('Splitting:', arr, 'into', num_chunks, 'chunks', file=sys.stderr)
        print(json.dumps(split_task(arr, num_chunks)))
    else:
        arr = list(range(20))
        print(split_task(arr, 3))
