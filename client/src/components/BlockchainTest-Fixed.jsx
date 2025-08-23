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
  const [deadline, setDeadline] = useState('24');
  const [availableTasks, setAvailableTasks] = useState([]);
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
    } catch (error) {
      console.error('Error loading worker info:', error);
    }
  };

  const loadAvailableTasks = async () => {
    try {
      const tasks = await blockchainService.getAvailableTasks(5);
      setAvailableTasks(tasks);
    } catch (error) {
      console.error('Error loading available tasks:', error);
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
    }

    setLoading(true);
    try {
      setStatus('Creating compute task...');
      const result = await blockchainService.createTask(taskHash, parseInt(deadline), reward);
      setStatus(`✅ Task created successfully! Task ID: ${result.taskId}`);
      await loadAvailableTasks();
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
            <h3>📋 Available Tasks</h3>
            <div className="tasks-list">
              {availableTasks.length > 0 ? (
                <ul>
                  {availableTasks.map((taskId, index) => (
                    <li key={index}>
                      Task ID: {taskId}
                      <button 
                        onClick={() => {
                          setStatus(`Task ${taskId} selected`);
                        }}
                        className="task-btn"
                      >
                        View Details
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No available tasks</p>
              )}
              <button onClick={loadAvailableTasks} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh Tasks'}
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
        </>
      )}
    </div>
  );
};

export default BlockchainTest;
