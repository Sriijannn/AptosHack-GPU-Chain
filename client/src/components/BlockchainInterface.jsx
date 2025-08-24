// utils/blockchain-aptos.js
import {
  AptosClient,
  AptosAccount,
  CoinClient,
  HexString,
  TxnBuilderTypes,
  BCS,
} from "aptos";

class AptosBlockchainService {
  constructor() {
    // Aptos Devnet configuration
    this.client = new AptosClient("https://fullnode.devnet.aptoslabs.com");
    this.coinClient = new CoinClient(this.client);
    this.faucetClient = null; // Will be set if needed for devnet

    this.moduleAddress =
      "0x11d74fa307cef604a6cf33416c866845caad285fa93dfd5f1a2bee7717967298";
    this.moduleName = "compute_reward";

    // Connection state
    this.connection = {
      connected: false,
      account: null,
      wallet: null,
      network: { name: "Aptos Devnet", chainId: 2 },
      isDemo: false,
    };

    // Demo mode data for testing
    this.demoData = {
      availableTasks: [1001, 1002, 1003],
      myCreatedTasks: [],
      taskCounter: 1004,
    };

    this.isDemo = false;
  }

  // Connection management
  async connectWallet() {
    try {
      // Check if Petra wallet is available
      if (window.aptos) {
        console.log("🦊 Connecting to Petra wallet...");

        const response = await window.aptos.connect();
        console.log("Wallet response:", response);

        if (response) {
          this.connection.connected = true;
          this.connection.account = response.address;
          this.connection.wallet = "petra";

          // Check if account exists on devnet, if not fund it
          try {
            await this.client.getAccount(response.address);
          } catch (error) {
            // Account doesn't exist, fund it via faucet
            await this.fundAccount(response.address);
          }

          return {
            success: true,
            method: "Petra Wallet",
            account: response.address,
          };
        }
      }

      // Fallback to demo mode if no wallet
      console.log("🎭 No wallet found, enabling demo mode...");
      return this.enableDemoMode();
    } catch (error) {
      console.error("Wallet connection error:", error);

      // Enable demo mode on connection failure
      console.log("🎭 Connection failed, enabling demo mode...");
      return this.enableDemoMode();
    }
  }

