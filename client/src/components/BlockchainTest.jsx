import React, { useState, useEffect } from 'react';
import blockchainService from '../utils/blockchain-hackathon';
import './BlockchainTest.css';

const BlockchainTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('Not connected');
  const [account, setAccount] = useState('');
  const [network, setNetwork] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [workerInfo, setWorkerInfo] = useState(null);
  const [peerId, setPeerId] = useState(`12D3KooWDemo${Math.random().toString(36).substr(2, 8)}`);
  const [taskHash, setTaskHash] = useState(`QmDemo${Math.random().toString(36).substr(2, 8)}`);
  const [reward, setReward] = useState('0.1');
  const [deadline, setDeadline] = useState('24');  const [availableTasks, setAvailableTasks] = useState([]);
  const [myCreatedTasks, setMyCreatedTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [showTaskOutput, setShowTaskOutput] = useState(false);
  const [gpuProcessing, setGpuProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [status, setStatus] = useState('Ready to connect...');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = () => {
    const status = blockchainService.getConnectionStatus();
    updateConnectionState(status);
  };
  const updateConnectionState = (status) => {
    setConnectionStatus(status.connected ? 'Connected' : 'Not connected');
    setAccount(status.account || '');
    setNetwork(status.network);
    setIsDemo(status.isDemo || false);
    
    if (status.connected) {
      loadWorkerInfo();
      loadAvailableTasks();
      loadMyCreatedTasks();
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setStatus('Connecting to blockchain...');
      
      const result = await blockchainService.connectWallet();
      
      if (result.success) {
        updateConnectionState(blockchainService.getConnectionStatus());
        setStatus(`✅ Connected via ${result.method}${result.isDemo ? ' (Demo Mode)' : ''}`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      setStatus(`❌ Connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  const loadWorkerInfo = async () => {
    try {
      const info = await blockchainService.getWorkerInfo();
      setWorkerInfo(info);
      console.log('✅ Worker info loaded:', info);
    } catch (error) {
      console.error('Error loading worker info:', error);
      // Set default worker info on error
      setWorkerInfo({
        isRegistered: false,
        peerId: "",
        reputation: "0",
        pendingRewards: "0",
        completedTasks: "0"
      });
    }
  };

  const loadAvailableTasks = async () => {
    try {
      const tasks = await blockchainService.getAvailableTasks(5);
      setAvailableTasks(tasks || []);
      console.log('✅ Available tasks loaded:', tasks);
    } catch (error) {
      console.error('Error loading available tasks:', error);
      // Set empty array on error
      setAvailableTasks([]);
    }
  };  const loadMyCreatedTasks = async () => {
    try {
      // Only load if we have a connection and account
      const connectionStatus = blockchainService.getConnectionStatus();
      if (!connectionStatus.connected || !connectionStatus.account) {
        console.log('⚠️ No connection or account, skipping created tasks load');
        setMyCreatedTasks([]);
        return;
      }
      
      console.log('🔄 Loading created tasks for account:', connectionStatus.account);
      const createdTasks = await blockchainService.getMyCreatedTasks();
      setMyCreatedTasks(createdTasks || []);
      console.log('✅ My created tasks loaded:', createdTasks);
    } catch (error) {
      console.error('Error loading created tasks:', error);
      setStatus(`⚠️ Failed to load created tasks: ${error.message}`);
      setMyCreatedTasks([]);
    }
  };

  const handleRegisterWorker = async () => {
    if (!peerId.trim()) {
      setStatus('Please enter a peer ID');
      return;
    }

    setLoading(true);
    try {
      setStatus('Registering as worker...');
      await blockchainService.registerWorker(peerId);
      setStatus('✅ Successfully registered as worker!');
      await loadWorkerInfo();
    } catch (error) {
      console.error('Worker registration error:', error);
      setStatus(`❌ Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskHash.trim() || !reward) {
      setStatus('Please enter task hash and reward amount');
      return;
    }    setLoading(true);
    try {
      setStatus('Creating compute task...');
      const result = await blockchainService.createTask(taskHash, parseInt(deadline), reward);
      setStatus(`✅ Task created successfully! Task ID: ${result.taskId}`);
      await loadAvailableTasks();
      await loadMyCreatedTasks(); // Refresh created tasks list
    } catch (error) {
      console.error('Task creation error:', error);
      setStatus(`❌ Task creation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    setLoading(true);
    try {
      setStatus('Claiming rewards...');
      await blockchainService.claimRewards();
      setStatus('✅ Rewards claimed successfully!');
      await loadWorkerInfo();
    } catch (error) {
      console.error('Claim rewards error:', error);
      setStatus(`❌ Claim failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    blockchainService.disconnect();
    setConnectionStatus('Not connected');
    setAccount('');
    setNetwork(null);
    setIsDemo(false);
    setWorkerInfo(null);
    setAvailableTasks([]);
    setStatus('Disconnected');
  };

  const handleViewTask = async (taskId) => {
    try {
      setLoading(true);
      setStatus(`Loading task ${taskId} details...`);
      
      // Get task details from blockchain
      const details = await blockchainService.getTaskDetails(taskId);
      setTaskDetails(details);
      setSelectedTask(taskId);
      setStatus(`✅ Task ${taskId} details loaded`);
    } catch (error) {
      console.error('Error viewing task:', error);
      setStatus(`❌ Failed to load task details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  const handleAcceptTask = async (taskId) => {
    try {
      setLoading(true);
      
      // First check if user can accept this task
      const details = await blockchainService.getTaskDetails(taskId);
      
      if (details.isCreator) {
        setStatus(`❌ You cannot accept your own task!`);
        return;
      }
      
      if (!details.canAccept) {
        setStatus(`❌ This task cannot be accepted (already completed or you're the creator)`);
        return;
      }
      
      setStatus(`Accepting task ${taskId}...`);
      
      await blockchainService.acceptTask(taskId);
      setStatus(`✅ Task ${taskId} accepted! Starting GPU processing...`);
      
      // Start P2P GPU processing
      await startGpuProcessing(taskId);
      
    } catch (error) {
      console.error('Error accepting task:', error);
      setStatus(`❌ Failed to accept task: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startGpuProcessing = async (taskId) => {
    try {
      setGpuProcessing(true);
      setProcessingProgress(0);
      setStatus(`🔄 Starting GPU processing for task ${taskId}...`);

      // Connect to P2P network for GPU processing
      const processingResult = await processTaskWithP2P(taskId);
      
      if (processingResult.success) {
        setStatus(`✅ GPU processing completed! Submitting results...`);
        await submitTaskResult(taskId, processingResult.output);
      } else {
        throw new Error(processingResult.error);
      }
      
    } catch (error) {
      console.error('GPU processing error:', error);
      setStatus(`❌ GPU processing failed: ${error.message}`);
    } finally {
      setGpuProcessing(false);
      setProcessingProgress(0);
    }
  };

  const processTaskWithP2P = async (taskId) => {
    return new Promise((resolve) => {
      // Simulate P2P GPU processing with progress updates
      const steps = [
        { progress: 10, message: "Connecting to P2P network..." },
        { progress: 25, message: "Downloading task data..." },
        { progress: 40, message: "Initializing GPU kernels..." },
        { progress: 60, message: "Processing compute task..." },
        { progress: 80, message: "Optimizing results..." },
        { progress: 95, message: "Preparing output..." },
        { progress: 100, message: "Processing complete!" }
      ];

      let currentStep = 0;
      const interval = setInterval(() => {
        if (currentStep < steps.length) {
          const step = steps[currentStep];
          setProcessingProgress(step.progress);
          setStatus(`🔄 ${step.message} (${step.progress}%)`);
          currentStep++;
        } else {
          clearInterval(interval);
          resolve({
            success: true,
            output: `GPU_RESULT_${taskId}_${Date.now()}`,
            computeTime: Math.random() * 1000 + 500 // Simulate compute time
          });
        }
      }, 1000);
    });
  };

  const submitTaskResult = async (taskId, result) => {
    try {
      setStatus(`📤 Submitting task ${taskId} results...`);
      
      // Submit to blockchain
      await blockchainService.submitTaskResult(taskId, result);
        // Update local state
      await loadWorkerInfo();
      await loadAvailableTasks();
      await loadMyCreatedTasks(); // Refresh created tasks to show completion
      
      setStatus(`🎉 Task ${taskId} completed and submitted! Rewards pending...`);
      setSelectedTask(null);
      setTaskDetails(null);
      
    } catch (error) {
      console.error('Error submitting task result:', error);
      setStatus(`❌ Failed to submit results: ${error.message}`);
    }
  };

  const closeTaskDetails = () => {
    setSelectedTask(null);
    setTaskDetails(null);
    setShowTaskOutput(false);
    setStatus('Task details closed');
  };

  const handleViewTaskOutput = (task) => {
    setSelectedTask(task.taskId);
    setTaskDetails({
      ...task,
      taskHash: task.taskHash,
      reward: task.reward,
      deadline: '24',
      status: task.status,
      creator: account, // Current user is the creator
      worker: task.worker,
      output: task.output,
      completedAt: task.completedAt,
      isCreator: true,
      canAccept: false
    });
    setShowTaskOutput(true);
    setStatus(`Viewing output for task ${task.taskId}`);
  };

  return (
    <div className="blockchain-test">
      <h2>🔗 Blockchain Integration Test</h2>
      
      <div className="status-section">
        <h3>Connection Status</h3>
        <div className={`status ${connectionStatus === 'Connected' ? 'connected' : 'disconnected'}`}>
          {connectionStatus}
          {isDemo && <span className="demo-badge">DEMO MODE</span>}
        </div>
        
        {account && (
          <div className="account-info">
            <p><strong>Account:</strong> {account}</p>
            {network && (
              <p><strong>Network:</strong> {network.name} (Chain ID: {network.chainId})</p>
            )}
          </div>
        )}
        
        <div className="status-message">{status}</div>
        
        <div className="connection-controls">
          {!account ? (
            <button onClick={connectWallet} disabled={loading}>
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <button onClick={disconnect} className="disconnect-btn">
              Disconnect
            </button>
          )}
        </div>
      </div>

      {account && (
        <>
          <div className="worker-section">
            <h3>👷 Worker Registration</h3>
            <div className="worker-info">
              {workerInfo ? (
                <div>
                  <p><strong>Registered:</strong> {workerInfo.isRegistered ? '✅ Yes' : '❌ No'}</p>
                  {workerInfo.isRegistered && (
                    <>
                      <p><strong>Peer ID:</strong> {workerInfo.peerId}</p>
                      <p><strong>Reputation:</strong> {workerInfo.reputation}/100</p>
                      <p><strong>Completed Tasks:</strong> {workerInfo.completedTasks}</p>
                      <p><strong>Pending Rewards:</strong> {workerInfo.pendingRewards} ETH</p>
                    </>
                  )}
                </div>
              ) : (
                <p>Loading worker info...</p>
              )}
            </div>
            
            {!workerInfo?.isRegistered && (
              <div className="register-form">
                <input
                  type="text"
                  placeholder="Enter Peer ID"
                  value={peerId}
                  onChange={(e) => setPeerId(e.target.value)}
                  disabled={loading}
                />
                <button onClick={handleRegisterWorker} disabled={loading}>
                  {loading ? 'Registering...' : 'Register as Worker'}
                </button>
              </div>
            )}

            {workerInfo?.isRegistered && parseFloat(workerInfo.pendingRewards) > 0 && (
              <div className="rewards-section">
                <button onClick={handleClaimRewards} disabled={loading} className="claim-btn">
                  {loading ? 'Claiming...' : `Claim ${workerInfo.pendingRewards} ETH`}
                </button>
              </div>
            )}
          </div>

          <div className="task-section">
            <h3>📋 Create Compute Task</h3>
            <div className="task-form">
              <input
                type="text"
                placeholder="Task Hash (e.g., QmX...)"
                value={taskHash}
                onChange={(e) => setTaskHash(e.target.value)}
                disabled={loading}
              />
              <input
                type="number"
                placeholder="Reward Amount (ETH)"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                step="0.001"
                min="0.001"
                disabled={loading}
              />
              <input
                type="number"
                placeholder="Deadline (hours)"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min="1"
                disabled={loading}
              />
              <button onClick={handleCreateTask} disabled={loading}>
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>

          <div className="tasks-section">
            <h3>📋 Available Tasks</h3>            <div className="tasks-list">
              {availableTasks.length > 0 ? (
                <ul>
                  {availableTasks.map((taskId, index) => (
                    <li key={index}>
                      <span><strong>Task ID:</strong> {taskId}</span>
                      <div className="task-buttons">
                        <button 
                          onClick={() => handleViewTask(taskId)}
                          className="task-btn"
                          disabled={loading}
                        >
                          {loading && selectedTask === taskId ? 'Loading...' : 'View Details'}
                        </button>
                        <button 
                          onClick={() => handleAcceptTask(taskId)}
                          className="task-btn accept-btn"
                          disabled={loading || gpuProcessing}
                        >
                          Accept Task
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No available tasks</p>
              )}
              <button onClick={loadAvailableTasks} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh Tasks'}
              </button>            </div>
          </div>

          <div className="tasks-section">
            <h3>📋 My Created Tasks</h3>
            <div className="tasks-list">
              {myCreatedTasks.length > 0 ? (
                <ul>
                  {myCreatedTasks.map((task, index) => (
                    <li key={index}>
                      <div className="task-info">
                        <span><strong>Task ID:</strong> {task.taskId}</span>
                        <span><strong>Reward:</strong> {task.reward} ETH</span>
                        <span><strong>Status:</strong> 
                          <span className={`status-badge ${task.status.toLowerCase()}`}>
                            {task.status}
                          </span>
                        </span>
                        {task.worker && (
                          <span><strong>Worker:</strong> {task.worker.substring(0, 10)}...</span>
                        )}
                      </div>
                      <div className="task-buttons">
                        {task.status === 'Completed' && task.output ? (
                          <button 
                            onClick={() => handleViewTaskOutput(task)}
                            className="task-btn output-btn"
                            disabled={loading}
                          >
                            📊 View Output
                          </button>
                        ) : (
                          <span className="pending-text">⏳ Waiting for completion</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No created tasks yet</p>
              )}
              <button onClick={loadMyCreatedTasks} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh My Tasks'}
              </button>
            </div>
          </div>

          <div className="demo-section">
            <h3>🎯 Hackathon Demo Features</h3>
            <div className="demo-features">
              <div className="feature">
                <h4>✅ Smart Contract Deployed</h4>
                <p>Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3</p>
              </div>
              <div className="feature">
                <h4>✅ Worker Registration</h4>
                <p>P2P integration with Peer.js IDs</p>
              </div>
              <div className="feature">
                <h4>✅ Task Management</h4>
                <p>Create, assign, and complete GPU compute tasks</p>
              </div>
              <div className="feature">
                <h4>✅ Reward System</h4>
                <p>Automatic ETH rewards for completed work</p>
              </div>
              <div className="feature">
                <h4>✅ Reputation System</h4>
                <p>Merit-based worker scoring</p>
              </div>
            </div>
          </div>

          {/* Task Details Modal */}
          {selectedTask && taskDetails && (
            <div className="task-modal">
              <div className="task-modal-content">
                <div className="task-modal-header">
                  <h3>📋 Task Details - {selectedTask}</h3>
                  <button onClick={closeTaskDetails} className="close-btn">✕</button>
                </div>                <div className="task-modal-body">
                  <div className="task-detail-item">
                    <strong>Task Hash:</strong> {taskDetails.taskHash || 'N/A'}
                  </div>
                  <div className="task-detail-item">
                    <strong>Reward:</strong> {taskDetails.reward || '0'} ETH
                  </div>
                  <div className="task-detail-item">
                    <strong>Deadline:</strong> {taskDetails.deadline || 'N/A'} hours
                  </div>
                  <div className="task-detail-item">
                    <strong>Status:</strong> {taskDetails.status || 'Available'}
                  </div>
                  <div className="task-detail-item">
                    <strong>Creator:</strong> {taskDetails.creator || 'Unknown'}
                  </div>
                  
                  {/* Show worker info if task is completed */}
                  {taskDetails.worker && (
                    <div className="task-detail-item">
                      <strong>Worker:</strong> {taskDetails.worker}
                    </div>
                  )}
                  
                  {/* Show completion time if task is completed */}
                  {taskDetails.completedAt && (
                    <div className="task-detail-item">
                      <strong>Completed At:</strong> {new Date(taskDetails.completedAt).toLocaleString()}
                    </div>
                  )}
                  
                  {/* Show output if user is creator and task is completed */}
                  {showTaskOutput && taskDetails.output && taskDetails.isCreator && (
                    <div className="task-output">
                      <h4>🔍 Task Output</h4>
                      <div className="output-content">
                        <div className="output-hash">
                          <strong>Output Hash:</strong> {taskDetails.output}
                        </div>
                        <div className="output-details">
                          <p>✅ GPU processing completed successfully</p>
                          <p>📊 Result hash: {taskDetails.output}</p>
                          <p>⏱️ Processing completed at: {new Date(taskDetails.completedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="task-actions">
                    {/* Show accept button only if user can accept */}
                    {taskDetails.canAccept && !taskDetails.isCreator && (
                      <button 
                        onClick={() => handleAcceptTask(selectedTask)}
                        className="accept-btn"
                        disabled={loading || gpuProcessing}
                      >
                        {gpuProcessing ? 'Processing...' : 'Accept & Start Processing'}
                      </button>
                    )}
                    
                    {/* Show message if user is creator */}
                    {taskDetails.isCreator && !showTaskOutput && (
                      <div className="creator-message">
                        <p>📝 You are the creator of this task</p>
                        {taskDetails.status === 'Available' && (
                          <p>⏳ Waiting for a worker to accept this task</p>
                        )}
                      </div>
                    )}
                    
                    {/* Show message if task cannot be accepted */}
                    {!taskDetails.canAccept && !taskDetails.isCreator && (
                      <div className="unavailable-message">
                        <p>❌ This task is not available for acceptance</p>
                        {taskDetails.status === 'Completed' && (
                          <p>✅ Task has already been completed</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GPU Processing Status */}
          {gpuProcessing && (
            <div className="gpu-processing">
              <div className="processing-header">
                <h3>🖥️ P2P GPU Processing</h3>
              </div>
              <div className="processing-content">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <p className="progress-text">{processingProgress}% Complete</p>
                <div className="p2p-status">
                  <div className="p2p-item">
                    <span className="p2p-icon">🌐</span>
                    <span>Connected to P2P network</span>
                  </div>
                  <div className="p2p-item">
                    <span className="p2p-icon">⚡</span>
                    <span>GPU acceleration active</span>
                  </div>
                  <div className="p2p-item">
                    <span className="p2p-icon">🔄</span>
                    <span>Processing task on distributed GPUs</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BlockchainTest;
