const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { receiveJob } = require('./job-worker')

const app = express()
app.use(cors())
app.use(bodyParser.json())



// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err)
  res.status(500).json({ error: 'Server error: ' + err.message })
})

app.post('/run-job', (req, res) => {
  const job = req.body
  
  let hasResponded = false
  
  // Set a timeout for the job (30 seconds)
  const timeout = setTimeout(() => {
    if (!hasResponded) {
      hasResponded = true
      console.log('Job timed out after 30 seconds')
      res.status(500).json({ error: 'Job timed out' })
    }  }, 30000)
  
  try {
    receiveJob({ payload: job.payload, numPeers: job.numPeers || 2 }, result => {
      if (hasResponded) return // Already timed out
      
      clearTimeout(timeout)
      hasResponded = true
      
      if (result === null || result === undefined) {
        res.status(500).json({ error: 'GPU job failed - no result returned' })
      } else if (typeof result === 'string' && result.startsWith('Error:')) {
        res.status(500).json({ error: result })
      } else {
        res.json({ result })
      }
    })
  } catch (err) {
    if (hasResponded) return // Already timed out
    
    clearTimeout(timeout)
    hasResponded = true
    console.error('Caught error:', err)
    res.status(500).json({ error: err.message || 'Internal error' })
  }
})

app.listen(5001, () => {
  console.log('GPU Worker HTTP API running on http://localhost:5001')
})
