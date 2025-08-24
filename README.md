# GPU-Chain By Deb Weblopers ⛓️  
*"Your Uber for GPUs"*  

GPU-Chain is a **decentralized marketplace built on the Aptos blockchain**, designed to connect GPU owners with users who need computational power. We unlock underutilized global GPU resources, making high-performance computing accessible and affordable for everyone.  

---

## 🚀 The Problem: The GPU Access Gap  

The current landscape of GPU accessibility is broken, creating a barrier to innovation and fostering digital inequality.  

- **Underutilized Resources**: Thousands of powerful GPUs sit idle worldwide, with owners lacking a secure way to monetize their assets.  
- **Costly & Limited Access**: High-end GPUs (like RTX 4090s) are prohibitively expensive. Existing cloud options are rigid and overpriced.  
- **Reliability & Trust Issues**: Current peer-to-peer GPU solutions often suffer from high fees, instability, and weak trust systems.  

---

## ✨ Our Solution: GPU-Chain on Aptos  

GPU-Chain solves these issues by creating a decentralized, peer-to-peer network that is fair, transparent, and efficient.  

- **For GPU Owners**: Easily list idle hardware, set custom pricing, and earn passive income — all with transparent dashboards.  
- **For Users**: On-demand access to GPUs for AI, gaming, rendering, or research. A smart search lets you filter by model, location, and price.  

---

## 🌟 Key Features  

- **🔒 Secure Transactions (Aptos + Move Contracts):**  
  Funds locked in escrow are only released upon successful completion.  

- **🤝 Peer-to-Peer Networking:**  
  Direct, low-latency WebRTC connections (via PeerJS) for efficient GPU utilization.  

- **🌍 Global Reach:**  
  Connects renters and owners across the world, tapping into otherwise idle GPU power.  

---

## ⚙️ How It Works  

1. **Rental Request** → Renter selects a GPU; payment locked in Aptos escrow.  
2. **Owner Acceptance** → Owner approves, agreed terms recorded on Aptos blockchain.  
3. **P2P Connection & Execution** → System establishes secure PeerJS channel, spins up a Dockerized GPU worker, executes the task.  
4. **Settlement** → Funds released to GPU owner upon successful completion, or refunded if failed.  

---

## 🛠️ Tech Stack  

| Category | Technology |
| --- | --- |
| **Frontend** | React 18, Vite, Custom CSS |
| **Backend & Networking** | Express.js, PeerJS (WebRTC P2P) |
| **Blockchain** | Aptos + Move language |
| **Additional Tools** | Docker (GPU workers), Python (GPU task processing) |

---

## Repository Structure & Architecture

### 📁 Complete Folder Structure

```
AptosHack-GPU-Chain/
├── backend/                    # Express.js API server
├── client/                     # React frontend application  
├── gpu-chain-contract/         # Aptos Move smart contracts (v1)
├── gpu-worker/                 # Dockerized GPU task processing
├── gpu_chain_aptos_contracts/  # Aptos Move smart contracts (v2)
├── .DS_Store
├── .gitignore
└── README.md
```

---

## 🔧 What Each Component Does

### 1. Backend (`/backend/`)
**Purpose**: Express.js API server handling WebRTC signaling and P2P coordination

**Files**:
- `app.js` - Main Express server with PeerJS signaling
- `package.json` - Node.js dependencies (Express.js, PeerJS)
- `package-lock.json` - Dependency lock file

**Functionality**:
- **WebRTC Signaling**: Facilitates P2P connections between GPU renters and owners
- **API Endpoints**: Handles GPU rental requests and coordination
- **Real-time Communication**: Manages peer discovery and connection establishment

---

### 2. Client (`/client/`)
**Purpose**: React 18 frontend with modern component architecture

**Detailed Structure**:
```
client/
├── public/
│   └── vite.svg                # Vite favicon
├── src/
│   ├── assets/
│   │   └── h525.png           # GPU-Chain branding
│   ├── components/
│   │   ├── AuthPage.jsx       # Login/Signup forms
│   │   ├── BlockchainInterface.jsx    # Aptos wallet integration
│   │   ├── BlockchainTest.jsx         # Blockchain testing UI
│   │   ├── GPURequesterInterface.jsx  # GPU rental interface
│   │   ├── GPUWorkerInterface.jsx     # GPU provider dashboard
│   │   ├── GameGPUInterface.jsx       # Gaming GPU features
│   │   ├── HomePage.jsx               # Landing page
│   │   ├── PeerToPeerInterface.jsx    # P2P communication UI
│   │   └── *.css files               # Component-specific styles
│   ├── utils/
│   │   ├── blockchain.js      # General blockchain utilities
│   │   └── blockchain-aptos.js # Aptos-specific integration
│   ├── App.jsx               # Main routing logic
│   ├── GameGPUManager.js     # Game rendering management
│   ├── PeerManager.js        # WebRTC connection management
│   └── style.css            # Global styles
├── index.html               # HTML entry point
├── package.json            # React/Vite dependencies
└── vite.config.js          # Vite build configuration
```

**Key Features**:
- **Dual Interface Design**: Separate UIs for GPU owners vs renters
- **Aptos Wallet Integration**: Direct blockchain connectivity for payments
- **Real-time P2P**: WebRTC-based direct GPU connections
- **Modular Components**: Clean separation of concerns with component-specific CSS

---

### 3. GPU Chain Contract (`/gpu-chain-contract/`)
**Purpose**: First iteration of Aptos Move smart contracts

**Contents**:
- `sources/compute_reward.move` - Core GPU rental reward logic
- `Move.toml` - Move package configuration
- `.gitignore` - Version control exclusions

**Smart Contract Functions**:
- **Escrow Management**: Secure payment holding during GPU tasks
- **Reward Distribution**: Automatic payment release upon task completion
- **Trust System**: Blockchain-verified rental agreements

---

### 4. GPU Chain Aptos Contracts (`/gpu_chain_aptos_contracts/`)
**Purpose**: Production-ready Aptos Move contracts

**Enhanced Features**:
- `sources/compute_reward.move` - Refined reward computation logic
- `Move.toml` - Updated package configuration
- `deploy.sh` - Automated deployment script for Aptos network

---
