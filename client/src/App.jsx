import React, { useState } from "react";
import HomePage from './components/HomePage';
import AuthPage from './components/AuthPage';
import PeerToPeerInterface from './components/PeerToPeerInterface';
import BlockchainTest from './components/BlockchainTest';
import GameGPUInterface from './components/GameGPUInterface';
import GPUWorkerInterface from './components/GPUWorkerInterface';
import GPURequesterInterface from './components/GPURequesterInterface';
import "./style.css";

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
    setPage("p2p");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail("");
    setPage("home");
  };

  const handleBackToHome = () => {
    setPage("home");
  };
  const handleGoToBlockchain = () => {
    setPage("blockchain");
  };
  const handleGoToGameGPU = () => {
    setPage("game-gpu");
  };

  const handleGoToGPUWorker = () => {
    setPage("gpu-worker");
  };

  const handleGoToGPURequester = () => {
    setPage("gpu-requester");
  };

  const renderPage = () => {
    switch (page) {
      case "auth":
        return (
          <AuthPage
            activeTab={authTab}
            onTabChange={setAuthTab}
            onLoginSuccess={handleLoginSuccess}
            onBackToHome={handleBackToHome}
          />
        );
      case "p2p":        return (
          <PeerToPeerInterface
            userEmail={userEmail}
            onLogout={handleLogout}
            onGoToBlockchain={handleGoToBlockchain}
            onGoToGameGPU={handleGoToGameGPU}
          />
        );      case "game-gpu":
        return <GameGPUInterface />;
      case "gpu-worker":
        return <GPUWorkerInterface userEmail={userEmail} peerId="test-peer-id" />;
      case "gpu-requester":
        return <GPURequesterInterface userEmail={userEmail} />;
      case "blockchain":
        return <BlockchainTest />;
      default:        return (
          <HomePage
            onAuth={handleAuth}
            onGoToBlockchain={handleGoToBlockchain}
            onGoToGameGPU={handleGoToGameGPU}
            onGoToGPUWorker={handleGoToGPUWorker}
            onGoToGPURequester={handleGoToGPURequester}
          />
        );
    }
  };

  return <div className="App">{renderPage()}</div>;
}

export default App;
