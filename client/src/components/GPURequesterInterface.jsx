import React, { useState, useEffect } from 'react';
import { blockchainService } from '../utils/blockchain';
import './GPURequesterInterface.css';

const GPURequesterInterface = ({ userEmail }) => {
  // Wallet state
  const [walletConnected, setWalletConnected] = useState(false);
  const [currentAccount, setCurrentAccount] = useState("");
  const [balance, setBalance] = useState("0");

  // GPU marketplace state
  const [availableGPUs, setAvailableGPUs] = useState([]);
  const [selectedGPU, setSelectedGPU] = useState(null);
  const [rentalDuration, setRentalDuration] = useState(1); // hours
  const [totalCost, setTotalCost] = useState("0");

  // User's rentals
  const [activeRentals, setActiveRentals] = useState([]);
  const [rentalHistory, setRentalHistory] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showRentalModal, setShowRentalModal] = useState(false);

  useEffect(() => {
    checkWalletConnection();
    loadAvailableGPUs();
  }, []);

  useEffect(() => {
    if (walletConnected && currentAccount) {
      loadUserRentals();
    }
  }, [walletConnected, currentAccount]);

  useEffect(() => {
    if (selectedGPU && rentalDuration) {
      const cost = parseFloat(selectedGPU.hourlyRate) * rentalDuration;
      setTotalCost(cost.toFixed(6));
    }
  }, [selectedGPU, rentalDuration]);

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

  const loadAvailableGPUs = async () => {
    // Mock data - would be loaded from blockchain
    const mockGPUs = [
      {
        id: "gpu_001",
        owner: "0x742d35Cc6634C0532925a3b8D6F6dE7c",
        model: "RTX 4090",
        vram: "24GB",
        compute: "83.0 TFLOPs",
        hourlyRate: "0.008",
        rating: 4.9,
        uptime: "99.5%",
        location: "US West",
        status: "available"
      },
      {
        id: "gpu_002",
        owner: "0x8ba1f109551bD432803012645Hac136c",
        model: "RTX 4080",
        vram: "16GB", 
        compute: "65.2 TFLOPs",
        hourlyRate: "0.006",
        rating: 4.8,
        uptime: "98.1%",
        location: "EU Central",
        status: "available"
      },
      {
        id: "gpu_003",
        owner: "0x456def789abc123456789def456abc12",
        model: "RTX 3090",
        vram: "24GB",
        compute: "51.2 TFLOPs",
        hourlyRate: "0.005",
        rating: 4.7,
        uptime: "97.8%",
        location: "Asia Pacific",
        status: "available"
      }
    ];
    setAvailableGPUs(mockGPUs);
  };

  const loadUserRentals = async () => {
    // Mock data - would be loaded from blockchain
    setActiveRentals([
      {
        id: "rental_001",
        gpuId: "gpu_001",
        model: "RTX 4090",
        startTime: Date.now() - 3600000,
        duration: 2,
        cost: "0.016",
        status: "active"
      }
    ]);

    setRentalHistory([
      {
        id: "rental_000",
        gpuId: "gpu_002",
        model: "RTX 4080",
        duration: 4,
        cost: "0.024",
        status: "completed",
        rating: 5
      }
    ]);
  };

  const rentGPU = async () => {
    if (!selectedGPU) return;

    try {
      setLoading(true);
      setError("");
      
      // Check balance
      if (parseFloat(balance) < parseFloat(totalCost)) {
        throw new Error("Insufficient balance");
      }

      // This would be implemented in the smart contract
      // await blockchainService.rentGPU(selectedGPU.id, rentalDuration, totalCost);
      
      setSuccess(`GPU rented successfully! Duration: ${rentalDuration}h, Cost: ${totalCost} ETH`);
      setShowRentalModal(false);
      setSelectedGPU(null);
      setRentalDuration(1);
      
      // Reload user rentals
      await loadUserRentals();
      
      setTimeout(() => setSuccess(""), 5000);
      
    } catch (error) {
      setError(`Rental failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const terminateRental = async (rentalId) => {
    try {
      setLoading(true);
      setError("");
      
      // This would be implemented in the smart contract
      // await blockchainService.terminateRental(rentalId);
      
      setSuccess("Rental terminated successfully!");
      await loadUserRentals();
      
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (error) {
      setError(`Failed to terminate rental: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getRatingStars = (rating) => {
    return "⭐".repeat(Math.floor(rating)) + (rating % 1 !== 0 ? "⭐" : "");
  };

  return (
    <div className="gpu-requester-interface">
      <div className="requester-header">
        <h2>🚀 GPU Rental Marketplace</h2>
        <p>Rent powerful GPUs for your compute-intensive tasks</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {!walletConnected ? (
        <div className="wallet-connection">
          <div className="connection-card">
            <h3>Connect Your Wallet</h3>
            <p>Connect your wallet to rent GPU computing power</p>
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
        <div className="requester-dashboard">
          {/* Wallet Info */}
          <div className="wallet-info">
            <div className="wallet-card">
              <h3>💰 Wallet Balance</h3>
              <div className="balance-display">
                <span className="balance-amount">{balance} ETH</span>
                <span className="wallet-address">{currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}</span>
              </div>
            </div>
          </div>

          {/* Available GPUs */}
          <div className="gpu-marketplace">
            <h3>🖥️ Available GPUs</h3>
            <div className="gpu-grid">
              {availableGPUs.map(gpu => (
                <div key={gpu.id} className="gpu-card">
                  <div className="gpu-header">
                    <h4>{gpu.model}</h4>
                    <span className={`status-badge ${gpu.status}`}>
                      {gpu.status}
                    </span>
                  </div>
                  
                  <div className="gpu-specs">
                    <div className="spec-row">
                      <span className="spec-label">VRAM:</span>
                      <span className="spec-value">{gpu.vram}</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-label">Compute:</span>
                      <span className="spec-value">{gpu.compute}</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-label">Location:</span>
                      <span className="spec-value">{gpu.location}</span>
                    </div>
                  </div>

                  <div className="gpu-stats">
                    <div className="stat-item">
                      <span className="stat-label">Rating:</span>
                      <span className="stat-value">{getRatingStars(gpu.rating)} {gpu.rating}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Uptime:</span>
                      <span className="stat-value">{gpu.uptime}</span>
                    </div>
                  </div>

                  <div className="gpu-pricing">
                    <div className="hourly-rate">
                      <span className="rate-amount">{gpu.hourlyRate} ETH</span>
                      <span className="rate-unit">/hour</span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedGPU(gpu);
                        setShowRentalModal(true);
                      }}
                      className="rent-btn"
                    >
                      🚀 Rent GPU
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Rentals */}
          <div className="rentals-section">
            <h3>⚡ Active Rentals</h3>
            {activeRentals.length === 0 ? (
              <div className="no-rentals">
                <p>No active rentals. Rent a GPU to get started!</p>
              </div>
            ) : (
              <div className="rentals-list">
                {activeRentals.map(rental => (
                  <div key={rental.id} className="rental-card active">
                    <div className="rental-info">
                      <h4>GPU: {rental.model}</h4>
                      <div className="rental-details">
                        <span>Duration: {rental.duration}h</span>
                        <span>Cost: {rental.cost} ETH</span>
                        <span>Status: {rental.status}</span>
                      </div>
                    </div>
                    <div className="rental-actions">
                      <button 
                        onClick={() => terminateRental(rental.id)}
                        className="terminate-btn"
                        disabled={loading}
                      >
                        🛑 Terminate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rental History */}
          <div className="history-section">
            <h3>📜 Rental History</h3>
            {rentalHistory.length === 0 ? (
              <div className="no-history">
                <p>No rental history yet.</p>
              </div>
            ) : (
              <div className="history-list">
                {rentalHistory.map(rental => (
                  <div key={rental.id} className="rental-card completed">
                    <div className="rental-info">
                      <h4>GPU: {rental.model}</h4>
                      <div className="rental-details">
                        <span>Duration: {rental.duration}h</span>
                        <span>Cost: {rental.cost} ETH</span>
                        <span>Rating: {getRatingStars(rental.rating)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rental Modal */}
      {showRentalModal && selectedGPU && (
        <div className="modal-overlay">
          <div className="rental-modal">
            <div className="modal-header">
              <h3>Rent {selectedGPU.model}</h3>
              <button 
                onClick={() => setShowRentalModal(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="gpu-summary">
                <div className="summary-item">
                  <span>GPU Model:</span>
                  <span>{selectedGPU.model}</span>
                </div>
                <div className="summary-item">
                  <span>VRAM:</span>
                  <span>{selectedGPU.vram}</span>
                </div>
                <div className="summary-item">
                  <span>Hourly Rate:</span>
                  <span>{selectedGPU.hourlyRate} ETH/hour</span>
                </div>
              </div>

              <div className="duration-selector">
                <label>Rental Duration (hours):</label>
                <input 
                  type="number" 
                  min="1" 
                  max="168"
                  value={rentalDuration}
                  onChange={(e) => setRentalDuration(parseInt(e.target.value))}
                  className="duration-input"
                />
              </div>

              <div className="cost-summary">
                <div className="cost-breakdown">
                  <span>Duration:</span>
                  <span>{rentalDuration} hours</span>
                </div>
                <div className="cost-breakdown">
                  <span>Rate:</span>
                  <span>{selectedGPU.hourlyRate} ETH/hour</span>
                </div>
                <div className="cost-total">
                  <span>Total Cost:</span>
                  <span>{totalCost} ETH</span>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  onClick={() => setShowRentalModal(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  onClick={rentGPU}
                  disabled={loading || parseFloat(balance) < parseFloat(totalCost)}
                  className="confirm-rent-btn"
                >
                  {loading ? "Processing..." : `Confirm Rental`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GPURequesterInterface;