  async fundAccount(address) {
    try {
      console.log("💰 Funding devnet account...");
      const response = await fetch(
        `https://faucet.devnet.aptoslabs.com/mint?amount=10000000&address=${address}`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        console.log("✅ Account funded successfully");
        // Wait a bit for transaction to be processed
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.warn("⚠️ Failed to fund account:", error);
    }
  }

  enableDemoMode() {
    // Generate a demo account
    const demoAccount = new AptosAccount();

    this.connection = {
      connected: true,
      account: demoAccount.address().hex(),
      wallet: "demo",
      network: { name: "Aptos Devnet (Demo)", chainId: 2 },
      isDemo: true,
    };

    this.isDemo = true;

    return {
      success: true,
      method: "Demo Mode",
      isDemo: true,
      account: this.connection.account,
    };
  }

  getConnectionStatus() {
    return this.connection;
  }

  disconnect() {
    if (this.connection.wallet === "petra" && window.aptos) {
      window.aptos.disconnect();
    }

    this.connection = {
      connected: false,
      account: null,
      wallet: null,
      network: { name: "Aptos Devnet", chainId: 2 },
      isDemo: false,
    };

    this.isDemo = false;
  }

  // Smart contract interactions
  async registerWorker(peerId) {
    if (this.isDemo) {
      console.log("🎭 Demo: Registering worker with peer ID:", peerId);
      await this.simulateDelay();
      return { success: true, txHash: "0xdemo_register_" + Date.now() };
    }

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${this.moduleAddress}::${this.moduleName}::register_worker`,
        arguments: [peerId, this.moduleAddress],
        type_arguments: [],
      };

      const txnRequest = await this.client.generateTransaction(
        this.connection.account,
        payload
      );

      if (window.aptos) {
        const pendingTransaction = await window.aptos.signAndSubmitTransaction(
          txnRequest
        );
        await this.client.waitForTransaction(pendingTransaction.hash);

        console.log("✅ Worker registered:", pendingTransaction.hash);
        return { success: true, txHash: pendingTransaction.hash };
      }
    } catch (error) {
      console.error("❌ Worker registration failed:", error);
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  async createTask(taskHash, deadline, rewardAmount) {
    if (this.isDemo) {
      console.log("🎭 Demo: Creating task:", {
        taskHash,
        deadline,
        rewardAmount,
      });
      await this.simulateDelay();

      const taskId = this.demoData.taskCounter++;
      this.demoData.availableTasks.push(taskId);
      this.demoData.myCreatedTasks.push({
        taskId: taskId,
        taskHash: taskHash,
        reward: rewardAmount,
        status: "Available",
        worker: null,
        output: null,
        completedAt: null,
      });

      return {
        success: true,
        taskId: taskId,
        txHash: "0xdemo_task_" + Date.now(),
      };
    }

    try {
      // Convert reward amount to octas (APT * 10^8)
      const rewardInOctas = Math.floor(parseFloat(rewardAmount) * 100000000);

      // Calculate deadline timestamp (hours from now)
      const deadlineTimestamp =
        Math.floor(Date.now() / 1000) + parseInt(deadline) * 3600;

      const payload = {
        type: "entry_function_payload",
        function: `${this.moduleAddress}::${this.moduleName}::create_task`,
        arguments: [
          taskHash,
          deadlineTimestamp.toString(),
          rewardInOctas.toString(),
          this.moduleAddress,
        ],
        type_arguments: [],
      };

      const txnRequest = await this.client.generateTransaction(
        this.connection.account,
        payload
      );

      if (window.aptos) {
        const pendingTransaction = await window.aptos.signAndSubmitTransaction(
          txnRequest
        );
        await this.client.waitForTransaction(pendingTransaction.hash);

        console.log("✅ Task created:", pendingTransaction.hash);

        // Extract task ID from transaction events (simplified)
        const taskId = Date.now(); // In real implementation, extract from events

        return {
          success: true,
          taskId: taskId,
          txHash: pendingTransaction.hash,
        };
      }
    } catch (error) {
      console.error("❌ Task creation failed:", error);
      throw new Error(`Task creation failed: ${error.message}`);
    }
  }

  async acceptTask(taskId) {
    if (this.isDemo) {
      console.log("🎭 Demo: Accepting task:", taskId);
      await this.simulateDelay();
      return { success: true, txHash: "0xdemo_accept_" + Date.now() };
    }

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${this.moduleAddress}::${this.moduleName}::assign_task`,
        arguments: [
          taskId.toString(),
          this.connection.account,
          this.moduleAddress,
        ],
        type_arguments: [],
      };

      const txnRequest = await this.client.generateTransaction(
        this.connection.account,
        payload
      );

      if (window.aptos) {
        const pendingTransaction = await window.aptos.signAndSubmitTransaction(
          txnRequest
        );
        await this.client.waitForTransaction(pendingTransaction.hash);

        console.log("✅ Task accepted:", pendingTransaction.hash);
        return { success: true, txHash: pendingTransaction.hash };
      }
    } catch (error) {
      console.error("❌ Task acceptance failed:", error);
      throw new Error(`Task acceptance failed: ${error.message}`);
    }
  }

  async submitTaskResult(taskId, resultHash) {
    if (this.isDemo) {
      console.log("🎭 Demo: Submitting task result:", { taskId, resultHash });
      await this.simulateDelay();

      // Update demo task
      const taskIndex = this.demoData.myCreatedTasks.findIndex(
        (task) => task.taskId === taskId
      );
      if (taskIndex !== -1) {
        this.demoData.myCreatedTasks[taskIndex].status = "Completed";
        this.demoData.myCreatedTasks[taskIndex].output = resultHash;
        this.demoData.myCreatedTasks[taskIndex].completedAt = Date.now();
        this.demoData.myCreatedTasks[taskIndex].worker =
          this.connection.account;
      }

      return { success: true, txHash: "0xdemo_submit_" + Date.now() };
    }

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${this.moduleAddress}::${this.moduleName}::submit_result`,
        arguments: [taskId.toString(), resultHash, this.moduleAddress],
        type_arguments: [],
      };

      const txnRequest = await this.client.generateTransaction(
        this.connection.account,
        payload
      );

      if (window.aptos) {
        const pendingTransaction = await window.aptos.signAndSubmitTransaction(
          txnRequest
        );
        await this.client.waitForTransaction(pendingTransaction.hash);

        console.log("✅ Task result submitted:", pendingTransaction.hash);
        return { success: true, txHash: pendingTransaction.hash };
      }
    } catch (error) {
      console.error("❌ Task result submission failed:", error);
      throw new Error(`Result submission failed: ${error.message}`);
    }
  }

  async claimRewards() {
    if (this.isDemo) {
      console.log("🎭 Demo: Claiming rewards...");
      await this.simulateDelay();
      return { success: true, txHash: "0xdemo_claim_" + Date.now() };
    }

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${this.moduleAddress}::${this.moduleName}::claim_rewards`,
        arguments: [this.moduleAddress],
        type_arguments: [],
      };

      const txnRequest = await this.client.generateTransaction(
        this.connection.account,
        payload
      );

      if (window.aptos) {
        const pendingTransaction = await window.aptos.signAndSubmitTransaction(
          txnRequest
        );
        await this.client.waitForTransaction(pendingTransaction.hash);

        console.log("✅ Rewards claimed:", pendingTransaction.hash);
        return { success: true, txHash: pendingTransaction.hash };
      }
    } catch (error) {
      console.error("❌ Reward claim failed:", error);
      throw new Error(`Reward claim failed: ${error.message}`);
    }
  }

  // View functions
  async getWorkerInfo() {
    if (this.isDemo) {
      return {
        isRegistered: true,
        peerId: "12D3KooWDemo" + Math.random().toString(36).substr(2, 8),
        reputation: "75",
        pendingRewards: "0.05",
        completedTasks: "3",
      };
    }

    try {
      const resource = await this.client.getAccountResource(
        this.moduleAddress,
        `${this.moduleAddress}::${this.moduleName}::GlobalState`
      );

      // In a real implementation, you'd query the worker info from the resource
      // For now, return mock data
      return {
        isRegistered: true,
        peerId: "peer_" + this.connection.account?.slice(-8),
        reputation: "50",
        pendingRewards: "0.00",
        completedTasks: "0",
      };
    } catch (error) {
      console.warn("⚠️ Failed to load worker info:", error);
      return {
        isRegistered: false,
        peerId: "",
        reputation: "0",
        pendingRewards: "0",
        completedTasks: "0",
      };
    }
  }

  async getAvailableTasks(limit = 10) {
    if (this.isDemo) {
      return this.demoData.availableTasks.slice(0, limit);
    }

    try {
      // In real implementation, query available tasks from the contract
      // For now, return mock task IDs
      return [1001, 1002, 1003].slice(0, limit);
    } catch (error) {
      console.warn("⚠️ Failed to load available tasks:", error);
      return [];
    }
  }

  async getMyCreatedTasks() {
    if (this.isDemo) {
      return this.demoData.myCreatedTasks;
    }

    try {
      // In real implementation, query user's created tasks from the contract
      // For now, return empty array
      return [];
    } catch (error) {
      console.warn("⚠️ Failed to load created tasks:", error);
      return [];
    }
  }

  async getTaskDetails(taskId) {
    if (this.isDemo) {
      await this.simulateDelay(500);

      // Check if this is a created task
      const createdTask = this.demoData.myCreatedTasks.find(
        (task) => task.taskId === taskId
      );
      if (createdTask) {
        return {
          ...createdTask,
          isCreator: true,
          canAccept: false,
          creator: this.connection.account,
          deadline: "24",
        };
      }

      // Return available task details
      return {
        taskId: taskId,
        taskHash: `QmDemo${taskId}Hash`,
        reward: "0.1",
        deadline: "24",
        status: "Available",
        creator: "0x" + Math.random().toString(16).substr(2, 40),
        worker: null,
        output: null,
        completedAt: null,
        isCreator: false,
        canAccept: true,
      };
    }

    try {
      // In real implementation, query task details from contract
      return {
        taskId: taskId,
        taskHash: `QmTask${taskId}`,
        reward: "0.1",
        deadline: "24",
        status: "Available",
        creator: "0x1234567890abcdef",
        worker: null,
        output: null,
        completedAt: null,
        isCreator: false,
        canAccept: true,
      };
    } catch (error) {
      console.error("❌ Failed to get task details:", error);
      throw new Error(`Failed to load task details: ${error.message}`);
    }
  }

  // Utility functions
  async simulateDelay(ms = 1000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get account balance
  async getBalance() {
    if (this.isDemo) {
      return "10.5"; // Demo balance in APT
    }

    try {
      const resources = await this.client.getAccountResources(
        this.connection.account
      );
      const accountResource = resources.find(
        (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
      );

      if (accountResource) {
        const balance = parseInt(accountResource.data.coin.value) / 100000000; // Convert octas to APT
        return balance.toString();
      }

      return "0";
    } catch (error) {
      console.warn("⚠️ Failed to get balance:", error);
      return "0";
    }
  }

  // Update module address after deployment
  setModuleAddress(address) {
    this.moduleAddress = address;
    console.log("📍 Module address updated:", address);
  }
}

// Export singleton instance
const aptosBlockchainService = new AptosBlockchainService();

// Export constants for compatibility
export const TASK_STATUS = {
  PENDING: 0,
  ASSIGNED: 1,
  COMPLETED: 2,
  VERIFIED: 3,
  DISPUTED: 4,
  CANCELLED: 5,
};

export const TASK_STATUS_LABELS = {
  [TASK_STATUS.PENDING]: "Available",
  [TASK_STATUS.ASSIGNED]: "Assigned",
  [TASK_STATUS.COMPLETED]: "Completed",
  [TASK_STATUS.VERIFIED]: "Verified",
  [TASK_STATUS.DISPUTED]: "Disputed",
  [TASK_STATUS.CANCELLED]: "Cancelled",
};

export default aptosBlockchainService;
