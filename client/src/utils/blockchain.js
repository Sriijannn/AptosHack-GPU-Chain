import { ethers } from 'ethers';
import ComputeRewardABI from './ComputeReward-abi.json';
import contractConfig from './contract-config.json';

// Contract configuration - uses dynamic config from deployment
export const CONTRACT_CONFIG = {
  // Use deployed contract address from config, fallback to localhost
  address: contractConfig?.contractAddress || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  abi: ComputeRewardABI,
  network: contractConfig?.network || "localhost",
  deployedAt: contractConfig?.deployedAt
};

// Network configurations
export const NETWORKS = {
  localhost: {
    chainId: 1337,
    name: "Localhost",
    rpcUrl: "http://127.0.0.1:8545",
  },
  polygon: {
    chainId: 137,
    name: "Polygon Mainnet",
    rpcUrl: "https://polygon-rpc.com/",
    blockExplorer: "https://polygonscan.com",
  },
  sepolia: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    blockExplorer: "https://sepolia.etherscan.io",
  },
  tenderly: {
    chainId: 1,
    name: "Tenderly Fork",
    rpcUrl: "https://rpc.tenderly.co/fork/YOUR_FORK_ID",
  }
};

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.currentAccount = null;
    this.network = null;
  }

  // Initialize connection to MetaMask/Web3 wallet
  async connectWallet() {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install MetaMask to use blockchain features.");
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found. Please connect your wallet.");
      }

      // Set up provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.currentAccount = accounts[0];

      // Get network info
      const network = await this.provider.getNetwork();
      this.network = {
        chainId: Number(network.chainId),
        name: network.name
      };

      // Initialize contract
      this.contract = new ethers.Contract(
        CONTRACT_CONFIG.address,
        CONTRACT_CONFIG.abi,
        this.signer
      );

      console.log("✅ Wallet connected:", this.currentAccount);
      console.log("🌐 Network:", this.network);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.currentAccount = accounts[0];
          console.log("🔄 Account changed:", this.currentAccount);
        }
      });

      // Listen for network changes
      window.ethereum.on('chainChanged', (chainId) => {
        window.location.reload(); // Reload to reset connection
      });      return {
        account: this.currentAccount,
        contract: this.contract,
        network: this.network
      };

    } catch (error) {
      console.error("❌ Wallet connection failed:", error);
      throw error;
    }
  }

  // Disconnect wallet
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.currentAccount = null;
    this.network = null;
    console.log("🔌 Wallet disconnected");
  }

  // Check if wallet is connected
  isConnected() {
    return this.currentAccount !== null && this.contract !== null;
  }

  // Get current account
  getCurrentAccount() {
    return this.currentAccount;
  }

  // Get network info
  getNetwork() {
    return this.network;
  }

  // Register as a compute worker
  async registerWorker(peerId) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      console.log("📝 Registering worker with peer ID:", peerId);
      const tx = await this.contract.registerWorker(peerId);
      console.log("⏳ Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Worker registered successfully");
      
      return {
        success: true,
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error("❌ Worker registration failed:", error);
      throw error;
    }
  }

  // Create a new compute task
  async createTask(taskHash, deadlineHours, rewardEth) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      const deadline = Math.floor(Date.now() / 1000) + (deadlineHours * 3600);
      const rewardWei = ethers.parseEther(rewardEth.toString());
      
      console.log("📋 Creating task:", { taskHash, deadline, rewardEth });
      
      const tx = await this.contract.createTask(taskHash, deadline, {
        value: rewardWei
      });
      
      console.log("⏳ Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      
      // Get task ID from events
      const taskCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed.name === 'TaskCreated';
        } catch {
          return false;
        }
      });
      
      const taskId = taskCreatedEvent ? 
        this.contract.interface.parseLog(taskCreatedEvent).args.taskId :
        null;
      
      console.log("✅ Task created successfully. Task ID:", taskId?.toString());
      
      return {
        success: true,
        taskId: taskId?.toString(),
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error("❌ Task creation failed:", error);
      throw error;
    }
  }

  // Assign task to worker
  async assignTask(taskId, workerAddress) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      console.log("🎯 Assigning task:", taskId, "to worker:", workerAddress);
      const tx = await this.contract.assignTask(taskId, workerAddress);
      console.log("⏳ Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Task assigned successfully");
      
      return {
        success: true,
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error("❌ Task assignment failed:", error);
      throw error;
    }
  }

  // Submit computation result
  async submitResult(taskId, resultHash) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      console.log("📤 Submitting result for task:", taskId);
      const tx = await this.contract.submitResult(taskId, resultHash);
      console.log("⏳ Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Result submitted successfully");
      
      return {
        success: true,
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error("❌ Result submission failed:", error);
      throw error;
    }
  }

  // Verify task completion
  async verifyTask(taskId) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      console.log("✅ Verifying task:", taskId);
      const tx = await this.contract.verifyTask(taskId);
      console.log("⏳ Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Task verified successfully");
      
      return {
        success: true,
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error("❌ Task verification failed:", error);
      throw error;
    }
  }

  // Claim accumulated rewards
  async claimRewards() {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      console.log("💰 Claiming rewards...");
      const tx = await this.contract.claimRewards();
      console.log("⏳ Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Rewards claimed successfully");
      
      return {
        success: true,
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error("❌ Reward claim failed:", error);
      throw error;
    }
  }

  // Get task details
  async getTask(taskId) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      const task = await this.contract.getTask(taskId);
      return {
        taskId: task.taskId.toString(),
        requester: task.requester,
        worker: task.worker,
        taskHash: task.taskHash,
        rewardAmount: ethers.formatEther(task.rewardAmount),
        deadline: new Date(Number(task.deadline) * 1000),
        status: Number(task.status),
        resultHash: task.resultHash,
        createdAt: new Date(Number(task.createdAt) * 1000),
        completedAt: task.completedAt > 0 ? new Date(Number(task.completedAt) * 1000) : null
      };
    } catch (error) {
      console.error("❌ Failed to get task:", error);
      throw error;
    }
  }

  // Get worker information
  async getWorkerInfo(address) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      const info = await this.contract.getWorkerInfo(address);
      return {
        isRegistered: info.isRegistered,
        peerId: info.peerId,
        reputation: Number(info.reputation),
        pendingRewards: ethers.formatEther(info.pendingRewards),
        completedTasks: Number(info.completedTasks)
      };
    } catch (error) {
      console.error("❌ Failed to get worker info:", error);
      throw error;
    }
  }

  // Get available tasks
  async getAvailableTasks(limit = 10) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      const taskIds = await this.contract.getAvailableTasks(limit);
      return taskIds.map(id => id.toString());
    } catch (error) {
      console.error("❌ Failed to get available tasks:", error);
      throw error;
    }
  }

  // Get user's created tasks
  async getUserTasks(address) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      const taskIds = await this.contract.getUserTasks(address);
      return taskIds.map(id => id.toString());
    } catch (error) {
      console.error("❌ Failed to get user tasks:", error);
      throw error;
    }
  }

  // Get platform statistics
  async getPlatformStats() {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      const stats = await this.contract.getPlatformStats();
      return {
        totalTasks: Number(stats.totalTasks),
        completedTasks: Number(stats.completedTasks),
        totalRewards: ethers.formatEther(stats.totalRewards),
        activeWorkers: Number(stats.activeWorkers)
      };
    } catch (error) {
      console.error("❌ Failed to get platform stats:", error);
      throw error;
    }
  }

  // Listen for contract events
  listenForEvents(eventName, callback) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    this.contract.on(eventName, callback);
    console.log("👂 Listening for", eventName, "events");
  }

  // Stop listening for events
  removeAllListeners() {
    if (this.contract) {
      this.contract.removeAllListeners();
      console.log("🔇 Stopped listening for events");
    }
  }

  // Format address for display
  static formatAddress(address) {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Format transaction hash for display
  static formatTxHash(hash) {
    if (!hash) return "";
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  }

  // Get block explorer URL
  getBlockExplorerUrl(txHash) {
    const networkConfig = Object.values(NETWORKS).find(
      config => config.chainId === this.network?.chainId
    );
    
    if (networkConfig?.blockExplorer) {
      return `${networkConfig.blockExplorer}/tx/${txHash}`;
    }
    
    return null;
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();

// Convenience function exports for easier import
export const connectWallet = () => blockchainService.connectWallet();
export const getContractInstance = () => blockchainService.contract;
export const registerAsWorker = (peerId) => blockchainService.registerWorker(peerId);
export const createComputeTask = (taskHash, deadlineHours, rewardEth) => 
  blockchainService.createTask(taskHash, deadlineHours, rewardEth);
export const assignTask = (taskId, workerAddress) => 
  blockchainService.assignTask(taskId, workerAddress);
export const submitResult = (taskId, resultHash) => 
  blockchainService.submitResult(taskId, resultHash);
export const verifyTask = (taskId) => blockchainService.verifyTask(taskId);
export const claimRewards = () => blockchainService.claimRewards();
export const getTask = (taskId) => blockchainService.getTask(taskId);
export const getWorkerInfo = (address) => blockchainService.getWorkerInfo(address);
export const getAvailableTasks = (limit) => blockchainService.getAvailableTasks(limit);
export const getUserTasks = (address) => blockchainService.getUserTasks(address);
export const getPlatformStats = () => blockchainService.getPlatformStats();
export const isConnected = () => blockchainService.isConnected();
export const getCurrentAccount = () => blockchainService.getCurrentAccount();
export const getNetwork = () => blockchainService.getNetwork();
export const disconnect = () => blockchainService.disconnect();

// Task status enum for frontend
export const TASK_STATUS = {
  PENDING: 0,
  ASSIGNED: 1,
  COMPLETED: 2,
  VERIFIED: 3,
  DISPUTED: 4,
  CANCELLED: 5
};

// Task status labels
export const TASK_STATUS_LABELS = {
  [TASK_STATUS.PENDING]: "Pending",
  [TASK_STATUS.ASSIGNED]: "Assigned",
  [TASK_STATUS.COMPLETED]: "Completed",
  [TASK_STATUS.VERIFIED]: "Verified",
  [TASK_STATUS.DISPUTED]: "Disputed",
  [TASK_STATUS.CANCELLED]: "Cancelled"
};
