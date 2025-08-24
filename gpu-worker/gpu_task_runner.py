# gpu_task_runner.py
# Enhanced GPU task runner with multiple intensive operations
import sys
import json
import torch
import time
import numpy as np

def run_gpu_task(payload, operation='sum'):
    """Run various GPU-intensive tasks"""
    # Force use of CUDA (GPU) if available, else use CPU with warning
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    if device == 'cpu':
        print('Warning: CUDA GPU not available, using CPU', file=sys.stderr)
    
    print(f'Running {operation} on {device}', file=sys.stderr)
    
    if operation == 'matrix_mult':
        return run_matrix_multiplication(payload, device)
    elif operation == 'image_filter':
        return run_image_processing(payload, device)
    elif operation == 'neural_train':
        return run_neural_training(payload, device)
    elif operation == 'crypto_hash':
        return run_crypto_hashing(payload, device)
    elif operation == 'monte_carlo':
        return run_monte_carlo(payload, device)
    elif operation == 'sum':
        # Legacy sum operation
        if 'numbers' in payload:
            tensor = torch.tensor(payload['numbers'], device=device)
            return tensor.sum().item()
        else:
            return 0
    else:
        raise ValueError(f'Unsupported operation: {operation}')

def run_matrix_multiplication(payload, device):
    """GPU-intensive matrix multiplication"""
    size = payload.get('matrixSize', 512)
    iterations = payload.get('iterations', 10)
      # Create random matrices
    a = torch.randn(size, size, device=device)
    b = torch.randn(size, size, device=device)
    
    start_time = time.time()
    result_matrix = None
    for i in range(iterations):
        result_matrix = torch.matmul(a, b)
        if device == 'cuda':
            torch.cuda.synchronize()  # Ensure GPU work is complete
    
    end_time = time.time()
    computation_time = end_time - start_time
    
    # Convert result to CPU and get a sample of the matrix (first 4x4 corner for display)
    result_cpu = result_matrix.cpu()
    sample_size = min(4, size)  # Show max 4x4 sample
    sample_result = result_cpu[:sample_size, :sample_size].tolist()
    
    # Calculate some statistics
    matrix_sum = result_cpu.sum().item()
    matrix_mean = result_cpu.mean().item()
    matrix_max = result_cpu.max().item()
    matrix_min = result_cpu.min().item()
    
    return {
        'result': f'Matrix multiplication completed - {size}x{size} matrices',
        'sample_result': sample_result,
        'statistics': {
            'sum': round(matrix_sum, 3),
            'mean': round(matrix_mean, 3),
            'max': round(matrix_max, 3),
            'min': round(matrix_min, 3)
        },
        'size': size,
        'iterations': iterations,
        'time': round(computation_time, 3),
        'device': device
    }

def run_image_processing(payload, device):
    """GPU-intensive image processing simulation"""
    image_size = payload.get('imageSize', 1024)
    iterations = payload.get('iterations', 5)
    
    # Create a fake image tensor
    image = torch.randn(3, image_size, image_size, device=device)
    
    start_time = time.time()
    for i in range(iterations):
        # Apply Gaussian blur-like convolution
        kernel = torch.ones(3, 3, device=device) / 9.0
        # Simulate convolution operation
        processed = torch.conv2d(image.unsqueeze(0), kernel.unsqueeze(0).unsqueeze(0).repeat(3,1,1,1), padding=1, groups=3)
        if device == 'cuda':
            torch.cuda.synchronize()
    
    end_time = time.time()
    computation_time = end_time - start_time
    
    return {
        'result': f'Image processing completed',
        'image_size': image_size,
        'iterations': iterations,
        'time': round(computation_time, 3),
        'device': device
    }

