const { exec, spawnSync } = require('child_process')
const path = require('path')

// Simulated GPU job worker for Node.js
// Receives jobs, processes them, and returns results

console.log('GPU Worker ready. Waiting for jobs...');
// Implementation will be added for job receiving and processing

// Split the job into chunks using Python script
function splitTaskPython(data, numChunks) {
  console.log('Calling task_splitter.py with:', JSON.stringify(data), 'chunks:', numChunks)
  const result = spawnSync('python', ['task_splitter.py', JSON.stringify(data), numChunks], { encoding: 'utf-8', cwd: __dirname })
  console.log('task_splitter.py stdout:', result.stdout)
  console.log('task_splitter.py stderr:', result.stderr)
  console.log('task_splitter.py exit code:', result.status)
  
  if (result.error) {
    console.error('task_splitter.py spawn error:', result.error)
    throw result.error
  }
  
  if (result.status !== 0) {
    console.error('task_splitter.py non-zero exit:', result.status)
    throw new Error(`task_splitter.py exited with code ${result.status}`)
  }
  
  if (!result.stdout.trim()) {
    console.error('task_splitter.py returned empty output')
    throw new Error('task_splitter.py returned empty output')
  }
  
  try {
    return JSON.parse(result.stdout)
  } catch (err) {
    console.error('Failed to parse task_splitter.py output as JSON:', result.stdout)
    throw new Error('Invalid JSON from task_splitter.py: ' + err.message)
  }
}

// Aggregate results using Python script
function aggregateResultsPython(results, operation) {
  const result = spawnSync('python', ['task_aggregator.py', JSON.stringify(results), operation], { encoding: 'utf-8', cwd: __dirname })
  if (result.error) throw result.error
  return parseFloat(result.stdout)
}

