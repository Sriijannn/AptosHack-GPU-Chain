import { ethers } from 'ethers';
import ComputeRewardABI from './ComputeReward-abi.json';
import contractConfig from './contract-config.json';

// Hackathon Configuration - Optimized for Local Development
export const CONTRACT_CONFIG = {
  address: contractConfig.contractAddress, // Dynamic from config
  abi: ComputeRewardABI,
  network: "localhost"
};

console.log('📋 Loaded contract config:', contractConfig);

// Network configurations
export const NETWORKS = {
  localhost: {
    chainId: 1337,
    name: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: "Local Network"
  },
  sepolia: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    rpcUrl: "https://eth-sepolia.public.blastapi.io",
    blockExplorer: "https://sepolia.etherscan.io"
  }
};

// Pre-funded Hardhat accounts for hackathon demo
export const HARDHAT_ACCOUNTS = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    balance: "10000 ETH"
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    balance: "10000 ETH"
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    balance: "10000 ETH"
  }
];

class HackathonBlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.currentAccount = null;
    this.network = null;
    this.isDemo = false;
    this.connectionPromise = null; // Prevent multiple connection attempts
  }

  // Hackathon-optimized connection with fallbacks
  async connectWallet() {
    // Prevent multiple simultaneous connection attempts
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._doConnect();
    try {
      const result = await this.connectionPromise;
      return result;
    } finally {
      this.connectionPromise = null;
    }
  }

  async _doConnect() {
    try {
      console.log("🔗 Attempting to connect to blockchain...");

      // Method 1: Try MetaMask connection
      if (window.ethereum) {
        try {
          const result = await this._connectMetaMask();
          if (result.success) return result;
        } catch (error) {
          console.warn("⚠️ MetaMask connection failed, trying fallback...", error.message);
        }
      }

      // Method 2: Fallback to direct provider connection (for hackathon)
      console.log("🔄 Trying direct provider connection...");
      return await this._connectDirectProvider();

    } catch (error) {
      console.error("❌ All connection methods failed:", error);
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  // MetaMask connection method
  async _connectMetaMask() {
    if (!window.ethereum) {
      throw new Error("MetaMask not found");
    }

    // Clear any pending requests
    if (window.ethereum._state && window.ethereum._state.accounts) {
      window.ethereum._state.accounts = null;
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (accounts.length === 0) {
      throw new Error("No accounts available");
    }

    // Set up provider and signer
    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
    this.currentAccount = accounts[0];

    // Get network and switch if needed
    await this._setupNetwork();

    // Initialize contract
    this._initializeContract();

    console.log("✅ MetaMask connected:", this.currentAccount);
    
    // Setup event listeners
    this._setupEventListeners();

    return {
      success: true,
      account: this.currentAccount,
      network: this.network,
      method: "MetaMask"
    };
  }

  // Direct provider connection (fallback for hackathon)
  async _connectDirectProvider() {
    try {
      // Connect directly to local Hardhat node
      this.provider = new ethers.JsonRpcProvider(NETWORKS.localhost.rpcUrl);
      
      // Use first Hardhat account as signer
      const wallet = new ethers.Wallet(HARDHAT_ACCOUNTS[0].privateKey, this.provider);
      this.signer = wallet;
      this.currentAccount = HARDHAT_ACCOUNTS[0].address;
      this.isDemo = true;

      // Set network info
      this.network = {
        chainId: NETWORKS.localhost.chainId,
        name: NETWORKS.localhost.name
      };

      // Initialize contract
      this._initializeContract();

      console.log("✅ Direct provider connected (Demo Mode):", this.currentAccount);
      console.log("💡 Using pre-funded Hardhat account for hackathon demo");

      return {
        success: true,
        account: this.currentAccount,
        network: this.network,
        method: "Direct Provider (Demo)",
        isDemo: true
      };
    } catch (error) {
      throw new Error(`Direct connection failed: ${error.message}`);
    }
  }

  // Setup network and switch if needed
  async _setupNetwork() {
    const network = await this.provider.getNetwork();
    this.network = {
      chainId: Number(network.chainId),
      name: network.name
    };

    // If not on localhost, try to switch
    if (this.network.chainId !== NETWORKS.localhost.chainId) {
      console.log("🔄 Attempting to switch to local network...");
      try {
        await this._switchToLocalNetwork();
      } catch (error) {
        console.warn("⚠️ Could not switch network:", error.message);
        // Continue anyway - might be on testnet which is fine
      }
    }
  }

  // Switch to local Hardhat network
  async _switchToLocalNetwork() {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${NETWORKS.localhost.chainId.toString(16)}` }],
      });
    } catch (switchError) {
      // Network doesn't exist, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${NETWORKS.localhost.chainId.toString(16)}`,
            chainName: NETWORKS.localhost.name,
            rpcUrls: [NETWORKS.localhost.rpcUrl],
            nativeCurrency: {
              name: "Ethereum",
              symbol: "ETH",
              decimals: 18
            }
          }]
        });
      } else {
        throw switchError;
      }
    }
  }  // Initialize contract instance
  _initializeContract() {
    try {
      console.log("🔧 Initializing contract with address:", CONTRACT_CONFIG.address);
      
      if (!CONTRACT_CONFIG.address) {
        throw new Error("Contract address not configured");
      }
      
      if (!this.signer) {
        throw new Error("Signer not available");
      }
      
      this.contract = new ethers.Contract(
        CONTRACT_CONFIG.address,
        CONTRACT_CONFIG.abi,
        this.signer
      );
      console.log("📋 Contract initialized successfully");
      
      // Validate contract in background
      this.validateContract().then(isValid => {
        if (!isValid) {
          console.warn("⚠️ Contract validation failed - some functions may not work");
        }
      }).catch(error => {
        console.error("❌ Contract validation error:", error);
      });
    } catch (error) {
      console.error("❌ Failed to initialize contract:", error);
      this.contract = null;
      throw error;
    }
  }

  // Setup event listeners for MetaMask
  _setupEventListeners() {
    if (!window.ethereum || this.isDemo) return;

    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        this.currentAccount = accounts[0];
        console.log("🔄 Account changed:", this.currentAccount);
      }
    });

    window.ethereum.on('chainChanged', (chainId) => {
      console.log("🔄 Network changed:", chainId);
      // Reload to reset connection state
      window.location.reload();
    });
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected(),
      account: this.currentAccount,
      network: this.network,
      isDemo: this.isDemo,
      contractAddress: CONTRACT_CONFIG.address
    };
  }

  // Disconnect wallet
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.currentAccount = null;
    this.network = null;
    this.isDemo = false;
    console.log("🔌 Wallet disconnected");
  }

  // Check if connected
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

  // Register as worker (hackathon demo)
  async registerWorker(peerId) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      console.log("📝 Registering worker with peer ID:", peerId);
      
      // For demo mode, use higher gas limit
      const gasLimit = this.isDemo ? 500000 : undefined;
      
      const tx = await this.contract.registerWorker(peerId, {
        gasLimit
      });
      
      console.log("⏳ Registration transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("✅ Worker registered successfully!");
      
      return {
        success: true,
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error("❌ Worker registration failed:", error);
      throw new Error(`Registration failed: ${error.message}`);
    }
  }
  // Create task (hackathon demo)
  async createTask(taskHash, deadlineHours = 24, rewardEth = "0.1") {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      const deadline = Math.floor(Date.now() / 1000) + (deadlineHours * 3600);
      // Use parseEther from ethers v6 or utils from v5 based on availability
      const rewardWei = ethers.parseEther ? 
        ethers.parseEther(rewardEth.toString()) : 
        ethers.parseEther(rewardEth.toString());
      
      console.log("📋 Creating task:", { taskHash, deadline, rewardEth });
      
      const gasLimit = this.isDemo ? 500000 : undefined;
      
      const tx = await this.contract.createTask(taskHash, deadline, {
        value: rewardWei,
        gasLimit
      });
      
      console.log("⏳ Task creation transaction sent:", tx.hash);
      const receipt = await tx.wait();
      
      // Extract task ID from events
      const taskCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed.name === 'TaskCreated';
        } catch {
          return false;
        }
      });
      
      const taskId = taskCreatedEvent ? 
        this.contract.interface.parseLog(taskCreatedEvent).args.taskId.toString() :
        null;
      
      console.log("✅ Task created successfully! Task ID:", taskId);
      
      return {
        success: true,
        taskId,
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error("❌ Task creation failed:", error);
      throw new Error(`Task creation failed: ${error.message}`);
    }
  }
  // Get available tasks with error handling
  async getAvailableTasks(limit = 10) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      console.log("🔍 Getting available tasks, limit:", limit);
      
      // Check if contract exists
      const code = await this.provider.getCode(CONTRACT_CONFIG.address);
      if (code === '0x') {
        throw new Error("Contract not deployed at this address");
      }
      
      const taskIds = await this.contract.getAvailableTasks(limit);
      
      // Handle empty response
      if (!taskIds || taskIds.length === 0) {
        console.log("📝 No available tasks found");
        return [];
      }
      
      return taskIds.map(id => id.toString());
    } catch (error) {
      console.error("❌ Failed to get available tasks:", error);
      
      // Return empty array instead of throwing
      console.log("📝 Returning empty tasks list due to error");
      return [];
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
        status: task.status,
        resultHash: task.resultHash,
        createdAt: new Date(Number(task.createdAt) * 1000),
        completedAt: task.completedAt > 0 ? new Date(Number(task.completedAt) * 1000) : null
      };
    } catch (error) {
      console.error("❌ Failed to get task:", error);
      throw error;
    }
  }
  // Get worker info with error handling
  async getWorkerInfo(address = null) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    const workerAddress = address || this.currentAccount;
    if (!workerAddress) throw new Error("No worker address provided");
    
    try {
      console.log("🔍 Getting worker info for:", workerAddress);
      
      // First check if the contract exists and has the function
      const code = await this.provider.getCode(CONTRACT_CONFIG.address);
      if (code === '0x') {
        throw new Error("Contract not deployed at this address");
      }
      
      const info = await this.contract.getWorkerInfo(workerAddress);
      
      // Handle empty response
      if (!info || info.length < 5) {
        console.log("📝 Worker not found, creating default info");
        return {
          isRegistered: false,
          peerId: "",
          reputation: "0",
          pendingRewards: "0",
          completedTasks: "0"
        };
      }
      
      return {
        isRegistered: info[0],
        peerId: info[1],
        reputation: info[2].toString(),
        pendingRewards: ethers.formatEther(info[3]),
        completedTasks: info[4].toString()
      };
    } catch (error) {
      console.error("❌ Failed to get worker info:", error);
      
      // Return default values instead of throwing
      console.log("📝 Returning default worker info due to error");
      return {
        isRegistered: false,
        peerId: "",
        reputation: "0",
        pendingRewards: "0",
        completedTasks: "0"
      };
    }
  }

  // Claim rewards
  async claimRewards() {
    if (!this.contract) throw new Error("Contract not initialized");
    
    try {
      const gasLimit = this.isDemo ? 200000 : undefined;
      const tx = await this.contract.claimRewards({ gasLimit });
      
      console.log("⏳ Claim transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("✅ Rewards claimed successfully!");
      
      return {
        success: true,
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error("❌ Failed to claim rewards:", error);
      throw error;
    }
  }

  // Validate contract deployment and ABI compatibility
  async validateContract() {
    try {
      console.log("🔍 Validating contract...");
      
      if (!this.provider) {
        throw new Error("Provider not initialized");
      }
      
      // Check if contract is deployed
      const code = await this.provider.getCode(CONTRACT_CONFIG.address);
      if (code === '0x') {
        throw new Error(`No contract deployed at address: ${CONTRACT_CONFIG.address}`);
      }
      
      console.log("✅ Contract found at address:", CONTRACT_CONFIG.address);
      
      // Try to call a simple function to test ABI compatibility
      if (this.contract) {
        try {
          const owner = await this.contract.owner();
          console.log("✅ Contract owner:", owner);
          return true;
        } catch (error) {
          console.warn("⚠️ ABI mismatch or function call failed:", error.message);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error("❌ Contract validation failed:", error);
      return false;
    }
  }

  // Get detailed task information with creator and output details
  async getTaskDetails(taskId) {
    try {
      console.log(`🔍 Getting task details for ${taskId}...`);
      
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }

      // Demo mode - return mock data with creator info
      if (this.isDemo) {
        const mockCreators = [
          HARDHAT_ACCOUNTS[0].address,
          HARDHAT_ACCOUNTS[1].address,
          HARDHAT_ACCOUNTS[2].address
        ];
        const creator = mockCreators[Math.floor(Math.random() * mockCreators.length)];
        const isCompleted = Math.random() > 0.7; // 30% chance task is completed
        
        return {
          taskHash: `QmDemo${taskId}`,
          reward: (Math.random() * 0.5 + 0.1).toFixed(3),
          deadline: Math.floor(Math.random() * 48 + 2),
          status: isCompleted ? 'Completed' : 'Available',
          creator: creator,
          worker: isCompleted ? HARDHAT_ACCOUNTS[3].address : null,
          output: isCompleted ? `GPU_RESULT_${taskId}_${Date.now()}` : null,
          completedAt: isCompleted ? new Date().toISOString() : null,
          requirements: 'GPU compute task',
          description: `Demo GPU processing task ${taskId}`,
          canAccept: creator !== this.currentAccount, // Can't accept own tasks
          isCreator: creator === this.currentAccount,
          isWorker: isCompleted && HARDHAT_ACCOUNTS[3].address === this.currentAccount
        };
      }      // Try to get real task details from contract
      try {
        const taskInfo = await this.contract.getTask(taskId);
        const isCreator = taskInfo.requester.toLowerCase() === this.currentAccount?.toLowerCase();
        const isCompleted = taskInfo.status >= 2; // Completed, Verified, Disputed states        const isWorker = taskInfo.worker !== ethers.ZeroAddress && 
                        taskInfo.worker.toLowerCase() === this.currentAccount?.toLowerCase();          return {
          taskHash: taskInfo.taskHash,
          reward: ethers.formatEther(taskInfo.rewardAmount),
          deadline: Math.floor((Number(taskInfo.deadline) - Date.now() / 1000) / 3600), // hours remaining
          status: this._getTaskStatus(taskInfo.status),          creator: taskInfo.requester,
          worker: taskInfo.worker !== ethers.ZeroAddress ? taskInfo.worker : null,
          output: taskInfo.resultHash || null,
          completedAt: taskInfo.completedAt > 0 ? new Date(Number(taskInfo.completedAt) * 1000).toISOString() : null,
          requirements: 'GPU compute task',
          description: `Task ${taskId}`,
          canAccept: !isCreator && !isCompleted && taskInfo.status === 0, // Can only accept pending tasks that user didn't create
          isCreator: isCreator,
          isWorker: isWorker
        };
      } catch (error) {
        console.warn("⚠️ Could not fetch real task details, using demo data");
        return {
          taskHash: `Task_${taskId}`,
          reward: "0.1",
          deadline: "24", 
          status: 'Available',
          creator: HARDHAT_ACCOUNTS[0].address,
          worker: null,
          output: null,
          completedAt: null,
          requirements: 'GPU compute task',
          description: `Task ${taskId} - Demo mode`,
          canAccept: true,
          isCreator: false,
          isWorker: false
        };
      }
    } catch (error) {
      console.error("❌ Failed to get task details:", error);
      throw error;
    }
  }  // Get tasks created by current user
  async getMyCreatedTasks() {
    try {
      console.log("📋 Getting tasks created by current user...");
      
      // Ensure we have a connection and account
      if (!this.currentAccount) {
        const status = this.getConnectionStatus();
        if (!status.connected || !status.account) {
          console.warn("⚠️ No account available, returning empty tasks list");
          return [];
        }
        this.currentAccount = status.account;
      }
      
      if (!this.contract) {
        console.warn("⚠️ Contract not initialized, returning empty tasks list");
        return [];
      }

      // Additional safety checks
      if (!this.provider) {
        console.warn("⚠️ Provider not available, returning empty tasks list");
        return [];
      }

      console.log("🔍 Current account:", this.currentAccount);
      console.log("🔍 Contract address:", this.contract?.address || CONTRACT_CONFIG.address);// Demo mode - return mock created tasks
      if (this.isDemo) {
        return [
          {
            taskId: "TASK_001",
            taskHash: "QmDemoCreated1",
            reward: "0.15",
            status: "Completed",
            worker: HARDHAT_ACCOUNTS[3].address,
            output: "GPU_RESULT_CREATED_001_1734237841048",
            completedAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            taskId: "TASK_002", 
            taskHash: "QmDemoCreated2",
            reward: "0.08",
            status: "Available",
            worker: null,
            output: null,
            completedAt: null
          }
        ];
      }      // Get real created tasks from contract
      try {
        // Use getUserTasks instead of getTasksByCreator
        const taskIds = await this.contract.getUserTasks(this.currentAccount);
        
        if (!taskIds || taskIds.length === 0) {
          console.log("📝 No created tasks found");
          return [];
        }
        
        // Get detailed task information for each task ID
        const createdTasks = [];
        for (const taskId of taskIds) {
          try {
            const taskInfo = await this.contract.getTask(taskId);            createdTasks.push({
              taskId: taskId.toString(),
              taskHash: taskInfo.taskHash,
              reward: ethers.formatEther(taskInfo.rewardAmount),              status: this._getTaskStatus(taskInfo.status),
              worker: taskInfo.worker !== ethers.ZeroAddress ? taskInfo.worker : null,
              output: taskInfo.resultHash || null,
              completedAt: taskInfo.completedAt > 0 ? new Date(Number(taskInfo.completedAt) * 1000).toISOString() : null,
              deadline: new Date(Number(taskInfo.deadline) * 1000).toISOString(),
              createdAt: new Date(Number(taskInfo.createdAt) * 1000).toISOString()
            });
          } catch (taskError) {
            console.warn(`⚠️ Could not get details for task ${taskId}:`, taskError.message);
          }
        }
        
        return createdTasks;
      } catch (error) {
        console.warn("⚠️ Could not fetch real created tasks:", error.message);
        console.log("📝 Returning empty list");
        return [];
      }
    } catch (error) {
      console.error("❌ Failed to get created tasks:", error);
      return [];
    }
  }

  // Helper method to convert task status enum to readable string
  _getTaskStatus(statusNum) {
    const statusMap = {
      0: 'Pending',
      1: 'Assigned', 
      2: 'Completed',
      3: 'Verified',
      4: 'Disputed',
      5: 'Cancelled'
    };
    return statusMap[statusNum] || 'Unknown';
  }
}

// Export singleton instance
export const blockchainService = new HackathonBlockchainService();
export default blockchainService;
