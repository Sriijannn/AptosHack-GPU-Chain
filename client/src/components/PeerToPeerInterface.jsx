import React, { useState, useEffect } from "react";
import {
  FaCircle,
  FaSignOutAlt,
  FaUser,
  FaMicrochip,
  FaChartLine,
} from "react-icons/fa";
import PeerManager from "../PeerManager"; // Assuming this service exists

// --- Main Component ---
function PeerToPeerInterface({ userEmail, onLogout }) {
  const [peerId, setPeerId] = useState("");
  const [connId, setConnId] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [peerManager, setPeerManager] = useState(null);
  const [tab, setTab] = useState(0); // 0 for Chat, 1 for Jobs
  const [selectedTask, setSelectedTask] = useState("matrix_multiplication");
  const [taskIntensity, setTaskIntensity] = useState(50);
  const [gpuLoad, setGpuLoad] = useState(0);
  const [gpuTemp, setGpuTemp] = useState(45);
  const [isRunningTask, setIsRunningTask] = useState(false);
  const [taskProgress, setTaskProgress] = useState(0);

  // --- Effects and Logic ---
  useEffect(() => {
    // Initialize PeerManager
    const pm = new PeerManager(handleJobResult);
    pm.onPeerId = setPeerId;
    setPeerManager(pm);
    pm.peer.on("connection", setupConnectionListeners);

    return () => {
      pm.peer.destroy();
    };
  }, []);

  const handleJobResult = (data) => {
    setMessages((msgs) => [
      ...msgs,
      {
        sender: "System",
        text: `✅ Job Result: ${data.result?.result || data.result}`,
      },
    ]);
  };

  const setupConnectionListeners = (conn) => {
    setIsConnected(true);
    conn.on("close", () => setIsConnected(false));
    conn.on("error", () => setIsConnected(false));
    conn.on("data", (data) => {
      const messageText =
        typeof data === "string"
          ? data
          : `📦 Data: ${JSON.stringify(data.result || data)}`;
      setMessages((msgs) => [...msgs, { sender: "Peer", text: messageText }]);
    });
  };

  const connectToPeer = () => {
    if (!connId || !peerManager) return;
    const conn = peerManager.connectToPeer(connId);
    if (conn) setupConnectionListeners(conn);
  };

  const sendMessage = () => {
    if (peerManager?.conn && input) {
      peerManager.conn.send(input);
      setMessages((msgs) => [...msgs, { sender: "You", text: input }]);
      setInput("");
    }
  };

  const sendJob = () => {
    if (!peerManager?.conn) return;
    setIsRunningTask(true);
    setMessages((msgs) => [
      ...msgs,
      { sender: "You", text: `Sent GPU task: ${selectedTask}` },
    ]);
    simulateGPUTask();
  };

  const simulateGPUTask = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setTaskProgress(progress);
      setGpuLoad(taskIntensity + Math.random() * 20 - 10);
      setGpuTemp(45 + (taskIntensity / 100) * 30 + Math.random() * 5);
      if (progress >= 100) {
        clearInterval(interval);
        setIsRunningTask(false);
        setTaskProgress(0);
        setGpuLoad(0);
      }
    }, 200);
  };

  const copyPeerId = () => {
    navigator.clipboard.writeText(peerId);
  };

  // --- Render methods for different UI parts ---

  const renderHeader = () => (
    <div style={styles.header}>
      <div style={styles.userInfo}>
        <FaUser style={{ color: "#2de27b" }} />
        <span>{userEmail}</span>
        <FaCircle
          color={isConnected ? "#28a745" : "#6c757d"}
          size={12}
          title={isConnected ? "Connected" : "Disconnected"}
        />
      </div>
      <button style={styles.logoutButton} onClick={onLogout}>
        <FaSignOutAlt />
      </button>
    </div>
  );

  const renderPeerId = () => (
    <div style={styles.peerIdBox}>
      <span style={styles.peerIdLabel}>Your Peer ID:</span>
      <span style={styles.peerIdValue}>{peerId || "..."}</span>
      <button style={styles.copyButton} onClick={copyPeerId}>
        📋
      </button>
    </div>
  );

  const renderChatPanel = () => (
    <div style={styles.panel}>
      <div style={styles.inputGroup}>
        <input
          style={styles.input}
          placeholder="Peer ID to connect"
          value={connId}
          onChange={(e) => setConnId(e.target.value)}
        />
        <button
          style={{ ...styles.button, flexShrink: 0 }}
          onClick={connectToPeer}
        >
          Connect
        </button>
      </div>
      <div style={styles.chatBox}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              ...styles.chatMessage,
              textAlign: msg.sender === "You" ? "right" : "left",
            }}
          >
            <span
              style={{
                ...styles.messageBubble,
                ...(msg.sender === "You"
                  ? styles.myMessage
                  : styles.peerMessage),
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>
      <div style={styles.inputGroup}>
        <input
          style={styles.input}
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          style={{ ...styles.button, flexShrink: 0 }}
          onClick={sendMessage}
          disabled={!isConnected || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );

  const renderJobPanel = () => (
    <div style={styles.panel}>
      <div style={styles.formGroup}>
        <label style={styles.label}>GPU Task</label>
        <select
          style={styles.input}
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
        >
          <option value="matrix_multiplication">Matrix Multiplication</option>
          <option value="image_processing">Image Processing</option>
          <option value="neural_network">Neural Network</option>
        </select>
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Task Intensity: {taskIntensity}%</label>
        <input
          type="range"
          min="10"
          max="100"
          value={taskIntensity}
          onChange={(e) => setTaskIntensity(Number(e.target.value))}
          style={styles.slider}
        />
      </div>
      <button
        onClick={sendJob}
        disabled={isRunningTask || !isConnected}
        style={{
          ...styles.button,
          ...styles.buttonPrimary,
          ...(isRunningTask && styles.buttonDisabled),
        }}
      >
        <FaMicrochip style={{ marginRight: 8 }} />
        {isRunningTask ? "Running Task..." : "Start GPU Task"}
      </button>
      {(isRunningTask || gpuLoad > 5) && renderGpuMonitor()}
    </div>
  );

  const renderGpuMonitor = () => (
    <div style={styles.monitor}>
      <h3 style={styles.h3}>
        <FaChartLine style={{ color: "#2de27b" }} /> GPU Monitor
      </h3>
      <div style={styles.statItem}>
        <span style={styles.label}>Load</span>
        <div style={styles.statBar}>
          <div style={{ ...styles.statFill, width: `${gpuLoad}%` }} />
        </div>
        <span style={styles.statValue}>{Math.round(gpuLoad)}%</span>
      </div>
      <div style={styles.statItem}>
        <span style={styles.label}>Temp</span>
        <div style={styles.statBar}>
          <div
            style={{
              ...styles.statFill,
              width: `${Math.min(100, (gpuTemp - 30) * 1.5)}%`,
              backgroundColor: "#ffc107",
            }}
          />
        </div>
        <span style={styles.statValue}>{Math.round(gpuTemp)}°C</span>
      </div>
      {isRunningTask && (
        <div style={styles.statItem}>
          <span style={styles.label}>Progress</span>
          <div style={styles.statBar}>
            <div
              style={{
                ...styles.statFill,
                width: `${taskProgress}%`,
                backgroundColor: "#17a2b8",
              }}
            />
          </div>
          <span style={styles.statValue}>{Math.round(taskProgress)}%</span>
        </div>
      )}
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {renderHeader()}
        {renderPeerId()}

        <div style={styles.tabContainer}>
          <button
            style={tab === 0 ? styles.tabButtonActive : styles.tabButton}
            onClick={() => setTab(0)}
          >
            Peer Chat
          </button>
          <button
            style={tab === 1 ? styles.tabButtonActive : styles.tabButton}
            onClick={() => setTab(1)}
          >
            Send Job
          </button>
        </div>

        {tab === 0 ? renderChatPanel() : renderJobPanel()}
      </div>
    </div>
  );
}

// --- Styles Object ---
const styles = {
  // Layout & Container
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "92vh",
    background: "#121212",
    padding: "20px",
  },
  card: {
    background: "#1e1e1e",
    color: "#e0e0e0",
    borderRadius: "12px",
    border: "1px solid #333",
    padding: "24px",
    width: "100%",
    maxWidth: "650px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "500",
  },
  panel: { display: "flex", flexDirection: "column", gap: "16px" },

  // Typography & Text
  h3: {
    margin: "0 0 12px 0",
    fontSize: "16px",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  label: { marginBottom: "6px", fontSize: "14px", color: "#a0a0a0" },

  // Buttons
  button: {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "600",
    border: "1px solid #444",
    borderRadius: "6px",
    cursor: "pointer",
    backgroundColor: "#333",
    color: "#fff",
    transition: "background-color 0.2s",
  },
  buttonPrimary: { backgroundColor: "#007bff", borderColor: "#007bff" },
  buttonDisabled: { opacity: 0.5, cursor: "not-allowed" },
  logoutButton: {
    background: "none",
    border: "none",
    color: "#dc3545",
    cursor: "pointer",
    fontSize: "20px",
  },
  copyButton: {
    background: "none",
    border: "none",
    color: "#a0a0a0",
    cursor: "pointer",
    fontSize: "16px",
  },

  // Inputs & Forms
  input: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#2c2c2c",
    border: "1px solid #444",
    borderRadius: "6px",
    color: "#e0e0e0",
    fontSize: "14px",
  },
  inputGroup: { display: "flex", gap: "10px" },
  formGroup: { display: "flex", flexDirection: "column" },
  slider: { width: "100%", cursor: "pointer" },

  // Peer ID
  peerIdBox: {
    backgroundColor: "#2a2a2a",
    padding: "8px 12px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  peerIdLabel: { color: "#a0a0a0", fontSize: "12px" },
  peerIdValue: { fontFamily: "monospace", color: "#2de27b" },

  // Tabs
  tabContainer: {
    display: "flex",
    background: "#2a2a2a",
    borderRadius: "8px",
    padding: "4px",
  },
  tabButton: {
    flex: 1,
    padding: "8px",
    background: "transparent",
    border: "none",
    color: "#a0a0a0",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },
  tabButtonActive: {
    flex: 1,
    padding: "8px",
    background: "#007bff",
    border: "none",
    color: "#fff",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  // Chat
  chatBox: {
    height: "200px",
    overflowY: "auto",
    backgroundColor: "#2a2a2a",
    padding: "10px",
    borderRadius: "6px",
  },
  chatMessage: { marginBottom: "8px" },
  messageBubble: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: "12px",
    maxWidth: "80%",
  },
  myMessage: {
    background: "#007bff",
    color: "#fff",
    borderBottomRightRadius: "4px",
  },
  peerMessage: {
    background: "#444",
    color: "#fff",
    borderBottomLeftRadius: "4px",
  },

  // GPU Monitor
  monitor: {
    marginTop: "20px",
    backgroundColor: "#2a2a2a",
    padding: "16px",
    borderRadius: "6px",
  },
  statItem: {
    display: "grid",
    gridTemplateColumns: "60px 1fr 50px",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  statBar: {
    height: "16px",
    backgroundColor: "#333",
    borderRadius: "8px",
    overflow: "hidden",
  },
  statFill: {
    height: "100%",
    backgroundColor: "#28a745",
    borderRadius: "8px",
    transition: "width 0.2s",
  },
  statValue: { textAlign: "right", fontFamily: "monospace", fontSize: "14px" },
};

export default PeerToPeerInterface;
