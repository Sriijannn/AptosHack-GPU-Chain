import React, { useState, useEffect, useRef } from 'react'
import GameGPUManager from '../GameGPUManager'
import PeerManager from '../PeerManager'
import './GameGPUInterface.css'

const GameGPUInterface = () => {
  const [gameGPUManager, setGameGPUManager] = useState(null)
  const [peerManager, setPeerManager] = useState(null)
  const [connectedPeers, setConnectedPeers] = useState([])
  const [isGameRunning, setIsGameRunning] = useState(false)
  const [isConnectedToNetwork, setIsConnectedToNetwork] = useState(false)
  const [myPeerId, setMyPeerId] = useState('')
  const [peerInputValue, setPeerInputValue] = useState('')
  const [renderStats, setRenderStats] = useState({
    fps: 0,
    frameTime: 0,
    peersUsed: 0,
    totalFrames: 0
  })
  const [gameScene, setGameScene] = useState({
    objects: [],
    lighting: { ambient: 0.3, directional: { intensity: 0.8 } },
    camera: { position: { x: 0, y: 0, z: 5 } }
  })
  const [loadBalancingEnabled, setLoadBalancingEnabled] = useState(true)
  const [renderQuality, setRenderQuality] = useState('high')
  const [currentFrame, setCurrentFrame] = useState(null)
  const canvasRef = useRef(null)
  const gameLoopRef = useRef(null)
  useEffect(() => {
    const gpm = new GameGPUManager()
    const pm = new PeerManager(
      (data) => handleGameRenderResult(data),
      (peerId, status) => handlePeerConnected(peerId, status),
      (peerId) => handlePeerDisconnected(peerId)
    )
    
    // Set up peer ID callback
    pm.setPeerIdCallback((id) => {
      setMyPeerId(id)
      console.log('My Peer ID:', id)
    })
    
    setGameGPUManager(gpm)
    setPeerManager(pm)
    
    // Initialize sample game scene
    initializeGameScene()
  }, [])

  const initializeGameScene = () => {
    const sampleObjects = [
      {
        id: 'cube1',
        position: { x: -100, y: 0, z: 0 },
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
      },
      {
        id: 'triangle1',
        position: { x: 0, y: 100, z: 0 },
        size: { width: 70, height: 70 },
        color: { r: 0.3, g: 0.3, b: 1.0 },
        type: 'triangle'
      }
    ]    
    setGameScene(prev => ({
      ...prev,
      objects: sampleObjects
    }))
  }

  const handlePeerConnected = (peerId, status) => {
    console.log('Peer connected:', peerId, status)
    
    // Check if peer already exists in the list
    setConnectedPeers(prev => {
      const existingPeer = prev.find(p => p.id === peerId)
      if (existingPeer) {
        // Update existing peer status
        return prev.map(p => 
          p.id === peerId ? { ...p, status: 'connected' } : p
        )
      } else {
        // Add new peer
        return [...prev, {
          id: peerId,
          status: 'connected',
          gpuLoad: 0,
          latency: 0,
          framesRendered: 0
        }]
      }
    })
    
    // Update network connection status
    setIsConnectedToNetwork(true)
    
    // Add peer to game GPU manager if it exists
    if (gameGPUManager && peerManager) {
      const conn = peerManager.connections.get(peerId)
      if (conn) {
        gameGPUManager.addPeer(peerId, conn, {
          gpuScore: 0.8,
          vram: '8GB',
          architecture: 'CUDA'
        })
      }
    }
  }

  const handlePeerDisconnected = (peerId) => {
    console.log('Peer disconnected:', peerId)
    
    // Remove peer from connected list and update network status
    setConnectedPeers(prev => {
      const filtered = prev.filter(peer => peer.id !== peerId)
      if (filtered.length === 0) {
        setIsConnectedToNetwork(false)
      }
      return filtered
    })
    
    // Remove from game GPU manager
    if (gameGPUManager) {
      gameGPUManager.removePeer(peerId)
    }
  }
  const connectGamePeer = () => {
    if (!peerInputValue.trim()) {
      alert('Please enter a valid Peer ID')
      return
    }

    if (peerInputValue === myPeerId) {
      alert('Cannot connect to your own Peer ID')
      return
    }

    if (peerManager) {
      // Check if already connected
      if (peerManager.isConnectedToPeer(peerInputValue)) {
        alert('Already connected to this peer')
        return
      }

      console.log('Attempting to connect to peer:', peerInputValue)
      
      // Add peer to UI as "connecting" status
      setConnectedPeers(prev => {
        const existingPeer = prev.find(p => p.id === peerInputValue)
        if (!existingPeer) {
          return [...prev, {
            id: peerInputValue,
            status: 'connecting',
            gpuLoad: 0,
            latency: 0,
            framesRendered: 0
          }]
        }
        return prev
      })

      peerManager.connectToPeer(peerInputValue)
      setPeerInputValue('') // Clear input
    }
  }

  const copyPeerIdToClipboard = () => {
    navigator.clipboard.writeText(myPeerId).then(() => {
      alert('Peer ID copied to clipboard!')
    }).catch(err => {
      console.error('Failed to copy Peer ID:', err)
    })
  }

  const startDistributedGame = async () => {
    if (!gameGPUManager || connectedPeers.length === 0) {
      alert('No GPU peers connected! Connect to at least one peer first.')
      return
    }

    setIsGameRunning(true)
    setRenderStats(prev => ({ ...prev, totalFrames: 0 }))
    
    // Start game render loop
    gameLoopRef.current = setInterval(async () => {
      await renderGameFrame()
    }, 1000 / 60) // Target 60 FPS
  }

  const stopDistributedGame = () => {
    setIsGameRunning(false)
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
      gameLoopRef.current = null
    }
  }

  const renderGameFrame = async () => {
    if (!gameGPUManager || !isGameRunning) return

    const frameStart = performance.now()
    
    try {
      const gameData = {
        scene: gameScene,
        camera: gameScene.camera,
        lighting: gameScene.lighting,
        objects: gameScene.objects,
        shaders: ['vertex_standard', 'fragment_pbr'],
        targetFPS: 60,
        resolution: { width: 800, height: 600 }
      }

      const renderResult = await gameGPUManager.offloadGameRendering(gameData)
      
      if (renderResult.combinedFrame) {
        setCurrentFrame(renderResult.combinedFrame)
        displayFrameOnCanvas(renderResult.combinedFrame)
      }
      
      const frameEnd = performance.now()
      const frameTime = frameEnd - frameStart
      
      setRenderStats(prev => ({
        fps: Math.round(1000 / frameTime),
        frameTime: Math.round(frameTime),
        peersUsed: renderResult.peersUsed,
        totalFrames: prev.totalFrames + 1
      }))
      
      // Animate objects for next frame
      animateGameObjects()
      
    } catch (error) {
      console.error('Distributed rendering failed:', error)
    }
  }

  const animateGameObjects = () => {
    setGameScene(prev => ({
      ...prev,
      objects: prev.objects.map(obj => ({
        ...obj,
        position: {
          ...obj.position,
          x: obj.position.x + Math.sin(Date.now() / 1000 + obj.id.length) * 2,
          y: obj.position.y + Math.cos(Date.now() / 1000 + obj.id.length) * 1
        }
      }))
    }))
  }

  const displayFrameOnCanvas = (frameData) => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      img.src = frameData
    }
  }

  const handleGameRenderResult = (data) => {
    if (data.result && data.result.frameData) {
      console.log('Received rendered frame from peer:', data.result)
      // Frame data will be processed by GameGPUManager
    }
  }
  const testSingleFrameRender = async () => {
    if (connectedPeers.length === 0) {
      alert('No peers connected for testing')
      return
    }

    const testPayload = {
      operation: 'render_frame',
      viewport: { x: 0, y: 0, width: 400, height: 300 },
      scene: gameScene,
      objects: gameScene.objects.slice(0, 2), // Test with 2 objects
      quality: renderQuality
    }

    // Send test render to first connected peer
    const peer = connectedPeers[0]
    if (peerManager && peerManager.isConnectedToPeer(peer.id)) {
      peerManager.sendJob({
        type: 'game_render',
        taskId: `test_${Date.now()}`,
        renderData: testPayload,
        jobId: `test_render_${Date.now()}`
      }, peer.id)
      
      console.log('Test render job sent to peer:', peer.id)
    } else {
      alert('Peer connection not available')
    }
  }

  return (
    <div className="game-gpu-interface">
      <div className="game-header">
        <h2>🎮 Distributed GPU Gaming</h2>
        <p>Leverage peer GPUs for enhanced gaming performance</p>
        
        {/* Connection Status Indicator */}
        <div className="connection-status-indicator">
          <div className={`status-dot ${isConnectedToNetwork ? 'connected' : 'disconnected'}`}></div>
          <span className="status-text">
            {isConnectedToNetwork ? 
              `Connected to ${connectedPeers.length} GPU peer${connectedPeers.length !== 1 ? 's' : ''}` : 
              'Not connected to GPU network'
            }
          </span>
        </div>
      </div>      <div className="game-controls">
        {/* Your Peer ID Section */}
        <div className="my-peer-section">
          <h3>📋 Your Peer ID</h3>
          <div className="peer-id-display">
            {myPeerId ? (
              <>
                <div className="peer-id-box">
                  <span className="peer-id-text">{myPeerId}</span>
                  <button 
                    className="copy-btn"
                    onClick={copyPeerIdToClipboard}
                    title="Copy Peer ID to clipboard"
                  >
                    📋 Copy
                  </button>
                </div>
                <p className="peer-id-instructions">
                  Share this ID with others so they can connect to your GPU
                </p>
              </>
            ) : (
              <div className="peer-id-loading">
                <span>🔄 Generating Peer ID...</span>
              </div>
            )}
          </div>
        </div>

        <div className="connection-section">
          <h3>🔗 Connect to GPU Peers</h3>
          
          {/* Step-by-step instructions */}
          <div className="connection-instructions">
            <div className="instruction-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span className="step-text">Share your Peer ID above with someone else running this app</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span className="step-text">Ask them to share their Peer ID with you</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span className="step-text">Enter their Peer ID below and click Connect</span>
              </div>
              <div className="step">
                <span className="step-number">4</span>
                <span className="step-text">Once connected, you can start distributed gaming!</span>
              </div>
            </div>
          </div>

          <div className="peer-input">
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Enter friend's Peer ID (e.g., abc123-def456-ghi789)"
                value={peerInputValue}
                onChange={(e) => setPeerInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    connectGamePeer()
                  }
                }}
                className="peer-input-field"
              />
              <button 
                onClick={connectGamePeer}
                disabled={!peerInputValue.trim()}
                className="connect-btn"
              >
                🔗 Connect
              </button>
            </div>
            <button 
              onClick={testSingleFrameRender}
              disabled={connectedPeers.length === 0}
              className="test-render-btn"
            >
              🧪 Test Render
            </button>
          </div>
            <div className="connected-peers">
            <h4>
              Connected GPU Peers ({connectedPeers.length})
              <div className={`network-status ${isConnectedToNetwork ? 'online' : 'offline'}`}>
                {isConnectedToNetwork ? '🟢 ONLINE' : '🔴 OFFLINE'}
              </div>
            </h4>
            {connectedPeers.length === 0 ? (
              <div className="no-peers-message">
                <p>No GPU peers connected</p>
                <p>Enter a Peer ID above to connect to the GPU network</p>
              </div>
            ) : (
              connectedPeers.map(peer => (
                <div key={peer.id} className={`peer-card ${peer.status}`}>
                  <div className="peer-info">
                    <span className="peer-id">{peer.id.substring(0, 8)}...</span>
                    <div className={`connection-indicator ${peer.status}`}>
                      {peer.status === 'connected' ? '🟢' : peer.status === 'error' ? '🔴' : '🟡'}
                    </div>
                  </div>
                  <span className="peer-status">{peer.status.toUpperCase()}</span>                  <span className="peer-load">Load: {peer.gpuLoad}%</span>
                  <span className="peer-latency">{peer.latency}ms</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="game-settings">
          <h3>Game Settings</h3>
          <div className="setting-row">
            <label>
              <input 
                type="checkbox" 
                checked={loadBalancingEnabled}
                onChange={(e) => setLoadBalancingEnabled(e.target.checked)}
              />
              Enable Load Balancing
            </label>
          </div>
          <div className="setting-row">
            <label>Render Quality:</label>
            <select 
              value={renderQuality} 
              onChange={(e) => setRenderQuality(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="ultra">Ultra</option>
            </select>
          </div>
        </div>

        <div className="game-actions">
          <button 
            onClick={startDistributedGame}
            disabled={isGameRunning || connectedPeers.length === 0}
            className="start-game-btn"
          >
            🚀 Start Distributed Game
          </button>
          <button 
            onClick={stopDistributedGame}
            disabled={!isGameRunning}
            className="stop-game-btn"
          >
            ⏹️ Stop Game
          </button>
        </div>
      </div>
      
      <div className="game-display">
        {/* Network Status Panel */}
        <div className="network-status-panel">
          <h3>🌐 Network Status</h3>
          <div className="network-stats">
            <div className="network-stat-item">
              <div className={`status-indicator ${isConnectedToNetwork ? 'online' : 'offline'}`}>
                {isConnectedToNetwork ? '🟢' : '🔴'}
              </div>
              <div className="stat-info">
                <span className="stat-label">GPU Network</span>
                <span className="stat-value">
                  {isConnectedToNetwork ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </div>
            </div>
            
            <div className="network-stat-item">
              <div className="status-indicator">⚡</div>
              <div className="stat-info">
                <span className="stat-label">Active Peers</span>
                <span className="stat-value">{connectedPeers.filter(p => p.status === 'connected').length}</span>
              </div>
            </div>
            
            <div className="network-stat-item">
              <div className="status-indicator">🎮</div>
              <div className="stat-info">
                <span className="stat-label">Game Status</span>
                <span className="stat-value">{isGameRunning ? 'RUNNING' : 'STOPPED'}</span>
              </div>
            </div>
            
            <div className="network-stat-item">
              <div className="status-indicator">📊</div>
              <div className="stat-info">
                <span className="stat-label">Load Balance</span>
                <span className="stat-value">{loadBalancingEnabled ? 'ENABLED' : 'DISABLED'}</span>
              </div>
            </div>
          </div>
        </div>        <div className="display-grid">
          <div className="render-canvas-container">
            <h3>Game Render Output</h3>
            <canvas 
              ref={canvasRef}
              width={800}
              height={600}
              className="game-canvas"
            />
            {!currentFrame && (
              <div className="no-frame-message">
                Connect to GPU peers and start the game to see distributed rendering
              </div>
            )}          </div>

          <div className="render-stats">
            <h3>Performance Stats</h3>
            <div className="stat-grid">
              <div className="stat-item">
                <span className="stat-label">FPS:</span>
                <span className="stat-value">{renderStats.fps}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Frame Time:</span>
                <span className="stat-value">{renderStats.frameTime}ms</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">GPU Peers Used:</span>
                <span className="stat-value">{renderStats.peersUsed}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Frames:</span>
                <span className="stat-value">{renderStats.totalFrames}</span>
              </div>
            </div>
          </div>
        </div>

      <div className="scene-debug">
        <h3>Scene Objects ({gameScene.objects.length})</h3>
        <div className="objects-list">
          {gameScene.objects.map(obj => (
            <div key={obj.id} className="object-item">
              <span className="object-type">{obj.type}</span>
              <span className="object-pos">
                ({Math.round(obj.position.x)}, {Math.round(obj.position.y)})
              </span>
              <div 
                className="object-color"                style={{
                  backgroundColor: `rgb(${obj.color.r * 255}, ${obj.color.g * 255}, ${obj.color.b * 255})`
                }}
              ></div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}

export default GameGPUInterface
