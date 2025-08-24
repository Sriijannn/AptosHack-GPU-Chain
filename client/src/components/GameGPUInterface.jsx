import React, { useState, useEffect, useRef } from "react";
import GameGPUManager from "../GameGPUManager";
import PeerManager from "../PeerManager";

// --- Main Component ---
const GameGPUInterface = () => {
  const [gameGPUManager, setGameGPUManager] = useState(null);
  const [peerManager, setPeerManager] = useState(null);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [isConnectedToNetwork, setIsConnectedToNetwork] = useState(false);
  const [myPeerId, setMyPeerId] = useState("");
  const [peerInputValue, setPeerInputValue] = useState("");
  const [renderStats, setRenderStats] = useState({
    fps: 0,
    frameTime: 0,
    peersUsed: 0,
    totalFrames: 0,
  });
  const [gameScene, setGameScene] = useState({
    objects: [],
    lighting: { ambient: 0.3, directional: { intensity: 0.8 } },
    camera: { position: { x: 0, y: 0, z: 5 } },
  });
  const [loadBalancingEnabled, setLoadBalancingEnabled] = useState(true);
  const [renderQuality, setRenderQuality] = useState("high");
  const [currentFrame, setCurrentFrame] = useState(null);
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);

  useEffect(() => {
    const gpm = new GameGPUManager();
    const pm = new PeerManager(
      (data) => handleGameRenderResult(data),
      (peerId, status) => handlePeerConnected(peerId, status),
      (peerId) => handlePeerDisconnected(peerId)
    );

    pm.setPeerIdCallback((id) => {
      setMyPeerId(id);
      console.log("My Peer ID:", id);
    });

    setGameGPUManager(gpm);
    setPeerManager(pm);

    initializeGameScene();
  }, []);

  const initializeGameScene = () => {
    const sampleObjects = [
      {
        id: "cube1",
        position: { x: -100, y: 0, z: 0 },
        size: { width: 80, height: 80 },
        color: { r: 1.0, g: 0.3, b: 0.3 },
        type: "cube",
      },
      {
        id: "sphere1",
        position: { x: 100, y: -50, z: 0 },
        size: { width: 60, height: 60 },
        color: { r: 0.3, g: 1.0, b: 0.3 },
        type: "sphere",
      },
      {
        id: "triangle1",
        position: { x: 0, y: 100, z: 0 },
        size: { width: 70, height: 70 },
        color: { r: 0.3, g: 0.3, b: 1.0 },
        type: "triangle",
      },
    ];
    setGameScene((prev) => ({ ...prev, objects: sampleObjects }));
  };

  const handlePeerConnected = (peerId, status) => {
    console.log("Peer connected:", peerId, status);
    setConnectedPeers((prev) => {
      const existingPeer = prev.find((p) => p.id === peerId);
      if (existingPeer) {
        return prev.map((p) =>
          p.id === peerId ? { ...p, status: "connected" } : p
        );
      } else {
        return [
          ...prev,
          {
            id: peerId,
            status: "connected",
            gpuLoad: 0,
            latency: 0,
            framesRendered: 0,
          },
        ];
      }
    });
    setIsConnectedToNetwork(true);
    if (gameGPUManager && peerManager) {
      const conn = peerManager.connections.get(peerId);
      if (conn) {
        gameGPUManager.addPeer(peerId, conn, {
          gpuScore: 0.8,
          vram: "8GB",
          architecture: "CUDA",
        });
      }
    }
  };

  const handlePeerDisconnected = (peerId) => {
    console.log("Peer disconnected:", peerId);
    setConnectedPeers((prev) => {
      const filtered = prev.filter((peer) => peer.id !== peerId);
      if (filtered.length === 0) setIsConnectedToNetwork(false);
      return filtered;
    });
    if (gameGPUManager) gameGPUManager.removePeer(peerId);
  };

  const connectGamePeer = () => {
    if (
      !peerInputValue.trim() ||
      peerInputValue === myPeerId ||
      (peerManager && peerManager.isConnectedToPeer(peerInputValue))
    ) {
      alert(
        !peerInputValue.trim()
          ? "Please enter a valid Peer ID"
          : peerInputValue === myPeerId
          ? "Cannot connect to your own Peer ID"
          : "Already connected to this peer"
      );
      return;
    }
    setConnectedPeers((prev) => {
      if (!prev.find((p) => p.id === peerInputValue)) {
        return [
          ...prev,
          {
            id: peerInputValue,
            status: "connecting",
            gpuLoad: 0,
            latency: 0,
            framesRendered: 0,
          },
        ];
      }
      return prev;
    });
    peerManager.connectToPeer(peerInputValue);
    setPeerInputValue("");
  };

  const copyPeerIdToClipboard = () => {
    navigator.clipboard
      .writeText(myPeerId)
      .then(() => {
        alert("Peer ID copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy Peer ID:", err);
      });
  };

  const startDistributedGame = async () => {
    if (!gameGPUManager || connectedPeers.length === 0) {
      alert("No GPU peers connected! Connect to at least one peer first.");
      return;
    }
    setIsGameRunning(true);
    setRenderStats((prev) => ({ ...prev, totalFrames: 0 }));
    gameLoopRef.current = setInterval(renderGameFrame, 1000 / 60);
  };

  const stopDistributedGame = () => {
    setIsGameRunning(false);
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  };

  const renderGameFrame = async () => {
    if (!gameGPUManager || !isGameRunning) return;
    const frameStart = performance.now();
    try {
      const gameData = {
        scene: gameScene,
        camera: gameScene.camera,
        lighting: gameScene.lighting,
        objects: gameScene.objects,
        shaders: ["vertex_standard", "fragment_pbr"],
        targetFPS: 60,
        resolution: { width: 800, height: 600 },
      };
      const renderResult = await gameGPUManager.offloadGameRendering(gameData);
      if (renderResult.combinedFrame) {
        setCurrentFrame(renderResult.combinedFrame);
        displayFrameOnCanvas(renderResult.combinedFrame);
      }
      const frameTime = performance.now() - frameStart;
      setRenderStats((prev) => ({
        fps: Math.round(1000 / frameTime),
        frameTime: Math.round(frameTime),
        peersUsed: renderResult.peersUsed,
        totalFrames: prev.totalFrames + 1,
      }));
      animateGameObjects();
    } catch (error) {
      console.error("Distributed rendering failed:", error);
    }
  };

  const animateGameObjects = () => {
    setGameScene((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) => ({
        ...obj,
        position: {
          ...obj.position,
          x: obj.position.x + Math.sin(Date.now() / 1000 + obj.id.length) * 2,
          y: obj.position.y + Math.cos(Date.now() / 1000 + obj.id.length) * 1,
        },
      })),
    }));
  };

  const displayFrameOnCanvas = (frameData) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = frameData;
    }
  };

  const handleGameRenderResult = (data) => {
    if (data.result && data.result.frameData) {
      console.log("Received rendered frame from peer:", data.result);
    }
  };

  const testSingleFrameRender = async () => {
    if (connectedPeers.length === 0) {
      alert("No peers connected for testing");
      return;
    }
    const testPayload = {
      operation: "render_frame",
      viewport: { x: 0, y: 0, width: 400, height: 300 },
      scene: gameScene,
      objects: gameScene.objects.slice(0, 2),
      quality: renderQuality,
    };
    const peer = connectedPeers[0];
    if (peerManager && peerManager.isConnectedToPeer(peer.id)) {
      peerManager.sendJob(
        {
          type: "game_render",
          taskId: `test_${Date.now()}`,
          renderData: testPayload,
          jobId: `test_render_${Date.now()}`,
        },
        peer.id
      );
      console.log("Test render job sent to peer:", peer.id);
    } else {
      alert("Peer connection not available");
    }
  };

  // --- JSX Structure ---
  return (
    <div style={styles.container}>
      {/* Left Panel: Controls */}
      <div style={styles.controlsPanel}>
        <div style={styles.header}>
          <h1 style={styles.h1}>🎮 Distributed GPU Gaming</h1>
          <p style={styles.subtitle}>
            Leverage peer GPUs for enhanced gaming performance
          </p>
        </div>

        {/* My Peer ID */}
        <div style={styles.card}>
          <h3 style={styles.h3}>Your Peer ID</h3>
          {myPeerId ? (
            <div style={styles.peerIdContainer}>
              <span style={styles.peerIdText}>{myPeerId}</span>
              <button style={styles.copyButton} onClick={copyPeerIdToClipboard}>
                📋 Copy
              </button>
            </div>
          ) : (
            <p>🔄 Generating Peer ID...</p>
          )}
        </div>

        {/* Connection Management */}
        <div style={styles.card}>
          <h3 style={styles.h3}>Connect to a Peer</h3>
          <div style={styles.inputGroup}>
            <input
              type="text"
              placeholder="Enter friend's Peer ID"
              value={peerInputValue}
              onChange={(e) => setPeerInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && connectGamePeer()}
              style={styles.input}
            />
            <button
              onClick={connectGamePeer}
              disabled={!peerInputValue.trim()}
              style={{
                ...styles.button,
                ...(!peerInputValue.trim() && styles.buttonDisabled),
              }}
            >
              🔗 Connect
            </button>
          </div>
        </div>

        {/* Connected Peers List */}
        <div style={styles.card}>
          <h3 style={styles.h3}>
            Connected Peers ({connectedPeers.length})
            <span
              style={{
                ...styles.statusTag,
                backgroundColor: isConnectedToNetwork ? "#28a745" : "#dc3545",
              }}
            >
              {isConnectedToNetwork ? "ONLINE" : "OFFLINE"}
            </span>
          </h3>
          <div style={styles.peerList}>
            {connectedPeers.length === 0 ? (
              <p style={styles.smallText}>
                No peers connected. Enter an ID above to start.
              </p>
            ) : (
              connectedPeers.map((peer) => (
                <div key={peer.id} style={styles.peerCard}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        ...styles.statusDot,
                        backgroundColor:
                          peer.status === "connected" ? "#28a745" : "#ffc107",
                      }}
                    ></span>
                    <span style={{ fontFamily: "monospace" }}>
                      {peer.id.substring(0, 12)}...
                    </span>
                  </div>
                  <span style={styles.peerStatus}>{peer.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Game Actions & Settings */}
        <div style={styles.card}>
          <h3 style={styles.h3}>Game Controls</h3>
          <div style={styles.buttonGroup}>
            <button
              onClick={startDistributedGame}
              disabled={isGameRunning || connectedPeers.length === 0}
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                ...((isGameRunning || connectedPeers.length === 0) &&
                  styles.buttonDisabled),
              }}
            >
              🚀 Start Game
            </button>
            <button
              onClick={stopDistributedGame}
              disabled={!isGameRunning}
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
                ...(!isGameRunning && styles.buttonDisabled),
              }}
            >
              ⏹️ Stop Game
            </button>
          </div>
          <button
            onClick={testSingleFrameRender}
            disabled={connectedPeers.length === 0}
            style={{
              ...styles.button,
              marginTop: "10px",
              width: "100%",
              ...styles.buttonTertiary,
              ...(connectedPeers.length === 0 && styles.buttonDisabled),
            }}
          >
            🧪 Test Single Frame Render
          </button>
        </div>
      </div>

      {/* Right Panel: Display & Stats */}
      <div style={styles.displayPanel}>
        {/* Canvas */}
        <div style={styles.canvasContainer}>
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            style={styles.canvas}
          />
          {!currentFrame && (
            <div style={styles.canvasOverlay}>
              <p>
                Connect to peers and start the game to see the distributed
                render.
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={styles.statsContainer}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>FPS</span>
            <span style={styles.statValue}>{renderStats.fps}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Frame Time</span>
            <span style={styles.statValue}>{renderStats.frameTime}ms</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Peers Used</span>
            <span style={styles.statValue}>{renderStats.peersUsed}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Total Frames</span>
            <span style={styles.statValue}>{renderStats.totalFrames}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Styles Object ---
const styles = {
  // Layout
  container: {
    display: "flex",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: "#e0e0e0",
    backgroundColor: "#121212",
    minHeight: "100vh",
    padding: "24px",
    gap: "24px",
  },
  controlsPanel: {
    flex: 1,
    minWidth: "400px",
    maxWidth: "500px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  displayPanel: {
    flex: 3,
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  // Typography
  header: {
    marginBottom: "10px",
  },
  h1: {
    margin: "0 0 8px 0",
    fontSize: "28px",
    fontWeight: 600,
    color: "#ffffff",
  },
  subtitle: {
    margin: 0,
    color: "#a0a0a0",
    fontSize: "16px",
  },
  h3: {
    margin: "0 0 16px 0",
    fontSize: "18px",
    fontWeight: 500,
    color: "#f0f0f0",
    borderBottom: "1px solid #333",
    paddingBottom: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  smallText: {
    fontSize: "14px",
    color: "#888",
  },
  // Cards & Sections
  card: {
    backgroundColor: "#1e1e1e",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #333",
  },
  // Buttons
  button: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 500,
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.2s, opacity 0.2s",
    color: "#ffffff",
    backgroundColor: "#333",
    border: "1px solid #555",
  },
  buttonPrimary: {
    backgroundColor: "#007bff",
    border: "1px solid #007bff",
  },
  buttonSecondary: {
    backgroundColor: "#dc3545",
    border: "1px solid #dc3545",
  },
  buttonTertiary: {
    backgroundColor: "#17a2b8",
    border: "1px solid #17a2b8",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  copyButton: {
    padding: "6px 12px",
    fontSize: "12px",
    backgroundColor: "#444",
    border: "1px solid #666",
    borderRadius: "5px",
    color: "#e0e0e0",
    cursor: "pointer",
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
  },
  // Inputs
  inputGroup: {
    display: "flex",
    gap: "10px",
  },
  input: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#2c2c2c",
    border: "1px solid #444",
    borderRadius: "6px",
    color: "#e0e0e0",
    fontSize: "14px",
  },
  // Peer ID Section
  peerIdContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2c2c2c",
    padding: "8px 12px",
    borderRadius: "6px",
  },
  peerIdText: {
    fontFamily: "monospace",
    fontSize: "14px",
    color: "#a0e0ff",
  },
  // Peer List
  peerList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxHeight: "200px",
    overflowY: "auto",
  },
  peerCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    backgroundColor: "#2a2a2a",
    borderRadius: "4px",
  },
  peerStatus: {
    fontSize: "12px",
    fontWeight: "bold",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "#444",
    color: "#ccc",
  },
  statusTag: {
    fontSize: "12px",
    fontWeight: "bold",
    padding: "4px 8px",
    borderRadius: "12px",
    color: "#fff",
  },
  statusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },
  // Display & Canvas
  canvasContainer: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: "8px",
    position: "relative",
    overflow: "hidden",
    border: "1px solid #333",
  },
  canvas: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
  },
  canvasOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    padding: "20px",
    color: "#777",
  },
  // Stats
  statsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
    backgroundColor: "#1e1e1e",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #333",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px",
    backgroundColor: "#2a2a2a",
    borderRadius: "6px",
  },
  statLabel: {
    fontSize: "14px",
    color: "#a0a0a0",
    marginBottom: "4px",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#ffffff",
  },
};

export default GameGPUInterface;
