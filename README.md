# GPU-Chain ⛓️  
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

## 🗺️ Future Goals  

- **⚡ Short Term**: Integrate Shelby, support indie devs and AI researchers.  
- **⚡ Medium Term**: Add stablecoins, advanced reputation, benchmarking.  
- **⚡ Long Term**: Become a decentralized Web3 alternative to AWS/Google Cloud for GPU computing.  

---

## 👨‍💻 The Team  

Project by **Team Deb Webelopers**.  

---
