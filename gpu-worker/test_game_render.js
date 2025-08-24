const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testGameRender() {
    try {
        const response = await fetch('http://localhost:5001/run-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                payload: {
                    operation: 'render_frame',
                    viewport: { x: 0, y: 0, width: 400, height: 300 },
                    scene: {
                        lighting: {
                            ambient: 0.3,
                            directional: { intensity: 0.8 }
                        }
                    },
                    objects: [
                        {
                            id: 'cube1',
                            position: { x: 0, y: 0, z: 0 },
                            size: { width: 80, height: 80 },
                            color: { r: 1.0, g: 0.3, b: 0.3 },
                            type: 'cube'
                        },
                        {
                            id: 'sphere1',
                            position: { x: 100, y: -50, z: 0 },
                            size: { width: 60, height: 60 },
                            color: { r: 0.3, g: 1.0, b: 0.3 },
                            type: 'sphere'
                        }
                    ],
                    quality: 'high'
                }
            })
        });
          const data = await response.json();
        console.log('Full response:', JSON.stringify(data, null, 2));
        
        if (data.result && data.result.result) {
            console.log('=== Game Render Result ===');
            console.log('Operation:', data.result.result);
            console.log('Render Time:', data.result.renderTime + 's');
            console.log('Device Used:', data.result.device);
            console.log('Objects Rendered:', data.result.objectsRendered);
            console.log('Quality:', data.result.quality);
            console.log('Resolution:', data.result.resolution);
            console.log('Frame Data Length:', data.result.frameData ? data.result.frameData.length : 0, 'characters');
            
            if (data.result.frameData) {
                console.log('Frame data starts with:', data.result.frameData.substring(0, 50) + '...');
            }
        } else {
            console.log('Unexpected response format');
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testGameRender();
