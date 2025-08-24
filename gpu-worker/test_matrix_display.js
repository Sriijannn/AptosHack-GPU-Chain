const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testMatrixMultiplication() {
    try {
        const response = await fetch('http://localhost:5001/run-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                payload: {
                    operation: 'matrix_mult',
                    matrixSize: 3,
                    iterations: 1
                }
            })
        });
        
        const data = await response.json();
        console.log('=== Matrix Multiplication Result ===');
        console.log('Operation:', data.result.result);
        console.log('Matrix Size:', data.result.size + 'x' + data.result.size);
        console.log('Device Used:', data.result.device);
        console.log('Computation Time:', data.result.time + 's');
        console.log('\n=== Sample Matrix Result (3x3) ===');
        
        data.result.sample_result.forEach((row, i) => {
            const formattedRow = row.map(val => val.toFixed(3).padStart(8)).join(' ');
            console.log(`Row ${i + 1}: [${formattedRow}]`);
        });
        
        console.log('\n=== Matrix Statistics ===');
        console.log('Sum:', data.result.statistics.sum);
        console.log('Mean:', data.result.statistics.mean);
        console.log('Max:', data.result.statistics.max);
        console.log('Min:', data.result.statistics.min);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testMatrixMultiplication();
