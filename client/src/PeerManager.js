import Peer from 'peerjs'

// Handles peer-to-peer connections using Peer.js
// Will be implemented to manage peer discovery, job distribution, and result collection

export default class PeerManager {
  constructor(onJobResult, onPeerConnected, onPeerDisconnected) {
    this.peer = new Peer()
    this.connections = new Map() // Store multiple connections
    this.peerId = ''
    this.onJobResult = onJobResult
    this.onPeerConnected = onPeerConnected
    this.onPeerDisconnected = onPeerDisconnected
    this.onPeerId = null
    
    this.peer.on('open', id => {
      this.peerId = id
      console.log('Peer opened with ID:', id)
      if (this.onPeerId) this.onPeerId(id)
    })
    
    this.peer.on('connection', conn => {
      console.log('Incoming connection from:', conn.peer)
      this.handleIncomingConnection(conn)
    })
  }

  handleIncomingConnection(conn) {
    conn.on('open', () => {
      console.log('Incoming connection opened from:', conn.peer)
      this.connections.set(conn.peer, conn)
      
      // Send connection acknowledgment
      conn.send({
        type: 'connection_established',
        peerId: this.peerId,
        timestamp: Date.now()
      })
      
      // Notify the UI about new peer connection
      if (this.onPeerConnected) {
        this.onPeerConnected(conn.peer, 'connected')
      }
    })
    
    conn.on('data', async data => {
      if (data.type === 'connection_established') {
        console.log('Connection established with:', data.peerId)
        // Both sides are now connected
      } else if (data.job) {
        // Send job to backend GPU worker
        const result = await this.runJobOnBackend(data.job)
        conn.send({ result, jobId: data.job.jobId })
      } else if (data.result !== undefined) {
        if (this.onJobResult) this.onJobResult(data)
      }
    })
    
    conn.on('close', () => {
      console.log('Connection closed with:', conn.peer)
      this.connections.delete(conn.peer)
      if (this.onPeerDisconnected) {
        this.onPeerDisconnected(conn.peer)
      }
    })
    
    conn.on('error', (error) => {
      console.error('Connection error with:', conn.peer, error)
      if (this.onPeerDisconnected) {
        this.onPeerDisconnected(conn.peer)
      }
    })
  }
  connectToPeer(connId) {
    if (this.connections.has(connId)) {
      console.log('Already connected to peer:', connId)
      return
    }

    const conn = this.peer.connect(connId)
    console.log('Connecting to peer:', connId)
    
    conn.on('open', () => {
      console.log('Outgoing connection opened to:', connId)
      this.connections.set(connId, conn)
      
      // Send connection establishment message
      conn.send({
        type: 'connection_established',
        peerId: this.peerId,
        timestamp: Date.now()
      })
      
      // Notify the UI about successful connection
      if (this.onPeerConnected) {
        this.onPeerConnected(connId, 'connected')
      }
    })
    
    conn.on('data', data => {
      if (data.type === 'connection_established') {
        console.log('Connection acknowledged by:', data.peerId)
      } else if (data.result !== undefined && this.onJobResult) {
        this.onJobResult(data)
      }
    })
    
    conn.on('close', () => {
      console.log('Outgoing connection closed to:', connId)
      this.connections.delete(connId)
      if (this.onPeerDisconnected) {
        this.onPeerDisconnected(connId)
      }
    })
    
    conn.on('error', (error) => {
      console.error('Outgoing connection error to:', connId, error)
      if (this.onPeerDisconnected) {
        this.onPeerDisconnected(connId)
      }
    })
  }

  sendJob(job, targetPeerId = null) {
    if (targetPeerId && this.connections.has(targetPeerId)) {
      const conn = this.connections.get(targetPeerId)
      conn.send({ job })
    } else {
      // Send to all connected peers
      this.connections.forEach(conn => {
        conn.send({ job })
      })
    }
  }

  getConnectedPeers() {
    return Array.from(this.connections.keys())
  }

  isConnectedToPeer(peerId) {
    return this.connections.has(peerId)
  }

  disconnectFromPeer(peerId) {
    if (this.connections.has(peerId)) {
      const conn = this.connections.get(peerId)
      conn.close()
      this.connections.delete(peerId)
    }
  }
  setPeerIdCallback(callback) {
    this.onPeerId = callback
    // If peer ID is already available, call the callback immediately
    if (this.peerId) {
      callback(this.peerId)
    }
  }

  // Call the Node.js backend to run the job
  async runJobOnBackend(job) {
    const res = await fetch('http://localhost:5001/run-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job)
    })
    const data = await res.json()
    return data.result
  }
}
