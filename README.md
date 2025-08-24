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

### 4. GPU Worker (`/gpu-worker/`)
**Purpose**: Dockerized GPU task execution engine

**Architecture**:
- `Dockerfile` - Container setup for GPU workloads
- `server.js` - Node.js coordination server
- `job-worker.js` - Task distribution and management
- `gpu_task_runner.py` - Core Python GPU execution engine
- `game_renderer.py` - Advanced game rendering pipeline
- `game_renderer_simple.py` - Basic rendering for testing
- `task_splitter.py` - Breaks large jobs into chunks
- `task_aggregator.py` - Combines distributed results
- `test_*.js/py` - Comprehensive testing suite

**Core Capabilities**:
- **Containerized Execution**: Docker isolation for security and resource management
- **Task Distribution**: Advanced splitting/aggregation for large computational jobs
- **Multi-language Support**: Python for GPU processing, Node.js for coordination
- **Game Rendering**: Specialized pipelines for gaming and AI workloads

---

### 5. GPU Chain Aptos Contracts (`/gpu_chain_aptos_contracts/`)
**Purpose**: Production-ready Aptos Move contracts

**Enhanced Features**:
- `sources/compute_reward.move` - Refined reward computation logic
- `Move.toml` - Updated package configuration
- `deploy.sh` - Automated deployment script for Aptos network

**Improvements Over v1**:
- **Production Deployment**: Shell scripts for mainnet/testnet deployment
- **Enhanced Logic**: More sophisticated reward and escrow mechanisms
- **Network Integration**: Better Aptos blockchain connectivity

---

## 🏗️ System Architecture Flow

1. **Frontend (React)** → Users interact with the GPU marketplace interface
2. **Backend (Express)** → Handles WebRTC signaling and API coordination
3. **Smart Contracts (Move)** → Manages trustless payments and escrow on Aptos
4. **GPU Worker (Docker)** → Executes actual computational tasks in isolation
5. **P2P Network (WebRTC)** → Direct connections bypass centralized bottlenecks

---

## 💻 Technology Stack Summary

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite, Custom CSS, WebRTC (PeerJS) |
| **Backend** | Express.js, Node.js, PeerJS signaling |
| **Blockchain** | Aptos, Move language, Wallet integration |
| **GPU Processing** | Docker, Python, Node.js, GPU task runners |
| **P2P Networking** | WebRTC, PeerJS, Direct peer connections |

---

## 🚀 Key Innovation Points

- **Hybrid Decentralization**: Combines centralized signaling with decentralized execution
- **Trustless Escrow**: Aptos Move contracts ensure fair payment without intermediaries
- **Direct P2P Connections**: WebRTC eliminates middleman latency for GPU tasks
- **Container Security**: Docker isolation protects both renters and GPU owners
- **Scalable Task Distribution**: Advanced job splitting enables handling large computational workloads

---

## 📋 Component Responsibilities

### HomePage.jsx
- Hero section with GPU branding
- Feature cards explaining the platform
- FAQ section
- Call-to-action buttons
- Footer with links

### AuthPage.jsx
- Tab-based login/signup forms
- Form validation and submission
- Success/error messaging
- Backend API integration
- Redirect to P2P interface on login

### PeerToPeerInterface.jsx
- Peer ID display and management
- Connection to other peers
- Real-time messaging
- GPU job distribution
- Connection status monitoring
- Message history display

### BlockchainInterface.jsx
- Aptos wallet connectivity
- Transaction signing and submission
- Smart contract interaction
- Payment processing
- Escrow management

### GPUWorkerInterface.jsx
- GPU hardware listing and management
- Custom pricing configuration
- Earnings dashboard and tracking
- Performance monitoring
- Resource availability status

### GPURequesterInterface.jsx
- GPU search and filtering
- Rental request submission
- Task specification and upload
- Progress monitoring
- Results retrieval

---

## 🐳 Docker Configuration

The `gpu-worker/Dockerfile` creates a containerized environment for:
- GPU task isolation and security
- Resource allocation and management
- Cross-platform compatibility
- Scalable task execution
- Environment consistency

---

## 🔐 Security Features

- **Smart Contract Escrow**: Funds locked until task completion
- **Docker Isolation**: Tasks run in secured containers
- **P2P Encryption**: WebRTC provides encrypted connections
- **Blockchain Verification**: All transactions recorded on Aptos
- **Resource Sandboxing**: GPU access controlled and monitored

This architecture creates a comprehensive decentralized GPU marketplace that balances **security**, **performance**, and **user experience** through modern web technologies and blockchain integration.
## 👨‍💻 The Team  

Project by **Team Deb Webelopers**.  

---
