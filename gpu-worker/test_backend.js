const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testBackend() {
    try {
        const response = await fetch('http://localhost:5001/run-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },            body: JSON.stringify({
                payload: {
                    operation: 'matrix_mult',
                    matrixSize: 4,
                    iterations: 1
                }
            })
        });
        
        const data = await response.json();
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

testBackend();