// Simulate receiving a job (in real use, this would be from Peer.js or another channel)
function receiveJob(job, callback) {
  console.log('=== receiveJob called ===')
  console.log('Job payload:', job.payload)
    // Handle game rendering tasks
  if (job.payload.operation && ['render_frame', 'compute_lighting', 'apply_shaders', 'post_process'].includes(job.payload.operation)) {
    console.log('Running game rendering task:', job.payload.operation)
    
    const payloadStr = JSON.stringify(job.payload)
    console.log('Game Render payload:', payloadStr)
    
    const result = spawnSync('python', ['game_renderer_simple.py', payloadStr], { 
      encoding: 'utf-8', 
      cwd: __dirname, 
      timeout: 10000 // 10 second timeout for rendering
    })
    
    console.log('Game render stdout:', result.stdout)
    console.log('Game render stderr:', result.stderr)
    console.log('Game render exit code:', result.status)
    
    if (result.error) {
      console.error('Game render error:', result.error)
      callback(`Error: ${result.error.message}`)
      return
    } 
    
    if (result.status !== 0) {
      console.error('Game render non-zero exit code:', result.status)
      callback(`Error: Process exited with code ${result.status}. ${result.stderr}`)
      return
    } 
    
    if (!result.stdout || result.stdout.trim() === 'null') {
      console.error('Game render returned null or empty result')
      callback('Error: Game render returned null result')
      return
    }
    
    try {
      const renderResult = JSON.parse(result.stdout.trim())
      console.log('Game render result:', renderResult)
      
      // Return the full render result object
      callback(renderResult)
    } catch (parseError) {
      console.error('Failed to parse game render result:', parseError)
      console.error('Raw stdout:', result.stdout)
      callback(`Error: Failed to parse result - ${result.stdout}`)
    }
    return
  }

  // Handle new GPU-intensive tasks
  if (job.payload.operation && ['matrix_mult', 'image_filter', 'neural_train', 'crypto_hash', 'monte_carlo'].includes(job.payload.operation)) {
    console.log('Running GPU-intensive task:', job.payload.operation)
    
    const payloadStr = JSON.stringify(job.payload)
    console.log('GPU Task payload:', payloadStr)
    
    const result = spawnSync('python', ['gpu_task_runner.py', payloadStr], { 
      encoding: 'utf-8', 
      cwd: __dirname, 
      timeout: 60000 
    })
    
    console.log('GPU task stdout:', result.stdout)
    console.log('GPU task stderr:', result.stderr)
    console.log('GPU task exit code:', result.status)
    
    if (result.error) {
      console.error('GPU task error:', result.error)
      callback(`Error: ${result.error.message}`)
      return
    } 
    
    if (result.status !== 0) {
      console.error('GPU task non-zero exit code:', result.status)
      callback(`Error: Process exited with code ${result.status}. ${result.stderr}`)
      return
    } 
    
    if (!result.stdout || result.stdout.trim() === 'null') {
      console.error('GPU task returned null or empty result')
      callback('Error: GPU task returned null result')
      return
    }
    
    try {
      const taskResult = JSON.parse(result.stdout.trim())
      console.log('GPU task result:', taskResult)
        // Return the full result object for GPU-intensive tasks
      if (typeof taskResult === 'object' && taskResult.result) {
        callback(taskResult)
      } else {
        callback(taskResult)
      }
    } catch (parseError) {
      console.error('Failed to parse GPU task result:', parseError)
      console.error('Raw stdout:', result.stdout)
      callback(`Error: Failed to parse result - ${result.stdout}`)
    }
    return
  }
  
  // Legacy chunk-based processing for simple operations
  if (!job.payload.numbers && job.payload.operation === 'sum') {
    // Create a simple fallback for sum operations without numbers
    console.log('No numbers array found, creating fallback for sum operation')
    callback('Sum operation completed with default values')
    return
  }
  
  if (!job.payload.numbers) {
    console.error('No numbers array found in payload and not a recognized GPU task')
    callback('Error: Invalid payload - no numbers array')
    return
  }
  
  // Split the job into chunks using Python
  try {
    const chunks = splitTaskPython(job.payload.numbers, job.numPeers || 2)
    console.log('Split into chunks:', chunks)

    // For each chunk, run the GPU task runner as a subprocess
    let results = []
    let completed = 0
    chunks.forEach((chunk, idx) => {
      console.log(`\n--- Processing chunk ${idx + 1} ---`)
      const chunkStr = JSON.stringify(chunk)
      console.log('Chunk:', chunkStr)
      
      const legacyPayload = { numbers: chunk, operation: job.payload.operation || 'sum' }
      const result = spawnSync('python', ['gpu_task_runner.py', JSON.stringify(legacyPayload)], { encoding: 'utf-8', cwd: __dirname })
      
      console.log('stdout:', result.stdout)
      console.log('stderr:', result.stderr)
      console.log('exit code:', result.status)
      
      if (result.error) {
        console.error('Subprocess error:', result.error)
        results[idx] = null
      } else if (result.status !== 0) {
        console.error('Subprocess non-zero exit code:', result.status)
        results[idx] = null
      } else {
        try {
          const parsed = JSON.parse(result.stdout)
          results[idx] = typeof parsed === 'object' ? parsed.result : parseFloat(result.stdout)
        } catch {
          results[idx] = parseFloat(result.stdout)
        }      }
      completed++
      console.log(`Chunk ${idx + 1} result:`, results[idx])
      
      if (completed === chunks.length) {
        console.log('All chunks completed, aggregating results:', results)
        // Aggregate results using Python
        const final = aggregateResultsPython(results, job.payload.operation || 'sum')
        console.log('Final aggregated result:', final)
        callback(final)
      }
    })
  } catch (error) {
    console.error('Error in legacy processing:', error)
    callback(`Error: ${error.message}`)
  }
}

// Export the receiveJob function so it can be used by server.js
module.exports = { receiveJob }

// For testing: simulate a job
if (require.main === module) {
  const job = {
    payload: {
      numbers: [1,2,3,4,5,6,7,8,9,10],
      operation: 'sum',
    },
    numPeers: 3,
  }
  receiveJob(job, (result) => {
    console.log('Final aggregated result:', result)
  })
}