def run_neural_training(payload, device):
    """GPU-intensive neural network training simulation"""
    batch_size = payload.get('batchSize', 64)
    epochs = payload.get('epochs', 5)
    layers = payload.get('layers', [128, 64, 32])
    
    # Create a simple neural network
    input_size = 784  # Like MNIST
    model_layers = []
    prev_size = input_size
    
    for layer_size in layers:
        model_layers.append(torch.nn.Linear(prev_size, layer_size))
        model_layers.append(torch.nn.ReLU())
        prev_size = layer_size
    
    model_layers.append(torch.nn.Linear(prev_size, 10))  # Output layer
    model = torch.nn.Sequential(*model_layers).to(device)
    
    # Fake training data
    x = torch.randn(batch_size, input_size, device=device)
    y = torch.randint(0, 10, (batch_size,), device=device)
    
    criterion = torch.nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    
    start_time = time.time()
    for epoch in range(epochs):
        for _ in range(10):  # Multiple batches per epoch
            optimizer.zero_grad()
            outputs = model(x)
            loss = criterion(outputs, y)
            loss.backward()
            optimizer.step()
            if device == 'cuda':
                torch.cuda.synchronize()
    
    end_time = time.time()
    computation_time = end_time - start_time
    
    return {
        'result': f'Neural network training completed',
        'epochs': epochs,
        'batch_size': batch_size,
        'layers': layers,
        'time': round(computation_time, 3),
        'device': device
    }

def run_crypto_hashing(payload, device):
    """GPU-intensive crypto-like hashing simulation"""
    iterations = payload.get('iterations', 100000)
    difficulty = payload.get('difficulty', 1)
    
    # Simulate crypto hashing with repeated operations
    data = torch.randint(0, 256, (1000,), device=device, dtype=torch.uint8)
    
    start_time = time.time()
    hash_count = 0
    for i in range(iterations):
        # Simulate hash operations using tensor operations
        hashed = torch.sum(data * (i + 1)) % (2**32)
        if hashed.item() % (10**difficulty) == 0:  # Simulated difficulty
            hash_count += 1
        if device == 'cuda':
            torch.cuda.synchronize()
    
    end_time = time.time()
    computation_time = end_time - start_time
    
    return {
        'result': f'Crypto hashing completed',
        'iterations': iterations,
        'valid_hashes': hash_count,
        'difficulty': difficulty,
        'time': round(computation_time, 3),
        'device': device
    }

def run_monte_carlo(payload, device):
    """GPU-intensive Monte Carlo simulation"""
    simulations = payload.get('simulations', 1000000)
    
    # Monte Carlo estimation of Pi
    start_time = time.time()
    points = torch.rand(simulations, 2, device=device) * 2 - 1  # Random points in [-1,1]x[-1,1]
    distances = torch.sum(points**2, dim=1)  # Distance from origin
    inside_circle = torch.sum(distances <= 1.0).item()  # Points inside unit circle
    pi_estimate = 4.0 * inside_circle / simulations
    
    if device == 'cuda':
        torch.cuda.synchronize()
    
    end_time = time.time()
    computation_time = end_time - start_time
    
    return {
        'result': f'Monte Carlo simulation completed',
        'simulations': simulations,
        'pi_estimate': round(pi_estimate, 6),
        'time': round(computation_time, 3),
        'device': device
    }

# Example usage:
if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            print('{"error": "No payload provided"}')
            sys.exit(1)
        
        payload_str = sys.argv[1]
        print(f'Received payload: {payload_str}', file=sys.stderr)
        
        payload = json.loads(payload_str)
        operation = payload.get('operation', 'sum')
        
        print(f'Running GPU task: {operation}', file=sys.stderr)
        result = run_gpu_task(payload, operation)
        
        # Ensure we always return valid JSON
        if result is None:
            result = {"error": "Task returned null result"}
        
        output = json.dumps(result)
        print(f'Task output: {output}', file=sys.stderr)
        print(output)
        
    except json.JSONDecodeError as e:
        error_result = {"error": f"Invalid JSON payload: {str(e)}"}
        print(f'JSON Error: {str(e)}', file=sys.stderr)
        print(json.dumps(error_result))
    except Exception as e:
        error_result = {"error": f"Task failed: {str(e)}"}
        print(f'ERROR: {str(e)}', file=sys.stderr)
        print(json.dumps(error_result))
