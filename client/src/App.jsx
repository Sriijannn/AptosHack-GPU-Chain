import React, { useState } from "react";
import HomePage from "./components/HomePage";
import AuthPage from "./components/AuthPage";
import PeerToPeerInterface from "./components/PeerToPeerInterface";
import BlockchainTest from "./components/BlockchainTest";
import GameGPUInterface from "./components/GameGPUInterface";
import GPUWorkerInterface from "./components/GPUWorkerInterface";
import GPURequesterInterface from "./components/GPURequesterInterface";
import { FaUser, FaSignOutAlt, FaCubes } from "react-icons/fa";

// --- Redesigned Navigation Header ---
const NavigationHeader = ({
  currentPage,
  onPageChange,
  isLoggedIn,
  userEmail,
  onLogout,
}) => {
  // State to manage hover effects
  const [hoveredLink, setHoveredLink] = useState(null);
  const [isHomeHovered, setIsHomeHovered] = useState(false);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);

  // Don't show nav on home or auth pages
  if (currentPage === "home" || currentPage === "auth") {
    return null;
  }

  const navItems = [
    { key: "p2p", label: "P2P" },
    { key: "gpu-worker", label: "Worker" },
    { key: "gpu-requester", label: "Requester" },
    { key: "game-gpu", label: "Gaming" },
    { key: "blockchain", label: "Blockchain" },
  ];

  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        {/* Left side - Home Button */}
        <button
          onClick={() => onPageChange("home")}
          style={
            isHomeHovered
              ? { ...styles.homeButton, ...styles.homeButtonHover }
              : styles.homeButton
          }
          onMouseEnter={() => setIsHomeHovered(true)}
          onMouseLeave={() => setIsHomeHovered(false)}
        >
          <FaCubes style={{ marginRight: "8px" }} /> GPU Share
        </button>

        {/* Center - Main Navigation */}
        <nav style={styles.nav}>
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onPageChange(key)}
              style={
                currentPage === key
                  ? styles.navLinkActive
                  : hoveredLink === key
                  ? { ...styles.navLink, ...styles.navLinkHover }
                  : styles.navLink
              }
              onMouseEnter={() => setHoveredLink(key)}
              onMouseLeave={() => setHoveredLink(null)}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Right side - User info */}
        <div style={styles.userSection}>
          {isLoggedIn && (
            <>
              <span style={styles.userEmail}>
                <FaUser style={{ marginRight: "8px" }} />
                {userEmail ? userEmail.split("@")[0] : "User"}
              </span>
              <button
                onClick={onLogout}
                style={
                  isLogoutHovered
                    ? { ...styles.logoutButton, ...styles.logoutButtonHover }
                    : styles.logoutButton
                }
                onMouseEnter={() => setIsLogoutHovered(true)}
                onMouseLeave={() => setIsLogoutHovered(false)}
              >
                <FaSignOutAlt />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

// --- Main App Component ---
function App() {
  const [page, setPage] = useState("home");
  const [authTab, setAuthTab] = useState("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const handleAuth = (tab) => {
    setAuthTab(tab);
    setPage("auth");
  };

  const handleLoginSuccess = (email) => {
    setIsLoggedIn(true);
    setUserEmail(email);
    setPage("p2p"); // Default page after login
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail("");
    setPage("home");
  };

  const renderPage = () => {
    // Add padding to pages that have the fixed header
    const pageStyle =
      page !== "home" && page !== "auth" ? { paddingTop: "65px" } : {};

    switch (page) {
      case "auth":
        return (
          <AuthPage
            onLoginSuccess={handleLoginSuccess}
            onBack={() => setPage("home")}
          />
        );
      case "p2p":
        return (
          <div style={pageStyle}>
            <PeerToPeerInterface
              userEmail={userEmail}
              onLogout={handleLogout}
            />
          </div>
        );
      case "game-gpu":
        return (
          <div style={pageStyle}>
            <GameGPUInterface />
          </div>
        );
      case "gpu-worker":
        return (
          <div style={pageStyle}>
            <GPUWorkerInterface userEmail={userEmail} peerId="test-peer-id" />
          </div>
        );
      case "gpu-requester":
        return (
          <div style={pageStyle}>
            <GPURequesterInterface userEmail={userEmail} />
          </div>
        );
      case "blockchain":
        return (
          <div style={pageStyle}>
            <BlockchainTest />
          </div>
        );
      default:
        return (
          <HomePage
            onAuth={handleAuth}
            onGoToGPURequester={() => setPage("gpu-requester")}
            onGoToGPUWorker={() => setPage("gpu-worker")}
            onGoToGameGPU={() => setPage("game-gpu")}
          />
        );
    }
  };

  return (
    <div>
      <NavigationHeader
        currentPage={page}
        onPageChange={setPage}
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
        onLogout={handleLogout}
      />
      {renderPage()}
    </div>
  );
}

// --- Styles Object for Navigation ---
const styles = {
  header: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    background: "#1e1e1e",
    padding: "0 24px",
    zIndex: 1000,
    borderBottom: "1px solid #333",
    height: "65px",
  },
  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: "1200px",
    margin: "0 auto",
    height: "100%",
  },
  homeButton: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "20px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "opacity 0.2s",
  },
  homeButtonHover: {
    opacity: 0.8,
  },
  nav: {
    display: "flex",
    gap: "10px",
  },
  navLink: {
    background: "none",
    border: "none",
    color: "#a0a0a0",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "500",
    transition: "background-color 0.2s, color 0.2s",
  },
  navLinkHover: {
    background: "#333",
    color: "#fff",
  },
  navLinkActive: {
    background: "#007bff",
    border: "none",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "500",
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  userEmail: {
    color: "#a0a0a0",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
  },
  logoutButton: {
    background: "none",
    border: "none",
    color: "#a0a0a0",
    cursor: "pointer",
    fontSize: "18px",
    padding: "8px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s, color 0.2s",
  },
  logoutButtonHover: {
    background: "#333",
    color: "#fff",
  },
};

export default App;
