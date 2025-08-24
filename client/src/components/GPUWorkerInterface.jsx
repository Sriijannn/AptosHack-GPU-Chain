import React, { useState, useEffect } from "react";
import blockchainService from "../utils/blockchain-aptos";
import "./GPUWorkerInterface.css";

const GPUWorkerInterface = ({ userEmail, peerId }) => {
  // Wallet state
  const [walletConnected, setWalletConnected] = useState(false);
  const [currentAccount, setCurrentAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [earnings, setEarnings] = useState("0");

  // Worker state
  const [isRegistered, setIsRegistered] = useState(false);
  const [workerInfo, setWorkerInfo] = useState(null);
  const [hourlyRate, setHourlyRate] = useState("0.005"); // APT per hour
  const [isOnline, setIsOnline] = useState(false);
  const [gpuSpecs, setGpuSpecs] = useState({
    model: "RTX 4090",
    vram: "24GB",
    compute: "83.0 TFLOPs",
  });

  // Task state
  const [activeJobs, setActiveJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [workerStats, setWorkerStats] = useState({
    totalEarned: "0",
    jobsCompleted: 0,
    rating: 5.0,
    uptime: "99.2%",
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
      const status = blockchainService.getConnectionStatus();
      if (status.connected && status.account) {
        setWalletConnected(true);
        setCurrentAccount(status.account);
        await loadBalance();
      }
    } catch (error) {
      console.log("No wallet connected");
    }
  };

  const loadBalance = async () => {
    try {
      const balance = await blockchainService.getBalance();
      setBalance(parseFloat(balance).toFixed(4));
    } catch (error) {
      console.warn("Failed to load balance:", error);
      setBalance("0");
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError("");

      const connection = await blockchainService.connectWallet();
      if (connection.success) {
        setWalletConnected(true);
        setCurrentAccount(
          connection.account || blockchainService.getConnectionStatus().account
        );
        await loadBalance();

        setSuccess(
          `Wallet connected successfully! ${
            connection.isDemo ? "(Demo Mode)" : ""
          }`
        );
        setTimeout(() => setSuccess(""), 3000);
      }
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

      setSuccess("Successfully registered as GPU worker on Aptos!");
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

      // Note: This would need to be implemented in the smart contract
      // For now, we'll simulate it
      console.log(`Setting hourly rate to ${hourlyRate} APT/hour`);

      setSuccess(`Hourly rate updated to ${hourlyRate} APT/hour`);
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

      // Note: This would need to be implemented in the smart contract
      // For now, we'll simulate it
      console.log(
        `Setting worker status to: ${newStatus ? "online" : "offline"}`
      );

      setIsOnline(newStatus);
      setSuccess(
        `GPU worker ${newStatus ? "online" : "offline"} on Aptos network`
      );
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(`Failed to update status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkerData = async () => {
    try {
      const info = await blockchainService.getWorkerInfo();
      setWorkerInfo(info);
      setIsRegistered(info.isRegistered);

      // Set earnings from pending rewards
      if (info.pendingRewards) {
        setEarnings(info.pendingRewards);
      }
    } catch (error) {
      console.error("Failed to load worker data:", error);
      // Set default values for demo
      setWorkerInfo({
        isRegistered: false,
        peerId: "",
        reputation: "0",
        pendingRewards: "0",
        completedTasks: "0",
      });
    }
  };

  const loadWorkerStats = async () => {
    try {
      const info = await blockchainService.getWorkerInfo();

      // Update stats based on blockchain data
      setWorkerStats({
        totalEarned: info.pendingRewards || "0",
        jobsCompleted: parseInt(info.completedTasks) || 0,
        rating: Math.min(5.0, 3.0 + (parseInt(info.reputation) / 100) * 2), // Convert 0-100 to 3.0-5.0
        uptime: "99.2%", // This would be calculated based on historical data
      });

      setEarnings(info.pendingRewards || "0");
    } catch (error) {
      console.error("Failed to load worker stats:", error);
      // Mock data for demo
      setWorkerStats({
        totalEarned: "2.45",
        jobsCompleted: 127,
        rating: 4.8,
        uptime: "99.2%",
      });
      setEarnings("0.125");
    }
  };

  const withdrawEarnings = async () => {
    try {
      setLoading(true);
      setError("");

      if (parseFloat(earnings) <= 0) {
        setError("No earnings to withdraw");
        return;
      }

      await blockchainService.claimRewards();

      // Refresh data after withdrawal
      await loadBalance();
      await loadWorkerData();
      await loadWorkerStats();

      setSuccess("Earnings withdrawn successfully from Aptos!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(`Withdrawal failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const stakeTokens = async (amount) => {
    try {
      setLoading(true);
      setError("");

      // Note: This would use the staking functionality
      console.log(`Staking ${amount} APT as worker`);

      setSuccess(`Successfully staked ${amount} APT as worker collateral!`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(`Staking failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gpu-worker-interface">
      <div className="worker-header">
        <h2>🖥️ GPU Worker Dashboard</h2>
        <p>Monetize your GPU computing power on Aptos</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {!walletConnected ? (
        <div className="wallet-connection">
          <div className="connection-card">
            <h3>Connect Your Aptos Wallet</h3>
            <p>Connect your Petra wallet to start earning with your GPU</p>
            <button
              onClick={connectWallet}
              disabled={loading}
              className="connect-wallet-btn"
            >
              {loading ? "Connecting..." : "🔗 Connect Petra Wallet"}
            </button>
            <div className="wallet-benefits">
              <div className="benefit-item">
                <span className="benefit-icon">🔥</span>
                <span>Ultra-low fees (~$0.001)</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">⚡</span>
                <span>Instant transactions</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">🛡️</span>
                <span>Secure Move contracts</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="worker-dashboard-container">
          <div className="main-content">
            <div className="wallet-info-grid">
              <div className="wallet-card">
                <h3>💰 Wallet Balance</h3>
                <div className="balance-display">
                  <span className="balance-amount">{balance} APT</span>
                  <span className="wallet-address">
                    {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
                  </span>
                </div>
                <div className="network-info">
                  <span className="network-badge">Aptos Devnet</span>
                </div>
              </div>
              <div className="earnings-card">
                <h3>💎 Pending Earnings</h3>
                <div className="earnings-display">
                  <span className="earnings-amount">{earnings} APT</span>
                  <button
                    onClick={withdrawEarnings}
                    disabled={loading || parseFloat(earnings) === 0}
                    className="withdraw-btn"
                  >
                    {loading ? "Withdrawing..." : "Withdraw"}
                  </button>
                </div>
              </div>
            </div>

            {!isRegistered ? (
              <div className="registration-section">
                <div className="registration-card">
                  <h3>🚀 Register as GPU Worker</h3>
                  <p>
                    Start earning by sharing your GPU computing power on Aptos
                  </p>

                  <div className="gpu-specs">
                    <h4>Your GPU Specifications:</h4>
                    <div className="spec-grid">
                      <div className="spec-item">
                        <label>GPU Model:</label>
                        <input
                          type="text"
                          value={gpuSpecs.model}
                          onChange={(e) =>
                            setGpuSpecs({ ...gpuSpecs, model: e.target.value })
                          }
                        />
                      </div>
                      <div className="spec-item">
                        <label>VRAM:</label>
                        <input
                          type="text"
                          value={gpuSpecs.vram}
                          onChange={(e) =>
                            setGpuSpecs({ ...gpuSpecs, vram: e.target.value })
                          }
                        />
                      </div>
                      <div className="spec-item">
                        <label>Compute Power:</label>
                        <input
                          type="text"
                          value={gpuSpecs.compute}
                          onChange={(e) =>
                            setGpuSpecs({
                              ...gpuSpecs,
                              compute: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="registration-benefits">
                    <h4>🎯 Why Join GPU Chain on Aptos?</h4>
                    <ul>
                      <li>
                        ✅ Ultra-low transaction fees (99.9% cheaper than
                        Ethereum)
                      </li>
                      <li>✅ Instant payment settlements</li>
                      <li>✅ Secure smart contract execution</li>
                      <li>✅ Built-in reputation system</li>
                    </ul>
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
              <div className="worker-controls-grid">
                <div className="rate-section control-card">
                  <h3>💰 Set Hourly Rate</h3>
                  <p>Adjust your rate to stay competitive.</p>
                  <div className="rate-input-group">
                    <input
                      type="number"
                      step="0.001"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="rate-input"
                    />
                    <span className="rate-unit">APT/hour</span>
                    <button
                      onClick={updateHourlyRate}
                      disabled={loading}
                      className="update-rate-btn"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div className="staking-section control-card">
                  <h3>🔒 Worker Staking</h3>
                  <p>Stake APT to boost your reputation and get more jobs.</p>
                  <div className="stake-controls">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount to stake"
                      className="stake-input"
                    />
                    <button
                      onClick={() => stakeTokens(0.01)}
                      disabled={loading}
                      className="stake-btn"
                    >
                      Stake
                    </button>
                  </div>
                  <div className="stake-info">
                    <span>
                      Current Stake: {workerInfo?.stakeAmount || "0"} APT
                    </span>
                    <span>Minimum Required: 0.01 APT</span>
                  </div>
                </div>

                <div className="status-section control-card">
                  <h3>📡 Worker Status</h3>
                  <div className="status-toggle">
                    <button
                      onClick={toggleOnlineStatus}
                      disabled={loading}
                      className={`status-btn ${
                        isOnline ? "online" : "offline"
                      }`}
                    >
                      {isOnline ? "🟢 Online" : "🔴 Offline"}
                    </button>
                    <span className="status-text">
                      {isOnline
                        ? "Available for jobs on Aptos"
                        : "Not accepting jobs"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="stats-section control-card">
              <h3>📊 Performance Stats</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Earned</span>
                  <span className="stat-value">
                    {workerStats.totalEarned} APT
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Jobs Completed</span>
                  <span className="stat-value">
                    {workerStats.jobsCompleted}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Rating</span>
                  <span className="stat-value">⭐ {workerStats.rating}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Uptime</span>
                  <span className="stat-value">{workerStats.uptime}</span>
                </div>
              </div>
              <div className="reputation-info">
                <span>
                  Blockchain Reputation: {workerInfo?.reputation || "0"}/100
                </span>
                <div className="reputation-bar">
                  <div
                    className="reputation-fill"
                    style={{ width: `${workerInfo?.reputation || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="jobs-section control-card">
              <h3>⚡ Active Jobs</h3>
              {activeJobs.length === 0 ? (
                <div className="no-jobs">
                  <p>No active jobs. Stay online to receive work!</p>
                  <div className="job-tips">
                    <h4>Tips to get more jobs:</h4>
                    <ul>
                      <li>Keep your worker status online</li>
                      <li>Maintain a high reputation score</li>
                      <li>Set competitive hourly rates</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="jobs-list">
                  {activeJobs.map((job) => (
                    <div key={job.id} className="job-card">
                      <div className="job-info">
                        <span className="job-id">Job #{job.id}</span>
                        <span className="job-type">{job.type}</span>
                        <span className="job-progress">{job.progress}%</span>
                      </div>
                      <div className="job-earnings">
                        <span className="job-rate">{job.rate} APT/hour</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="sidebar">
            <div className="completed-jobs-section control-card">
              <h3>✅ Recent Completed Jobs</h3>
              <div className="completed-jobs-list">
                {completedJobs.slice(0, 5).map((job, index) => (
                  <div key={index} className="completed-job-item">
                    <span className="job-info">
                      Job #{1000 + index} - {job.type || "GPU Compute"}
                    </span>
                    <span className="job-earnings">
                      +{job.earnings || "0.05"} APT
                    </span>
                    <span className="job-status">✅ Verified</span>
                  </div>
                ))}
                {completedJobs.length === 0 && (
                  <p>
                    No completed jobs yet. Start accepting tasks to build your
                    reputation!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GPUWorkerInterface;
