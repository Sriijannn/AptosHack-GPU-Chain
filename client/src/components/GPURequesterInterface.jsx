import React, { useState, useEffect } from "react";
import blockchainService from "../utils/blockchain-aptos"; // Assuming this service exists

const GPURequesterInterface = ({ userEmail }) => {
  // State variables... (kept as is)
  const [walletConnected, setWalletConnected] = useState(false);
  const [currentAccount, setCurrentAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [taskDuration, setTaskDuration] = useState(24); // hours
  const [taskDescription, setTaskDescription] = useState("");
  const [taskHash, setTaskHash] = useState("");
  const [rewardAmount, setRewardAmount] = useState("0.1");
  const [priority, setPriority] = useState(3);
  const [tags, setTags] = useState([]);
  const [requiredGPU, setRequiredGPU] = useState(8000); // MB
  const [activeTasks, setActiveTasks] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [viewMode, setViewMode] = useState("create"); // 'create', 'browse', 'my-tasks'

  // useEffect hooks... (kept as is, logic is unchanged)
  useEffect(() => {
    checkWalletConnection();
    loadAvailableWorkers();
    loadAvailableTasks();
  }, []);

  useEffect(() => {
    if (walletConnected && currentAccount) {
      loadUserTasks();
    }
  }, [walletConnected, currentAccount]);

  // --- Functions (logic is unchanged, only UI interactions) ---

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

  const loadAvailableWorkers = async () => {
    const mockWorkers = [
      {
        id: "worker_001",
        address: "0x742d35Cc6634C0532925a3b8D6F6dE7c",
        model: "RTX 4090",
        vram: "24GB",
        compute: "83 TFLOPs",
        hourlyRate: "0.008",
        reputation: 95,
        uptime: "99.5%",
        location: "US West",
        status: "available",
      },
      {
        id: "worker_002",
        address: "0x8ba1f109551bD432803012645Hac136c",
        model: "RTX 4080",
        vram: "16GB",
        compute: "65 TFLOPs",
        hourlyRate: "0.006",
        reputation: 88,
        uptime: "98.1%",
        location: "EU Central",
        status: "available",
      },
      {
        id: "worker_003",
        address: "0x456def789abc123456789def456abc12",
        model: "RTX 3090",
        vram: "24GB",
        compute: "51 TFLOPs",
        hourlyRate: "0.005",
        reputation: 92,
        uptime: "97.8%",
        location: "Asia Pacific",
        status: "busy",
      },
    ];
    setAvailableWorkers(mockWorkers);
  };

  const loadAvailableTasks = async () => {
    try {
      const tasks = await blockchainService.getAvailableTasks(10);
      setAvailableTasks(tasks || []);
    } catch (error) {
      console.error("Failed to load available tasks:", error);
      setAvailableTasks([]);
    }
  };

  const loadUserTasks = async () => {
    try {
      const createdTasks = await blockchainService.getMyCreatedTasks();
      const active = createdTasks.filter((t) =>
        ["Available", "Assigned", "Completed"].includes(t.status)
      );
      const completed = createdTasks.filter((t) =>
        ["Verified", "Disputed"].includes(t.status)
      );
      setActiveTasks(active);
      setTaskHistory(completed);
    } catch (error) {
      console.error("Failed to load user tasks:", error);
    }
  };

  const createTask = async () => {
    if (!taskDescription || !rewardAmount) {
      setError("Please fill in task description and reward amount");
      return;
    }
    setLoading(true);
    try {
      if (parseFloat(balance) < parseFloat(rewardAmount))
        throw new Error("Insufficient balance");
      const hash = taskHash || `QmTask${Date.now()}`;
      const result = await blockchainService.createTask(
        hash,
        taskDuration,
        rewardAmount
      );
      setSuccess(`Task created successfully! Task ID: ${result.taskId}`);
      setTaskDescription("");
      setTaskHash("");
      setRewardAmount("0.1");
      await loadUserTasks();
      await loadAvailableTasks();
      await loadBalance();
    } catch (error) {
      setError(`Task creation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const verifyTask = async (taskId) => {
    setLoading(true);
    try {
      await blockchainService.verifyTask(taskId);
      setSuccess(`Task ${taskId} verified successfully!`);
      await loadUserTasks();
    } catch (error) {
      setError(`Task verification failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- UI Helper Functions ---

  const getRatingStars = (reputation) =>
    "⭐".repeat(Math.floor(Math.min(5, Math.max(1, (reputation / 100) * 5))));

  const getStatusStyle = (status) => {
    const styles = {
      Available: { backgroundColor: "#007bff", color: "#fff" },
      Assigned: { backgroundColor: "#ffc107", color: "#000" },
      Completed: { backgroundColor: "#17a2b8", color: "#fff" },
      Verified: { backgroundColor: "#28a745", color: "#fff" },
      Disputed: { backgroundColor: "#dc3545", color: "#fff" },
      busy: { backgroundColor: "#6c757d", color: "#fff" },
      available: { backgroundColor: "#28a745", color: "#fff" },
    };
    return styles[status] || styles["busy"];
  };

  // --- Render methods for different views ---

  const renderWalletConnector = () => (
    <div style={styles.walletConnectContainer}>
      <div style={{ ...styles.card, textAlign: "center", maxWidth: "500px" }}>
        <h2 style={styles.h2}>Connect Your Aptos Wallet</h2>
        <p style={styles.subtitle}>
          Get started on the decentralized GPU marketplace.
        </p>
        <button
          onClick={connectWallet}
          disabled={loading}
          style={{
            ...styles.button,
            ...styles.buttonPrimary,
            marginTop: "20px",
            width: "100%",
          }}
        >
          {loading ? "Connecting..." : "🔗 Connect Petra Wallet"}
        </button>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div style={styles.dashboard}>
      {/* Header & Wallet Info */}
      <div style={styles.topRow}>
        <div style={styles.header}>
          <h1 style={styles.h1}>🚀 GPU Compute Marketplace</h1>
          <p style={styles.subtitle}>
            Create, manage, and browse GPU tasks on the Aptos blockchain.
          </p>
        </div>
        <div style={{ ...styles.card, flexShrink: 0 }}>
          <h3 style={{ ...styles.h3, margin: 0, padding: 0, border: "none" }}>
            💰 Wallet
          </h3>
          <p style={styles.balance}>{balance} APT</p>
          <p style={styles.address}>
            {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav style={styles.navigation}>
        <button
          onClick={() => setViewMode("create")}
          style={
            viewMode === "create" ? styles.navButtonActive : styles.navButton
          }
        >
          📝 Create Task
        </button>
        <button
          onClick={() => setViewMode("browse")}
          style={
            viewMode === "browse" ? styles.navButtonActive : styles.navButton
          }
        >
          🔍 Browse Tasks
        </button>
        <button
          onClick={() => setViewMode("my-tasks")}
          style={
            viewMode === "my-tasks" ? styles.navButtonActive : styles.navButton
          }
        >
          📋 My Tasks
        </button>
      </nav>

      {/* Content Area */}
      <div style={styles.contentArea}>
        {viewMode === "create" && renderCreateTask()}
        {viewMode === "browse" && renderBrowseTasks()}
        {viewMode === "my-tasks" && renderMyTasks()}
      </div>

      {/* Available Workers (always visible for reference) */}
      <div style={{ marginTop: "40px" }}>
        <h2 style={styles.h2}>🖥️ Available GPU Workers</h2>
        <div style={styles.grid}>{availableWorkers.map(renderWorkerCard)}</div>
      </div>
    </div>
  );

  const renderCreateTask = () => (
    <div style={styles.card}>
      <h2 style={styles.h2}>New Compute Task</h2>
      <div style={styles.formGrid}>
        <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
          <label style={styles.label}>Task Description</label>
          <textarea
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="e.g., Render a 3D model, train a small neural network..."
            style={{ ...styles.input, height: "80px" }}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Reward Amount (APT)</label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={rewardAmount}
            onChange={(e) => setRewardAmount(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Deadline (Hours)</label>
          <input
            type="number"
            min="1"
            max="168"
            value={taskDuration}
            onChange={(e) => setTaskDuration(parseInt(e.target.value))}
            style={styles.input}
          />
        </div>
        <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
          <label style={styles.label}>Task Hash (Optional)</label>
          <input
            type="text"
            value={taskHash}
            onChange={(e) => setTaskHash(e.target.value)}
            placeholder="Auto-generated if left empty"
            style={styles.input}
          />
        </div>
      </div>
      <button
        onClick={createTask}
        disabled={loading || !taskDescription}
        style={{
          ...styles.button,
          ...styles.buttonPrimary,
          width: "100%",
          marginTop: "20px",
        }}
      >
        {loading ? "Creating Task..." : "Create Task on Aptos"}
      </button>
    </div>
  );

  const renderBrowseTasks = () => (
    <div>
      <h2 style={styles.h2}>Available Tasks on the Network</h2>
      <div style={styles.grid}>
        {availableTasks.length > 0 ? (
          availableTasks.map((id) =>
            renderTaskCard({ taskId: id, status: "Available" })
          )
        ) : (
          <p>No available tasks found.</p>
        )}
      </div>
    </div>
  );

  const renderMyTasks = () => (
    <div>
      <h2 style={styles.h2}>My Active Tasks</h2>
      <div style={styles.list}>
        {activeTasks.length > 0 ? (
          activeTasks.map(renderTaskCard)
        ) : (
          <p>You have no active tasks.</p>
        )}
      </div>
      <h2 style={{ ...styles.h2, marginTop: "30px" }}>
        Completed Task History
      </h2>
      <div style={styles.list}>
        {taskHistory.length > 0 ? (
          taskHistory.map(renderTaskCard)
        ) : (
          <p>No completed tasks in your history.</p>
        )}
      </div>
    </div>
  );

  const renderTaskCard = (task) => (
    <div key={task.taskId} style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={{ ...styles.h3, margin: 0, padding: 0, border: "none" }}>
          Task #{task.taskId}
        </h3>
        <span style={{ ...styles.statusBadge, ...getStatusStyle(task.status) }}>
          {task.status}
        </span>
      </div>
      {task.reward && <p style={styles.cardText}>Reward: {task.reward} APT</p>}
      {task.worker && (
        <p style={styles.cardText}>Worker: {task.worker.slice(0, 8)}...</p>
      )}
      <div style={{ marginTop: "16px" }}>
        {task.status === "Completed" && (
          <button
            onClick={() => verifyTask(task.taskId)}
            disabled={loading}
            style={{ ...styles.button, ...styles.buttonSuccess }}
          >
            ✅ Verify & Pay
          </button>
        )}
      </div>
    </div>
  );

  const renderWorkerCard = (worker) => (
    <div key={worker.id} style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={{ ...styles.h3, margin: 0, padding: 0, border: "none" }}>
          {worker.model}
        </h3>
        <span
          style={{ ...styles.statusBadge, ...getStatusStyle(worker.status) }}
        >
          {worker.status}
        </span>
      </div>
      <div style={styles.specGrid}>
        <span>VRAM</span>
        <span>{worker.vram}</span>
        <span>Compute</span>
        <span>{worker.compute}</span>
        <span>Reputation</span>
        <span>
          {getRatingStars(worker.reputation)} ({worker.reputation}%)
        </span>
      </div>
      <div style={styles.workerPrice}>{worker.hourlyRate} APT / hour</div>
    </div>
  );

  // --- Main Render ---

  return (
    <div style={styles.container}>
      {error && (
        <div style={{ ...styles.message, ...styles.error }}>{error}</div>
      )}
      {success && (
        <div style={{ ...styles.message, ...styles.success }}>{success}</div>
      )}

      {!walletConnected ? renderWalletConnector() : renderDashboard()}
    </div>
  );
};

// --- Styles Object ---
const styles = {
  // Layout & Container
  container: {
    fontFamily: "system-ui, sans-serif",
    color: "#e0e0e0",
    backgroundColor: "#121212",
    minHeight: "100vh",
    padding: "24px",
  },
  dashboard: { maxWidth: "1200px", margin: "0 auto" },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
    marginBottom: "24px",
  },
  contentArea: { marginTop: "24px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
  },
  list: { display: "flex", flexDirection: "column", gap: "16px" },

  // Typography
  h1: { margin: "0 0 8px 0", fontSize: "28px", fontWeight: 600, color: "#fff" },
  h2: {
    margin: "0 0 16px 0",
    fontSize: "22px",
    fontWeight: 500,
    color: "#f0f0f0",
    borderBottom: "1px solid #333",
    paddingBottom: "8px",
  },
  h3: {
    margin: "0 0 12px 0",
    fontSize: "18px",
    fontWeight: 500,
    color: "#e0e0e0",
  },
  subtitle: { margin: 0, color: "#a0a0a0", fontSize: "16px" },

  // Cards
  card: {
    backgroundColor: "#1e1e1e",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #333",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  cardText: { margin: "4px 0", color: "#a0a0a0" },

  // Wallet & Header
  header: { flex: 1 },
  balance: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#4dffb3",
    margin: "8px 0",
  },
  address: { fontFamily: "monospace", fontSize: "12px", color: "#888" },

  // Navigation
  navigation: {
    display: "flex",
    gap: "10px",
    backgroundColor: "#1e1e1e",
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid #333",
  },
  navButton: {
    flex: 1,
    padding: "10px 16px",
    backgroundColor: "transparent",
    border: "none",
    color: "#a0a0a0",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 500,
    transition: "background-color 0.2s, color 0.2s",
  },
  navButtonActive: {
    flex: 1,
    padding: "10px 16px",
    backgroundColor: "#007bff",
    border: "none",
    color: "#fff",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 500,
    transition: "background-color 0.2s, color 0.2s",
  },

  // Forms
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  formGroup: { display: "flex", flexDirection: "column" },
  label: { marginBottom: "6px", fontSize: "14px", color: "#a0a0a0" },
  input: {
    padding: "10px",
    backgroundColor: "#2c2c2c",
    border: "1px solid #444",
    borderRadius: "6px",
    color: "#e0e0e0",
    fontSize: "14px",
  },

  // Buttons
  button: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 500,
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  buttonPrimary: { backgroundColor: "#007bff", color: "#fff" },
  buttonSuccess: { backgroundColor: "#28a745", color: "#fff" },

  // Specific Components
  walletConnectContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "80vh",
  },
  statusBadge: {
    fontSize: "12px",
    fontWeight: "bold",
    padding: "4px 8px",
    borderRadius: "12px",
  },
  specGrid: {
    display: "grid",
    gridTemplateColumns: "100px 1fr",
    gap: "8px",
    fontSize: "14px",
    color: "#a0a0a0",
    margin: "16px 0",
  },
  workerPrice: {
    textAlign: "center",
    fontSize: "18px",
    fontWeight: "bold",
    color: "#4dffb3",
    backgroundColor: "#2a2a2a",
    padding: "10px",
    borderRadius: "6px",
    marginTop: "16px",
  },

  // Messages
  message: {
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "16px",
    textAlign: "center",
  },
  error: { backgroundColor: "#dc3545", color: "#fff" },
  success: { backgroundColor: "#28a745", color: "#fff" },
};

export default GPURequesterInterface;
