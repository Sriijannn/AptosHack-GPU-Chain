import React, { useState, useEffect } from "react";
import blockchainService from "../utils/blockchain-aptos"; // Assuming this path is correct

// --- Helper Components for a Cleaner Structure ---

const Card = ({ title, children, className = "" }) => (
  <div className={`card ${className}`}>
    {title && <h3 className="card-header">{title}</h3>}
    <div className="card-body">{children}</div>
  </div>
);

const Stat = ({ label, value, valueClass = "" }) => (
  <div className="stat">
    <span className="stat-label">{label}:</span>
    <span className={`stat-value ${valueClass}`}>{value}</span>
  </div>
);

const StatusBadge = ({ status }) => {
  const statusClass = status ? status.toLowerCase().replace(" ", "-") : "";
  return <span className={`status-badge ${statusClass}`}>{status}</span>;
};

// --- Main Component ---

const BlockchainTest = () => {
  // All your existing state and functions remain unchanged
  const [connectionStatus, setConnectionStatus] = useState("Not connected");
  const [account, setAccount] = useState("");
  const [network, setNetwork] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [workerInfo, setWorkerInfo] = useState(null);
  const [peerId, setPeerId] = useState(
    `12D3KooWDemo${Math.random().toString(36).substr(2, 8)}`
  );
  const [taskHash, setTaskHash] = useState(
    `QmDemo${Math.random().toString(36).substr(2, 8)}`
  );
  const [reward, setReward] = useState("0.1");
  const [deadline, setDeadline] = useState("24");
  const [availableTasks, setAvailableTasks] = useState([]);
  const [myCreatedTasks, setMyCreatedTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [showTaskOutput, setShowTaskOutput] = useState(false);
  const [gpuProcessing, setGpuProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [status, setStatus] = useState("Ready to connect...");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState("0");
  const [activeTab, setActiveTab] = useState("dashboard"); // For new tabbed UI

  useEffect(() => {
    checkConnection();
  }, []);

  // All your handler functions (checkConnection, connectWallet, handleCreateTask, etc.) go here...
  // ... (No changes needed for the logic, just paste them here)
  const checkConnection = () => {
    const status = blockchainService.getConnectionStatus();
    updateConnectionState(status);
  };

  const updateConnectionState = (status) => {
    setConnectionStatus(status.connected ? "Connected" : "Not connected");
    setAccount(status.account || "");
    setNetwork(status.network);
    setIsDemo(status.isDemo || false);

    if (status.connected) {
      loadWorkerInfo();
      loadAvailableTasks();
      loadMyCreatedTasks();
      loadBalance();
    }
  };

  const loadBalance = async () => {
    try {
      const balance = await blockchainService.getBalance();
      setBalance(balance);
    } catch (error) {
      console.warn("Failed to load balance:", error);
      setBalance("0");
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setStatus("Connecting to Aptos wallet...");
      const result = await blockchainService.connectWallet();
      if (result.success) {
        updateConnectionState(blockchainService.getConnectionStatus());
        setStatus(
          `✅ Connected via ${result.method}${
            result.isDemo ? " (Demo Mode)" : ""
          }`
        );
      }
    } catch (error) {
      console.error("Connection error:", error);
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
      console.error("Error loading worker info:", error);
      setWorkerInfo({
        isRegistered: false,
        peerId: "",
        reputation: "0",
        pendingRewards: "0",
        completedTasks: "0",
      });
    }
  };

  const loadAvailableTasks = async () => {
    try {
      const tasks = await blockchainService.getAvailableTasks(5);
      setAvailableTasks(tasks || []);
    } catch (error) {
      console.error("Error loading available tasks:", error);
      setAvailableTasks([]);
    }
  };

  const loadMyCreatedTasks = async () => {
    try {
      const connectionStatus = blockchainService.getConnectionStatus();
      if (!connectionStatus.connected || !connectionStatus.account) {
        setMyCreatedTasks([]);
        return;
      }
      const createdTasks = await blockchainService.getMyCreatedTasks();
      setMyCreatedTasks(createdTasks || []);
    } catch (error) {
      console.error("Error loading created tasks:", error);
      setStatus(`⚠️ Failed to load created tasks: ${error.message}`);
      setMyCreatedTasks([]);
    }
  };

  const handleRegisterWorker = async () => {
    if (!peerId.trim()) {
      setStatus("Please enter a peer ID");
      return;
    }
    setLoading(true);
    try {
      setStatus("Registering as worker on Aptos...");
      await blockchainService.registerWorker(peerId);
      setStatus("✅ Successfully registered as worker on Aptos!");
      await loadWorkerInfo();
    } catch (error) {
      console.error("Worker registration error:", error);
      setStatus(`❌ Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskHash.trim() || !reward) {
      setStatus("Please enter task hash and reward amount");
      return;
    }
    setLoading(true);
    try {
      setStatus("Creating compute task on Aptos...");
      const result = await blockchainService.createTask(
        taskHash,
        parseInt(deadline),
        reward
      );
      setStatus(
        `✅ Task created successfully on Aptos! Task ID: ${result.taskId}`
      );
      await loadAvailableTasks();
      await loadMyCreatedTasks();
      await loadBalance();
    } catch (error) {
      console.error("Task creation error:", error);
      setStatus(`❌ Task creation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    setLoading(true);
    try {
      setStatus("Claiming rewards on Aptos...");
      await blockchainService.claimRewards();
      setStatus("✅ Rewards claimed successfully from Aptos!");
      await loadWorkerInfo();
      await loadBalance();
    } catch (error) {
      console.error("Claim rewards error:", error);
      setStatus(`❌ Claim failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    blockchainService.disconnect();
    setConnectionStatus("Not connected");
    setAccount("");
    setNetwork(null);
    setIsDemo(false);
    setWorkerInfo(null);
    setAvailableTasks([]);
    setMyCreatedTasks([]);
    setBalance("0");
    setStatus("Disconnected from Aptos");
  };

  const handleViewTask = async (taskId) => {
    try {
      setLoading(true);
      setStatus(`Loading task ${taskId} details...`);
      const details = await blockchainService.getTaskDetails(taskId);
      setTaskDetails(details);
      setSelectedTask(taskId);
      setStatus(`✅ Task ${taskId} details loaded`);
    } catch (error) {
      console.error("Error viewing task:", error);
      setStatus(`❌ Failed to load task details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTask = async (taskId) => {
    try {
      setLoading(true);
      const details = await blockchainService.getTaskDetails(taskId);
      if (details.isCreator || !details.canAccept) {
        setStatus(`❌ This task cannot be accepted.`);
        return;
      }
      setStatus(`Accepting task ${taskId}...`);
      await blockchainService.acceptTask(taskId);
      setStatus(`✅ Task ${taskId} accepted! Starting GPU processing...`);
      await startGpuProcessing(taskId);
    } catch (error) {
      console.error("Error accepting task:", error);
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
      const processingResult = await processTaskWithP2P(taskId);
      if (processingResult.success) {
        setStatus(`✅ GPU processing completed! Submitting results...`);
        await submitTaskResult(taskId, processingResult.output);
      } else {
        throw new Error(processingResult.error);
      }
    } catch (error) {
      console.error("GPU processing error:", error);
      setStatus(`❌ GPU processing failed: ${error.message}`);
    } finally {
      setGpuProcessing(false);
      setProcessingProgress(0);
    }
  };

  const processTaskWithP2P = (taskId) => {
    return new Promise((resolve) => {
      const steps = [
        { progress: 10, message: "Connecting to P2P network..." },
        { progress: 40, message: "Initializing GPU kernels..." },
        { progress: 80, message: "Processing compute task..." },
        { progress: 100, message: "Processing complete!" },
      ];
      let currentStep = 0;
      const interval = setInterval(() => {
        if (currentStep < steps.length) {
          const step = steps[currentStep];
          setProcessingProgress(step.progress);
          setStatus(`🔄 ${step.message}`);
          currentStep++;
        } else {
          clearInterval(interval);
          resolve({
            success: true,
            output: `GPU_RESULT_${taskId}_${Date.now()}`,
          });
        }
      }, 800);
    });
  };

  const submitTaskResult = async (taskId, result) => {
    try {
      setStatus(`📤 Submitting task ${taskId} results...`);
      await blockchainService.submitTaskResult(taskId, result);
      await loadWorkerInfo();
      await loadAvailableTasks();
      await loadMyCreatedTasks();
      setStatus(`🎉 Task ${taskId} completed and submitted!`);
      setSelectedTask(null);
      setTaskDetails(null);
    } catch (error) {
      console.error("Error submitting task result:", error);
      setStatus(`❌ Failed to submit results: ${error.message}`);
    }
  };

  const closeTaskDetails = () => {
    setSelectedTask(null);
    setTaskDetails(null);
    setShowTaskOutput(false);
  };

  const handleViewTaskOutput = (task) => {
    setSelectedTask(task.taskId);
    setTaskDetails({ ...task, isCreator: true, canAccept: false });
    setShowTaskOutput(true);
    setStatus(`Viewing output for task ${task.taskId}`);
  };

  // --- Render methods for each tab ---
  const renderDashboard = () => (
    <>
      <Card title="👷 Worker Status">
        {workerInfo ? (
          <>
            {workerInfo.isRegistered ? (
              <div className="worker-details">
                <Stat label="Registration" value="✅ Registered" />
                <Stat label="Peer ID" value={workerInfo.peerId} />
                <Stat
                  label="Reputation"
                  value={`${workerInfo.reputation}/100`}
                />
                <Stat
                  label="Tasks Completed"
                  value={workerInfo.completedTasks}
                />
                <Stat
                  label="Pending Rewards"
                  value={`${workerInfo.pendingRewards} APT`}
                  valueClass="highlight"
                />
                {parseFloat(workerInfo.pendingRewards) > 0 && (
                  <button
                    onClick={handleClaimRewards}
                    disabled={loading}
                    className="button-primary claim-button"
                  >
                    {loading
                      ? "Claiming..."
                      : `Claim ${workerInfo.pendingRewards} APT`}
                  </button>
                )}
              </div>
            ) : (
              <div className="form-group">
                <p>You are not registered as a worker yet.</p>
                <input
                  type="text"
                  placeholder="Enter Your Peer ID"
                  value={peerId}
                  onChange={(e) => setPeerId(e.target.value)}
                  disabled={loading}
                />
                <button
                  onClick={handleRegisterWorker}
                  disabled={loading}
                  className="button-primary"
                >
                  {loading ? "Registering..." : "Register as Worker"}
                </button>
              </div>
            )}
          </>
        ) : (
          <p>Loading worker information...</p>
        )}
      </Card>
      <Card title="ℹ️ Demo Info">
        <p>
          <strong>Module:</strong> {blockchainService.moduleAddress}
          ::compute_reward
        </p>
        <p>
          This demo showcases worker registration, task creation, and a reward
          system on the Aptos blockchain, leveraging its high speed and
          ultra-low fees (~$0.001 per transaction).
        </p>
      </Card>
    </>
  );

  const renderTaskMarketplace = () => (
    <div className="grid-2-col">
      <Card title="➕ Create New Task">
        <div className="form-group">
          <label>Task Hash (e.g., Qm...)</label>
          <input
            type="text"
            value={taskHash}
            onChange={(e) => setTaskHash(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Reward (APT)</label>
          <input
            type="number"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Deadline (Hours)</label>
          <input
            type="number"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={loading}
          />
        </div>
        <button
          onClick={handleCreateTask}
          disabled={loading}
          className="button-primary"
        >
          {loading ? "Creating..." : "Create Task"}
        </button>
      </Card>
      <Card title="🌍 Available Tasks" className="full-height-card">
        <button
          onClick={loadAvailableTasks}
          disabled={loading}
          className="button-secondary refresh-button"
        >
          Refresh
        </button>
        <div className="task-list">
          {availableTasks.length > 0 ? (
            availableTasks.map((taskId) => (
              <div key={taskId} className="task-item">
                <span className="task-id">Task ID: {taskId}</span>
                <div className="task-actions">
                  <button
                    onClick={() => handleViewTask(taskId)}
                    disabled={loading}
                    className="button-secondary"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleAcceptTask(taskId)}
                    disabled={loading || gpuProcessing}
                    className="button-primary"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No tasks available at the moment.</p>
          )}
        </div>
      </Card>
    </div>
  );

  const renderMyTasks = () => (
    <Card title="💼 My Created Tasks">
      <button
        onClick={loadMyCreatedTasks}
        disabled={loading}
        className="button-secondary refresh-button"
      >
        Refresh
      </button>
      <div className="task-list">
        {myCreatedTasks.length > 0 ? (
          myCreatedTasks.map((task) => (
            <div key={task.taskId} className="task-item">
              <div className="task-info">
                <span className="task-id">Task ID: {task.taskId}</span>
                <span className="task-reward">{task.reward} APT</span>
                <StatusBadge status={task.status} />
              </div>
              <div className="task-actions">
                {task.status === "Completed" && task.output ? (
                  <button
                    onClick={() => handleViewTaskOutput(task)}
                    className="button-primary"
                  >
                    View Output
                  </button>
                ) : (
                  <span className="pending-text">Waiting for worker...</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p>You haven't created any tasks yet.</p>
        )}
      </div>
    </Card>
  );

  return (
    <>
      <style>{`
        :root {
            --primary-color: #7c3aed;
            --secondary-color: #a1a1aa;
            --background-color: #121212;
            --card-background: #1e1e1e;
            --text-color: #e4e4e7;
            --border-color: #27272a;
            --success-color: #22c55e;
            --error-color: #ef4444;
            --warning-color: #f59e0b;
            --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            --border-radius: 8px;
            --box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.2), 0 2px 4px -2px rgb(0 0 0 / 0.2);
        }
        body { margin: 0; font-family: var(--font-family); background-color: var(--background-color); color: var(--text-color); }
        .app-container { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .app-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--card-background);
            padding: 16px 24px;
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
            margin-bottom: 24px;
            border: 1px solid var(--border-color);
        }
        .app-header h1 { font-size: 24px; margin: 0; color: var(--primary-color); }
        .connection-info { text-align: right; }
        .connection-info p { margin: 2px 0; font-size: 12px; color: var(--secondary-color); }
        .connection-info .account { font-weight: bold; color: var(--text-color); }
        .connection-status { display: flex; align-items: center; gap: 8px; font-weight: 500; margin-bottom: 8px; }
        .status-indicator { width: 10px; height: 10px; border-radius: 50%; }
        .status-indicator.connected { background-color: var(--success-color); }
        .status-indicator.disconnected { background-color: var(--error-color); }
        .wallet-connect-card { text-align: center; padding: 48px; background: var(--card-background); border-radius: var(--border-radius); box-shadow: var(--box-shadow); border: 1px solid var(--border-color); }
        .wallet-connect-card h2 { margin-top: 0; color: var(--primary-color); }
        .button-primary, .button-secondary, .button-danger {
            border: none; padding: 10px 16px; font-size: 14px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: background-color 0.2s, opacity 0.2s;
        }
        .button-primary { background-color: var(--primary-color); color: white; }
        .button-primary:hover { background-color: #6d28d9; }
        .button-primary:disabled { background-color: var(--secondary-color); opacity: 0.7; cursor: not-allowed; }
        .button-secondary { background-color: var(--border-color); color: var(--text-color); }
        .button-secondary:hover { background-color: #3f3f46; }
        .button-danger { background-color: #dc2626; color: white; }
        .button-danger:hover { background-color: #b91c1c; }
        .tabs { display: flex; gap: 4px; margin-bottom: 24px; }
        .tab-button { background: var(--card-background); border: 1px solid var(--border-color); color: var(--text-color); padding: 10px 20px; font-size: 16px; cursor: pointer; border-bottom: none; border-radius: 6px 6px 0 0; }
        .tab-button.active { background-color: var(--primary-color); color: white; border-color: var(--primary-color); }
        .card { background: var(--card-background); border-radius: var(--border-radius); box-shadow: var(--box-shadow); margin-bottom: 24px; border: 1px solid var(--border-color); }
        .card-header { font-size: 18px; padding: 16px 24px; border-bottom: 1px solid var(--border-color); margin: 0; }
        .card-body { padding: 24px; }
        .grid-2-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px; }
        .full-height-card { display: flex; flex-direction: column; }
        .full-height-card .task-list { flex-grow: 1; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-weight: 500; margin-bottom: 6px; font-size: 14px; }
        input[type="text"], input[type="number"] { background: #0c0c0c; color: var(--text-color); width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; box-sizing: border-box; }
        .worker-details .stat { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color); }
        .worker-details .stat:last-child { border-bottom: none; }
        .stat-label { font-weight: 500; color: var(--secondary-color); }
        .stat-value { font-weight: 600; }
        .stat-value.highlight { color: var(--primary-color); }
        .claim-button { width: 100%; margin-top: 16px; }
        .task-list { max-height: 400px; overflow-y: auto; padding-right: 8px; }
        .task-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 12px; }
        .task-info { display: flex; align-items: center; gap: 16px; }
        .task-id { font-family: monospace; font-size: 14px; }
        .task-actions { display: flex; gap: 8px; }
        .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
        .status-badge.completed { background-color: #166534; color: #dcfce7; }
        .status-badge.available, .status-badge.pending { background-color: #854d0e; color: #fef9c3; }
        .pending-text { color: var(--secondary-color); font-size: 14px; }
        .refresh-button { float: right; margin-top: -60px; margin-right: 10px; }
        .status-footer { position: fixed; bottom: 0; left: 0; right: 0; background-color: #1f2937; color: white; padding: 10px 24px; font-size: 14px; text-align: center; z-index: 1000; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 2000; }
        .modal-content { background: var(--card-background); color: var(--text-color); padding: 0; border-radius: var(--border-radius); max-width: 600px; width: 90%; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.2), 0 4px 6px -2px rgb(0 0 0 / 0.2); border: 1px solid var(--border-color); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid var(--border-color); }
        .modal-header h3 { margin: 0; font-size: 20px; }
        .close-button { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--secondary-color); }
        .modal-body { padding: 24px; }
        .modal-body .stat { padding: 12px 0; }
        .output-content { background: var(--background-color); border: 1px solid var(--border-color); padding: 16px; margin-top: 16px; border-radius: 6px; font-family: monospace; word-break: break-all; }
        .progress-bar { height: 12px; background: var(--border-color); border-radius: 6px; overflow: hidden; margin-bottom: 8px; }
        .progress-fill { width: 0%; height: 100%; background: var(--primary-color); transition: width 0.5s ease; }
      `}</style>

      <div className="app-container">
        <header className="app-header">
          <h1>Aptos GPU Compute</h1>
          <div className="connection-info">
            {account ? (
              <>
                <div className="connection-status">
                  <span className="status-indicator connected"></span> Connected{" "}
                  {isDemo && "(Demo)"}
                </div>
                <p className="account">
                  {account.substring(0, 6)}...
                  {account.substring(account.length - 4)}
                </p>
                <p>
                  <strong>Balance:</strong> {balance} APT |{" "}
                  <strong>Network:</strong> {network?.name}
                </p>
                <button
                  onClick={disconnect}
                  className="button-danger"
                  style={{ marginTop: "8px", padding: "6px 10px" }}
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="button-primary"
              >
                {loading ? "Connecting..." : "Connect Petra Wallet"}
              </button>
            )}
          </div>
        </header>

        <main>
          {!account ? (
            <div className="wallet-connect-card">
              <h2>Welcome!</h2>
              <p>
                Connect your Petra wallet to manage compute tasks on the Aptos
                network.
              </p>
            </div>
          ) : (
            <>
              <nav className="tabs">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`tab-button ${
                    activeTab === "dashboard" ? "active" : ""
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("marketplace")}
                  className={`tab-button ${
                    activeTab === "marketplace" ? "active" : ""
                  }`}
                >
                  Task Marketplace
                </button>
                <button
                  onClick={() => setActiveTab("my-tasks")}
                  className={`tab-button ${
                    activeTab === "my-tasks" ? "active" : ""
                  }`}
                >
                  My Tasks
                </button>
              </nav>

              <div className="tab-content">
                {activeTab === "dashboard" && renderDashboard()}
                {activeTab === "marketplace" && renderTaskMarketplace()}
                {activeTab === "my-tasks" && renderMyTasks()}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Task Details Modal */}
      {selectedTask && taskDetails && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Task Details</h3>
              <button onClick={closeTaskDetails} className="close-button">
                ×
              </button>
            </div>
            <div className="modal-body">
              <Stat label="Task ID" value={selectedTask} />
              <Stat label="Task Hash" value={taskDetails.taskHash || "N/A"} />
              <Stat
                label="Reward"
                value={`${taskDetails.reward || "0"} APT`}
                valueClass="highlight"
              />
              <Stat
                label="Status"
                value={
                  <StatusBadge status={taskDetails.status || "Available"} />
                }
              />
              <Stat label="Creator" value={taskDetails.creator || "Unknown"} />
              {showTaskOutput && taskDetails.output && (
                <div className="output-content">
                  <strong>Output Hash:</strong> {taskDetails.output}
                </div>
              )}
              <div style={{ marginTop: "24px", textAlign: "center" }}>
                {taskDetails.canAccept && !taskDetails.isCreator && (
                  <button
                    onClick={() => handleAcceptTask(selectedTask)}
                    className="button-primary"
                    disabled={loading || gpuProcessing}
                  >
                    Accept & Start Processing
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GPU Processing Overlay */}
      {gpuProcessing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🖥️ P2P GPU Processing</h3>
            </div>
            <div className="modal-body">
              <p>Processing task on the distributed network. Please wait...</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
              <p style={{ textAlign: "center", fontWeight: "600" }}>
                {processingProgress}% Complete
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="status-footer">{status}</div>
    </>
  );
};

export default BlockchainTest;
