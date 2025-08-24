# task_aggregator.py
# Aggregates results from all peers
import sys
import json

def aggregate_results(results, operation='sum'):
    if operation == 'sum':
        return sum(results)
    elif operation == 'mean':
        return sum(results) / len(results)
    else:
        raise ValueError('Unsupported aggregation')

# Example usage:
if __name__ == "__main__":
    if len(sys.argv) > 2:
        results = json.loads(sys.argv[1])
        operation = sys.argv[2]
        # Ensure all results are numbers (filter out null/None)
        results = [r for r in results if r is not None]
        print(aggregate_results(results, operation))
    else:
        print(aggregate_results([10, 20, 30], 'sum'))
