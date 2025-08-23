import React, { useState, useEffect } from 'react';
import { blockchainService, TASK_STATUS, TASK_STATUS_LABELS } from '../utils/blockchain';
import './BlockchainInterface.css';

function BlockchainInterface({ userEmail, peerId }) {
  // Wallet state
  const [walletConnected, setWalletConnected] = useState(false);
  const [currentAccount, setCurrentAccount] = useState("");
  const [network, setNetwork] = useState(null);
  const [balance, setBalance] = useState("0");

  // Worker state
  const [isRegistered, setIsRegistered] = useState(false);
  const [workerInfo, setWorkerInfo] = useState(null);

  // Task state
  const [tasks, setTasks] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [userTasks, setUserTasks] = useState([]);
  const [platformStats, setPlatformStats] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [newTaskForm, setNewTaskForm] = useState({
    description: "",
    deadline: 24, // hours
    reward: "0.01" // ETH
  });

  useEffect(() => {
    checkWalletConnection();
    loadPlatformStats();
  }, []);

  useEffect(() => {
    if (walletConnected && currentAccount) {
      loadWorkerInfo();
      loadUserTasks();
      loadAvailableTasks();
      setupEventListeners();
    }
    
    return () => {
      blockchainService.removeAllListeners();
    };
  }, [walletConnected, currentAccount]);

  const checkWalletConnection = async () => {
    try {
      if (window.ethereum && window.ethereum.selectedAddress) {
        await connectWallet();
      }
    } catch (error) {
      console.log("No wallet connected");
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError("");
      
      const connection = await blockchainService.connectWallet();
      setWalletConnected(true);
      setCurrentAccount(connection.account);
      setNetwork(connection.network);
      
      // Get balance
      const provider = blockchainService.provider;
      const balanceWei = await provider.getBalance(connection.account);
      setBalance(parseFloat(ethers.formatEther(balanceWei)).toFixed(4));
      
      setSuccess("Wallet connected successfully!");
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    blockchainService.disconnect();
    setWalletConnected(false);
    setCurrentAccount("");
    setNetwork(null);
    setBalance("0");
    setIsRegistered(false);
    setWorkerInfo(null);
    setTasks([]);
    setUserTasks([]);
  };

  const registerWorker = async () => {
    if (!peerId) {
      setError("Peer ID is required for worker registration");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      await blockchainService.registerWorker(peerId);
      await loadWorkerInfo();
      
      setSuccess("Successfully registered as compute worker!");
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (error) {
      setError(`Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkerInfo = async () => {
    try {
      const info = await blockchainService.getWorkerInfo(currentAccount);
      setWorkerInfo(info);
      setIsRegistered(info.isRegistered);
    } catch (error) {
      console.error("Failed to load worker info:", error);
    }
  };

  const loadUserTasks = async () => {
    try {
      const taskIds = await blockchainService.getUserTasks(currentAccount);
      const taskDetails = await Promise.all(
        taskIds.map(id => blockchainService.getTask(id))
      );
      setUserTasks(taskDetails);
    } catch (error) {
      console.error("Failed to load user tasks:", error);
    }
  };

  const loadAvailableTasks = async () => {
    try {
      const taskIds = await blockchainService.getAvailableTasks(10);
      const taskDetails = await Promise.all(
        taskIds.map(id => blockchainService.getTask(id))
      );
      setAvailableTasks(taskDetails);
    } catch (error) {
      console.error("Failed to load available tasks:", error);
    }
  };

  const loadPlatformStats = async () => {
    try {
      const stats = await blockchainService.getPlatformStats();
      setPlatformStats(stats);
    } catch (error) {
      console.error("Failed to load platform stats:", error);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError("");
      
      // Create a simple task hash (in production, use IPFS)
      const taskHash = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await blockchainService.createTask(
        taskHash,
        parseInt(newTaskForm.deadline),
        parseFloat(newTaskForm.reward)
      );
      
      // Reset form
      setNewTaskForm({
        description: "",
        deadline: 24,
        reward: "0.01"
      });
      
      // Reload tasks
      await loadUserTasks();
      await loadAvailableTasks();
      await loadPlatformStats();
      
      setSuccess(`Task created successfully! Task ID: ${result.taskId}`);
      setTimeout(() => setSuccess(""), 5000);
      
    } catch (error) {
      setError(`Task creation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const assignTaskToSelf = async (taskId) => {
    try {
      setLoading(true);
      setError("");
      
      await blockchainService.assignTask(taskId, currentAccount);
      await loadAvailableTasks();
      
      setSuccess(`Task ${taskId} assigned to you!`);
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (error) {
      setError(`Task assignment failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const claimRewards = async () => {
    try {
      setLoading(true);
      setError("");
      
      await blockchainService.claimRewards();
      await loadWorkerInfo();
      
      setSuccess("Rewards claimed successfully!");
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (error) {
      setError(`Reward claim failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const setupEventListeners = () => {
    // Listen for task events
    blockchainService.listenForEvents('TaskCreated', (taskId, requester, rewardAmount) => {
      console.log('New task created:', taskId.toString());
      loadAvailableTasks();
      loadPlatformStats();
    });

    blockchainService.listenForEvents('TaskAssigned', (taskId, worker) => {
      console.log('Task assigned:', taskId.toString(), 'to', worker);
      if (worker.toLowerCase() === currentAccount.toLowerCase()) {
        loadWorkerInfo();
      }
      loadAvailableTasks();
    });

    blockchainService.listenForEvents('TaskVerified', (taskId, worker, rewardAmount) => {
      console.log('Task verified:', taskId.toString());
      if (worker.toLowerCase() === currentAccount.toLowerCase()) {
        loadWorkerInfo();
      }
      loadPlatformStats();
    });

    blockchainService.listenForEvents('RewardClaimed', (worker, amount) => {
      console.log('Rewards claimed:', ethers.formatEther(amount), 'ETH');
      if (worker.toLowerCase() === currentAccount.toLowerCase()) {
        loadWorkerInfo();
      }
    });
  };

  if (!walletConnected) {
    return (
      <div className="blockchainInterface">
        <div className="walletConnect">
          <h3>🔗 Connect Your Wallet</h3>
          <p>Connect your Web3 wallet to participate in blockchain-verified GPU computing</p>
          <button onClick={connectWallet} disabled={loading} className="btn connectBtn">
            {loading ? "Connecting..." : "Connect MetaMask"}
          </button>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="blockchainInterface">
      {/* Wallet Info */}
      <div className="walletInfo">
        <div className="walletHeader">
          <h3>💼 Wallet Connected</h3>
          <button onClick={disconnectWallet} className="btn disconnectBtn">Disconnect</button>
        </div>
        <div className="walletDetails">
          <div className="detail">
            <span>Account:</span>
            <span>{blockchainService.formatAddress(currentAccount)}</span>
          </div>
          <div className="detail">
            <span>Network:</span>
            <span>{network?.name} (Chain ID: {network?.chainId})</span>
          </div>
          <div className="detail">
            <span>Balance:</span>
            <span>{balance} ETH</span>
          </div>
        </div>
      </div>

      {/* Worker Registration */}
      {!isRegistered && (
        <div className="workerRegistration">
          <h3>👷 Become a Compute Worker</h3>
          <p>Register to receive and process GPU computing tasks</p>
          <button onClick={registerWorker} disabled={loading || !peerId} className="btn registerBtn">
            {loading ? "Registering..." : "Register as Worker"}
          </button>
          {!peerId && <div className="warning">⚠️ Peer ID required. Make sure P2P connection is active.</div>}
        </div>
      )}

      {/* Worker Info */}
      {isRegistered && workerInfo && (
        <div className="workerInfo">
          <h3>⚡ Worker Status</h3>
          <div className="workerStats">
            <div className="stat">
              <span>Reputation:</span>
              <span className="reputation">{workerInfo.reputation}/100</span>
            </div>
            <div className="stat">
              <span>Completed Tasks:</span>
              <span>{workerInfo.completedTasks}</span>
            </div>
            <div className="stat">
              <span>Pending Rewards:</span>
              <span>{workerInfo.pendingRewards} ETH</span>
            </div>
          </div>
          {parseFloat(workerInfo.pendingRewards) > 0 && (
            <button onClick={claimRewards} disabled={loading} className="btn claimBtn">
              {loading ? "Claiming..." : "Claim Rewards"}
            </button>
          )}
        </div>
      )}

      {/* Create Task */}
      <div className="createTask">
        <h3>📋 Create Computing Task</h3>
        <form onSubmit={createTask} className="taskForm">
          <div className="formGroup">
            <label>Task Description:</label>
            <input
              type="text"
              value={newTaskForm.description}
              onChange={(e) => setNewTaskForm({...newTaskForm, description: e.target.value})}
              placeholder="Describe your computing task"
              required
            />
          </div>
          <div className="formRow">
            <div className="formGroup">
              <label>Deadline (hours):</label>
              <input
                type="number"
                value={newTaskForm.deadline}
                onChange={(e) => setNewTaskForm({...newTaskForm, deadline: e.target.value})}
                min="1"
                max="168"
                required
              />
            </div>
            <div className="formGroup">
              <label>Reward (ETH):</label>
              <input
                type="number"
                step="0.001"
                value={newTaskForm.reward}
                onChange={(e) => setNewTaskForm({...newTaskForm, reward: e.target.value})}
                min="0.001"
                required
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn createBtn">
            {loading ? "Creating..." : "Create Task"}
          </button>
        </form>
      </div>

      {/* Available Tasks */}
      {isRegistered && availableTasks.length > 0 && (
        <div className="availableTasks">
          <h3>🎯 Available Tasks</h3>
          <div className="tasksList">
            {availableTasks.map(task => (
              <div key={task.taskId} className="taskCard">
                <div className="taskHeader">
                  <span className="taskId">Task #{task.taskId}</span>
                  <span className="taskReward">{task.rewardAmount} ETH</span>
                </div>
                <div className="taskDetails">
                  <div>Hash: {task.taskHash}</div>
                  <div>Deadline: {task.deadline.toLocaleString()}</div>
                  <div>Status: {TASK_STATUS_LABELS[task.status]}</div>
                </div>
                <button 
                  onClick={() => assignTaskToSelf(task.taskId)} 
                  disabled={loading}
                  className="btn assignBtn"
                >
                  Accept Task
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Tasks */}
      {userTasks.length > 0 && (
        <div className="userTasks">
          <h3>📝 Your Tasks</h3>
          <div className="tasksList">
            {userTasks.map(task => (
              <div key={task.taskId} className="taskCard">
                <div className="taskHeader">
                  <span className="taskId">Task #{task.taskId}</span>
                  <span className="taskReward">{task.rewardAmount} ETH</span>
                </div>
                <div className="taskDetails">
                  <div>Hash: {task.taskHash}</div>
                  <div>Worker: {task.worker !== "0x0000000000000000000000000000000000000000" ? 
                    blockchainService.formatAddress(task.worker) : "Unassigned"}</div>
                  <div>Status: {TASK_STATUS_LABELS[task.status]}</div>
                  <div>Created: {task.createdAt.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Stats */}
      {platformStats && (
        <div className="platformStats">
          <h3>📊 Platform Statistics</h3>
          <div className="statsGrid">
            <div className="statCard">
              <div className="statValue">{platformStats.totalTasks}</div>
              <div className="statLabel">Total Tasks</div>
            </div>
            <div className="statCard">
              <div className="statValue">{platformStats.completedTasks}</div>
              <div className="statLabel">Completed</div>
            </div>
            <div className="statCard">
              <div className="statValue">{parseFloat(platformStats.totalRewards).toFixed(4)} ETH</div>
              <div className="statLabel">Total Rewards</div>
            </div>
            <div className="statCard">
              <div className="statValue">{Math.round((platformStats.completedTasks / platformStats.totalTasks) * 100) || 0}%</div>
              <div className="statLabel">Success Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
    </div>
  );
}

export default BlockchainInterface;
