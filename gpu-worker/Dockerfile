# Dockerfile for GPU-enabled task runner
FROM pytorch/pytorch:latest
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir torch
CMD ["python", "gpu_task_runner.py"]
