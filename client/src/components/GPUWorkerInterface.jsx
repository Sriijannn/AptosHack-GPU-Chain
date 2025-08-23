import React, { useState, useEffect } from 'react';
import { blockchainService } from '../utils/blockchain';
import './GPUWorkerInterface.css';

const GPUWorkerInterface = ({ userEmail, peerId }) => {
  // Wallet state
  const [walletConnected, setWalletConnected] = useState(false);
  const [currentAccount, setCurrentAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [earnings, setEarnings] = useState("0");

  // Worker state
  const [isRegistered, setIsRegistered] = useState(false);
  const [workerInfo, setWorkerInfo] = useState(null);
  const [hourlyRate, setHourlyRate] = useState("0.005"); // ETH per hour
  const [isOnline, setIsOnline] = useState(false);
  const [gpuSpecs, setGpuSpecs] = useState({
    model: "RTX 4090",
    vram: "24GB",
    compute: "83.0 TFLOPs"
  });

  // Task state
  const [activeJobs, setActiveJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [workerStats, setWorkerStats] = useState({
    totalEarned: "0",
    jobsCompleted: 0,
    rating: 5.0,
    uptime: "99.2%"
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (walletConnected && currentAccount) {
      loadWorkerData();
      loadWorkerStats();
    }
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
      
      // Get balance
      const provider = blockchainService.provider;
      const balanceWei = await provider.getBalance(connection.account);
      setBalance(parseFloat(window.ethers.formatEther(balanceWei)).toFixed(4));
      
      setSuccess("Wallet connected successfully!");
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
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
      await loadWorkerData();
      
      setSuccess("Successfully registered as GPU worker!");
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (error) {
      setError(`Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateHourlyRate = async () => {
    try {
      setLoading(true);
      setError("");
      
      // This would be implemented in the smart contract
      // await blockchainService.setHourlyRate(parseFloat(hourlyRate));
      
      setSuccess(`Hourly rate updated to ${hourlyRate} ETH/hour`);
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (error) {
      setError(`Failed to update rate: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      setLoading(true);
      const newStatus = !isOnline;
      
      // This would be implemented in the smart contract
      // await blockchainService.setWorkerStatus(newStatus);
      
      setIsOnline(newStatus);
      setSuccess(`GPU worker ${newStatus ? 'online' : 'offline'}`);
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (error) {
      setError(`Failed to update status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkerData = async () => {
    try {
      const info = await blockchainService.getWorkerInfo(currentAccount);
      setWorkerInfo(info);
      setIsRegistered(info.isRegistered);
    } catch (error) {
      console.error("Failed to load worker data:", error);
    }
  };

  const loadWorkerStats = async () => {
    // Mock data - would be loaded from blockchain
    setWorkerStats({
      totalEarned: "2.45",
      jobsCompleted: 127,
      rating: 4.8,
      uptime: "99.2%"
    });
    setEarnings("0.125");
  };

  const withdrawEarnings = async () => {
    try {
      setLoading(true);
      setError("");
      
      // This would be implemented in the smart contract
      // await blockchainService.withdrawEarnings();
      
      setSuccess("Earnings withdrawn successfully!");
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (error) {
      setError(`Withdrawal failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gpu-worker-interface">
      <div className="worker-header">
        <h2>🖥️ GPU Worker Dashboard</h2>
        <p>Monetize your GPU computing power</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {!walletConnected ? (
        <div className="wallet-connection">
          <div className="connection-card">
            <h3>Connect Your Wallet</h3>
            <p>Connect your wallet to start earning with your GPU</p>
            <button 
              onClick={connectWallet} 
              disabled={loading}
              className="connect-wallet-btn"
            >
              {loading ? "Connecting..." : "🔗 Connect Wallet"}
            </button>
          </div>
        </div>
      ) : (
        <div className="worker-dashboard">
          {/* Wallet Info */}
          <div className="wallet-info">
            <div className="wallet-card">
              <h3>💰 Wallet Balance</h3>
              <div className="balance-display">
                <span className="balance-amount">{balance} ETH</span>
                <span className="wallet-address">{currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}</span>
              </div>
            </div>
            <div className="earnings-card">
              <h3>💎 Pending Earnings</h3>
              <div className="earnings-display">
                <span className="earnings-amount">{earnings} ETH</span>
                <button 
                  onClick={withdrawEarnings}
                  disabled={loading || parseFloat(earnings) === 0}
                  className="withdraw-btn"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>

          {!isRegistered ? (
            <div className="registration-section">
              <div className="registration-card">
                <h3>🚀 Register as GPU Worker</h3>
                <p>Start earning by sharing your GPU computing power</p>
                
                <div className="gpu-specs">
                  <h4>Your GPU Specifications:</h4>
                  <div className="spec-grid">
                    <div className="spec-item">
                      <label>GPU Model:</label>
                      <input 
                        type="text" 
                        value={gpuSpecs.model}
                        onChange={(e) => setGpuSpecs({...gpuSpecs, model: e.target.value})}
                      />
                    </div>
                    <div className="spec-item">
                      <label>VRAM:</label>
                      <input 
                        type="text" 
                        value={gpuSpecs.vram}
                        onChange={(e) => setGpuSpecs({...gpuSpecs, vram: e.target.value})}
                      />
                    </div>
                    <div className="spec-item">
                      <label>Compute Power:</label>
                      <input 
                        type="text" 
                        value={gpuSpecs.compute}
                        onChange={(e) => setGpuSpecs({...gpuSpecs, compute: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={registerWorker}
                  disabled={loading || !peerId}
                  className="register-btn"
                >
                  {loading ? "Registering..." : "🎯 Register GPU Worker"}
                </button>
              </div>
            </div>
          ) : (
            <div className="worker-controls">
              {/* Rate Setting */}
              <div className="rate-section">
                <h3>💰 Set Hourly Rate</h3>
                <div className="rate-input-group">
                  <input 
                    type="number" 
                    step="0.001"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="rate-input"
                  />
                  <span className="rate-unit">ETH/hour</span>
                  <button 
                    onClick={updateHourlyRate}
                    disabled={loading}
                    className="update-rate-btn"
                  >
                    Update Rate
                  </button>
                </div>
                <p className="rate-suggestion">
                  💡 Suggested rate: 0.003-0.010 ETH/hour based on your GPU specs
                </p>
              </div>

              {/* Online Status */}
              <div className="status-section">
                <h3>📡 Worker Status</h3>
                <div className="status-toggle">
                  <button 
                    onClick={toggleOnlineStatus}
                    disabled={loading}
                    className={`status-btn ${isOnline ? 'online' : 'offline'}`}
                  >
                    {isOnline ? '🟢 Online' : '🔴 Offline'}
                  </button>
                  <span className="status-text">
                    {isOnline ? 'Available for jobs' : 'Not accepting jobs'}
                  </span>
                </div>
              </div>

              {/* Worker Stats */}
              <div className="stats-section">
                <h3>📊 Performance Stats</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-label">Total Earned</span>
                    <span className="stat-value">{workerStats.totalEarned} ETH</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Jobs Completed</span>
                    <span className="stat-value">{workerStats.jobsCompleted}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Rating</span>
                    <span className="stat-value">⭐ {workerStats.rating}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Uptime</span>
                    <span className="stat-value">{workerStats.uptime}</span>
                  </div>
                </div>
              </div>

              {/* Active Jobs */}
              <div className="jobs-section">
                <h3>⚡ Active Jobs</h3>
                {activeJobs.length === 0 ? (
                  <div className="no-jobs">
                    <p>No active jobs. Make sure you're online to receive work!</p>
                  </div>
                ) : (
                  <div className="jobs-list">
                    {activeJobs.map(job => (
                      <div key={job.id} className="job-card">
                        <div className="job-info">
                          <span className="job-id">Job #{job.id}</span>
                          <span className="job-type">{job.type}</span>
                          <span className="job-progress">{job.progress}%</span>
                        </div>
                        <div className="job-earnings">
                          <span className="job-rate">{job.rate} ETH/hour</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GPUWorkerInterface;
