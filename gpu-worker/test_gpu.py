#!/usr/bin/env python
import subprocess
import json

# Test the GPU task runner
test_payload = {
    "operation": "matrix_mult",
    "matrixSize": 4,
    "iterations": 1
}

result = subprocess.run([
    'python', 'gpu_task_runner.py', 
    json.dumps(test_payload)
], capture_output=True, text=True, cwd='.')

print("stdout:", result.stdout)
print("stderr:", result.stderr)
print("return code:", result.returncode)
