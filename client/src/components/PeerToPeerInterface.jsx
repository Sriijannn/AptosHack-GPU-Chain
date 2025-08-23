import React, { useState, useEffect, useRef } from 'react';
import { FaCircle, FaSignOutAlt, FaUser, FaServer, FaExchangeAlt, FaMicrochip, FaChartLine } from 'react-icons/fa';
import PeerManager from '../PeerManager';
import './PeerToPeerInterface.css';

// GPU-intensive task types
const GPU_TASKS = {
  MATRIX_MULTIPLICATION: 'matrix_multiplication',
  IMAGE_PROCESSING: 'image_processing',
  NEURAL_NETWORK: 'neural_network',
  CRYPTO_MINING: 'crypto_mining',
  MONTE_CARLO: 'monte_carlo'
};

// Peer-to-Peer Interface Component
function PeerToPeerInterface({ userEmail, onLogout, onGoToBlockchain, onGoToGameGPU }) {
  const [peerId, setPeerId] = useState('')
  const [connId, setConnId] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [peerManager, setPeerManager] = useState(null)
  const [notif, setNotif] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [tab, setTab] = useState(0);
  const [selectedTask, setSelectedTask] = useState(GPU_TASKS.MATRIX_MULTIPLICATION);
  const [taskIntensity, setTaskIntensity] = useState(50);
  const [gpuLoad, setGpuLoad] = useState(0);
  const [gpuTemp, setGpuTemp] = useState(45);
  const [isRunningTask, setIsRunningTask] = useState(false);
  const [taskProgress, setTaskProgress] = useState(0);
  const cardRef = useRef(null);  useEffect(() => {
    const pm = new PeerManager((data) => {
      console.log('Received job result:', data)
      if (data.result !== null && data.result !== undefined) {
        // Format the result message based on result type
        let resultMessage = `✅ Job Result: `;
        if (typeof data.result === 'object' && data.result.result) {
          // Handle detailed GPU task results
          resultMessage += `${data.result.result}`;
          if (data.result.time) resultMessage += ` (Time: ${data.result.time}s)`;
          if (data.result.device) resultMessage += ` [${data.result.device.toUpperCase()}]`;
          if (data.result.statistics) {
            resultMessage += `\n📊 Stats - Sum: ${data.result.statistics.sum}, Mean: ${data.result.statistics.mean}, Max: ${data.result.statistics.max}, Min: ${data.result.statistics.min}`;
          }
          if (data.result.sample_result) {
            resultMessage += `\n🧮 Sample Matrix:`;
            data.result.sample_result.slice(0, 3).forEach((row, i) => {
              const formattedRow = row.slice(0, 3).map(val => val.toFixed(2)).join(', ');
              resultMessage += `\n   Row ${i + 1}: [${formattedRow}]`;
            });
          }
        } else {
          resultMessage += `${data.result}`;
        }
        resultMessage += ` (ID: ${data.jobId})`;
        setMessages(msgs => [...msgs, resultMessage])
      } else {
        setMessages(msgs => [...msgs, `❌ Job Failed: No result received (ID: ${data.jobId})`])
      }
    })
    pm.onPeerId = setPeerId
    setPeerManager(pm)
    // Listen for connection events
    pm.peer.on('connection', conn => {
      setIsConnected(true)
      conn.on('close', () => setIsConnected(false))
      conn.on('error', () => setIsConnected(false))
      conn.on('data', data => {
        console.log('Received peer data:', data)
        // Show plain messages as well as job results
        if (typeof data === 'string') {
          setMessages(msgs => [...msgs, `💬 Peer: ${data}`])        } else if (data.result !== undefined) {
          if (data.result !== null) {
            // Format detailed result display
            let resultMessage = `✅ Result: `;
            if (typeof data.result === 'object' && data.result.result) {
              resultMessage += `${data.result.result}`;
              if (data.result.time) resultMessage += ` (${data.result.time}s)`;
              if (data.result.device) resultMessage += ` [${data.result.device.toUpperCase()}]`;
            } else {
              resultMessage += `${data.result}`;
            }
            resultMessage += ` (ID: ${data.jobId || 'unknown'})`;
            setMessages(msgs => [...msgs, resultMessage])
          } else {
            setMessages(msgs => [...msgs, `❌ Job Failed: Result was null (ID: ${data.jobId || 'unknown'})`])
          }} else {          setMessages(msgs => [...msgs, `📦 Data: ${JSON.stringify(data)}`])
        }
      })
    })
    return () => pm.peer.destroy()
  }, [])

  // Card tilt effect
  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * 8;
    const rotateY = ((x - centerX) / centerX) * -8;
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
  };
  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (card) card.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
  };

  const connectToPeer = () => {
    if (!connId || !peerManager) return
    peerManager.connectToPeer(connId)
    if (peerManager.conn) {
      peerManager.conn.on('open', () => setIsConnected(true))
      peerManager.conn.on('close', () => setIsConnected(false))
      peerManager.conn.on('error', () => setIsConnected(false))
      peerManager.conn.on('data', data => {
        if (typeof data === 'string') {
          setMessages(msgs => [...msgs, `Peer: ${data}`])        } else if (data.result !== undefined) {
          // Format detailed result display
          let resultMessage = `Received result: `;
          if (typeof data.result === 'object' && data.result.result) {
            resultMessage += `${data.result.result}`;
            if (data.result.time) resultMessage += ` (${data.result.time}s)`;
          } else {
            resultMessage += `${data.result}`;
          }
          resultMessage += ` (jobId: ${data.jobId})`;
          setMessages(msgs => [...msgs, resultMessage])
        }
      })
    }
  }

  const sendMessage = () => {
    if (peerManager && input) {
      peerManager.conn && peerManager.conn.send(input)
      setMessages((msgs) => [...msgs, `You: ${input}`])
      setInput('')
    }
  }
  const sendJob = (taskType = selectedTask) => {
    if (peerManager && peerManager.conn) {
      setIsRunningTask(true);
      setTaskProgress(0);
      
      const job = {
        type: 'gpu_intensive',
        taskType: taskType,
        intensity: taskIntensity,
        payload: generateTaskPayload(taskType, taskIntensity),
        jobId: Math.random().toString(36).substr(2, 9)
      };
      
      peerManager.conn.send({ job });
      setMessages((msgs) => [...msgs, `You sent GPU task: ${taskType} (Intensity: ${taskIntensity}%)`]);
      
      // Simulate task progress and GPU load
      simulateGPUTask();
    }
  }

  const generateTaskPayload = (taskType, intensity) => {
    const baseSize = Math.floor(intensity * 10); // Scale with intensity
    
    switch (taskType) {
      case GPU_TASKS.MATRIX_MULTIPLICATION:
        return {
          operation: 'matrix_mult',
          matrixSize: baseSize + 100,
          iterations: intensity * 2
        };
      case GPU_TASKS.IMAGE_PROCESSING:
        return {
          operation: 'image_filter',
          imageSize: baseSize + 512,
          filterType: 'gaussian_blur',
          iterations: intensity
        };
      case GPU_TASKS.NEURAL_NETWORK:
        return {
          operation: 'neural_train',
          batchSize: baseSize + 32,
          epochs: Math.floor(intensity / 10) + 1,
          layers: [128, 64, 32]
        };
      case GPU_TASKS.CRYPTO_MINING:
        return {
          operation: 'crypto_hash',
          difficulty: Math.floor(intensity / 20) + 1,
          iterations: intensity * 1000
        };
      case GPU_TASKS.MONTE_CARLO:
        return {
          operation: 'monte_carlo',
          simulations: intensity * 10000,
          precision: 'float32'
        };
      default:
        return { operation: 'sum', numbers: Array.from({length: baseSize}, (_, i) => i + 1) };
    }
  }

  const simulateGPUTask = () => {
    let progress = 0;
    const totalDuration = 3000 + (taskIntensity * 50); // 3-8 seconds based on intensity
    const updateInterval = 100;
    const progressIncrement = (updateInterval / totalDuration) * 100;
    
    const progressInterval = setInterval(() => {
      progress += progressIncrement;
      setTaskProgress(Math.min(progress, 100));
      
      // Simulate GPU load based on task intensity
      const loadVariation = Math.random() * 20 - 10; // ±10% variation
      const currentLoad = Math.min(100, Math.max(0, taskIntensity + loadVariation));
      setGpuLoad(currentLoad);
      
      // Simulate GPU temperature increase
      const tempIncrease = (currentLoad / 100) * 30; // Up to 30°C increase
      setGpuTemp(45 + tempIncrease + Math.random() * 5);
      
      if (progress >= 100) {
        clearInterval(progressInterval);
        setIsRunningTask(false);
        setTaskProgress(0);
        setGpuLoad(Math.max(0, Math.random() * 10)); // Idle load
        setGpuTemp(45 + Math.random() * 5); // Idle temp
        setMessages((msgs) => [...msgs, `✅ GPU task completed successfully!`]);
      }
    }, updateInterval);
  }

  useEffect(() => {
    const glow = document.createElement('div');
    glow.className = 'glow-cursor';
    document.body.appendChild(glow);
    const move = e => {
      glow.style.left = `${e.clientX - 30}px`;
      glow.style.top = `${e.clientY - 30}px`;
    };
    window.addEventListener('mousemove', move);
    return () => {
      window.removeEventListener('mousemove', move);
      document.body.removeChild(glow);
    };
  }, []);

  return (
    <div className="p2pContainer fadeIn">
      <div
        className="p2pCard animatedCard"
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="p2pHeader">
          <div className="userInfo">
            <FaUser color="#22E06B" />
            <span>{userEmail}</span>
            <FaCircle color={isConnected ? 'green' : 'gray'} size={12} title={isConnected ? 'Connected' : 'Disconnected'} />
          </div>
          <div className="peerIdBox" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="peerIdLabel"> Wallet ID:</span>
            <span className="peerIdValue" style={{ userSelect: 'all', background: '#232d23', borderRadius: 4, padding: '2px 8px', fontFamily: 'monospace' }}>{peerId || '...'}</span>
            {peerId && (
              <button
                className="copyBtn"
                style={{ marginLeft: 4, background: 'none', border: 'none', color: '#22E06B', cursor: 'pointer', fontSize: 16, padding: 2 }}
                title="Copy Peer ID"
                onClick={() => { navigator.clipboard.writeText(peerId); }}
              >
                📋
              </button>
            )}
          </div>
          <button className="logoutBtn ripple" onClick={onLogout}>
            <FaSignOutAlt style={{ marginRight: 6 }} /> Logout
          </button>
        </div>
        <div className="tabContainer">
          <button className={`tab ${tab === 0 ? "tabActive" : ""}`} onClick={() => setTab(0)} type="button">Peer Chat</button>
          <button className={`tab ${tab === 1 ? "tabActive" : ""}`} onClick={() => setTab(1)} type="button">Send Job</button>
        </div>
        <div className="tabPanels">
          {tab === 0 && (
            <div className="tabPanel slideInLeft">
              <div style={{ marginBottom: 16 }}>
                <input
                  className="input"
                  placeholder="Peer ID to connect"
                  value={connId}
                  onChange={e => setConnId(e.target.value)}
                  style={{ marginRight: 8, width: 200 }}
                />
                <button className="authBtn ripple" onClick={connectToPeer}>Connect</button>
              </div>
              <div className="chatBox">
                {messages.map((msg, idx) => (
                  <div key={idx} className="chatMsg">{msg}</div>
                ))}
              </div>
              <div className="p2pMessageRow" style={{ display: 'flex', gap: 0, alignItems: 'stretch', marginTop: 8 }}>
                <input
                  className="input"
                  placeholder="Type a message..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, flex: 1, minWidth: 0 }}
                />
                <button
                  className="authBtn ripple"
                  onClick={sendMessage}
                  disabled={!isConnected || !input.trim()}
                  style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, marginLeft: -1, minWidth: 90, fontSize: 16, fontWeight: 700, boxShadow: 'none' }}
                >
                  Send
                </button>
              </div>
            </div>
          )}          {tab === 1 && (
            <div className="tabPanel slideInRight">
              <div className="gpu-task-controls">
                <div className="task-selector">
                  <label className="task-label">Select GPU Task:</label>
                  <select 
                    className="task-select"
                    value={selectedTask} 
                    onChange={(e) => setSelectedTask(e.target.value)}
                  >
                    <option value={GPU_TASKS.MATRIX_MULTIPLICATION}>Matrix Multiplication</option>
                    <option value={GPU_TASKS.IMAGE_PROCESSING}>Image Processing</option>
                    <option value={GPU_TASKS.NEURAL_NETWORK}>Neural Network Training</option>
                    <option value={GPU_TASKS.CRYPTO_MINING}>Crypto Mining</option>
                    <option value={GPU_TASKS.MONTE_CARLO}>Monte Carlo Simulation</option>
                  </select>
                </div>
                
                <div className="intensity-control">
                  <label className="task-label">Task Intensity: {taskIntensity}%</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={taskIntensity}
                    onChange={(e) => setTaskIntensity(Number(e.target.value))}
                    className="intensity-slider"
                  />
                </div>
                
                <button 
                  className={`gpu-task-btn ${isRunningTask ? 'running' : ''}`}
                  onClick={() => sendJob(selectedTask)}
                  disabled={isRunningTask || !isConnected}
                >
                  <FaMicrochip style={{ marginRight: 6 }} />
                  {isRunningTask ? 'Running GPU Task...' : 'Start GPU Task'}
                </button>
              </div>
              
              {(isRunningTask || gpuLoad > 0) && (
                <div className="gpu-monitor">
                  <div className="monitor-header">
                    <FaChartLine color="#22E06B" />
                    <span>GPU Monitoring</span>
                  </div>
                  
                  <div className="gpu-stats">
                    <div className="stat-item">
                      <span className="stat-label">GPU Load:</span>
                      <div className="stat-bar">
                        <div 
                          className="stat-fill gpu-load"
                          style={{ width: `${gpuLoad}%` }}
                        ></div>
                        <span className="stat-value">{Math.round(gpuLoad)}%</span>
                      </div>
                    </div>
                    
                    <div className="stat-item">
                      <span className="stat-label">GPU Temp:</span>
                      <div className="stat-bar">
                        <div 
                          className="stat-fill gpu-temp"
                          style={{ width: `${Math.min(100, (gpuTemp - 30) * 2)}%` }}
                        ></div>
                        <span className="stat-value">{Math.round(gpuTemp)}°C</span>
                      </div>
                    </div>
                    
                    {isRunningTask && (
                      <div className="stat-item">
                        <span className="stat-label">Progress:</span>
                        <div className="stat-bar">
                          <div 
                            className="stat-fill task-progress"
                            style={{ width: `${taskProgress}%` }}
                          ></div>
                          <span className="stat-value">{Math.round(taskProgress)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>        {notif && (
          <div className={`message ${notifType === 'success' ? 'messageSuccess bounceIn' : notifType === 'error' ? 'messageError shake' : ''}`}
            style={{ marginTop: 18 }}>
            {notif}
          </div>
        )}
        
        {/* Navigation Section */}
        <div className="navigation-section">
          <button className="nav-btn game-nav-btn" onClick={onGoToGameGPU}>
            🎮 Distributed Gaming
          </button>
          <button className="nav-btn blockchain-nav-btn" onClick={onGoToBlockchain}>
            🔗 Blockchain Test
          </button>
        </div>
      </div>
    </div>
  )
}

export default PeerToPeerInterface;
