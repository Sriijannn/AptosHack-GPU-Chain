// GameGPUManager.js - Manages distributed GPU rendering for games
export default class GameGPUManager {
  constructor() {
    this.connectedPeers = new Map(); // peerId -> connection
    this.peerGPUInfo = new Map(); // peerId -> GPU capabilities
    this.activeRenderTasks = new Map(); // taskId -> task info
    this.loadBalancer = new GPULoadBalancer();
    this.frameQueue = [];
    this.currentFrameId = 0;
  }

  // Connect to multiple peers for distributed rendering
  addPeer(peerId, connection, gpuInfo) {
    this.connectedPeers.set(peerId, connection);
    this.peerGPUInfo.set(peerId, {
      ...gpuInfo,
      currentLoad: 0,
      averageLatency: 0,
      reliability: 1.0,
      lastActive: Date.now()
    });
    
    connection.on('data', (data) => this.handlePeerResponse(peerId, data));
    connection.on('close', () => this.removePeer(peerId));
    
    console.log(`Added GPU peer: ${peerId}`, gpuInfo);
  }

  removePeer(peerId) {
    this.connectedPeers.delete(peerId);
    this.peerGPUInfo.delete(peerId);
    console.log(`Removed GPU peer: ${peerId}`);
  }

  // Main method to offload game rendering
  async offloadGameRendering(gameData) {
    const {
      scene,
      camera,
      lighting,
      objects,
      shaders,
      targetFPS,
      resolution
    } = gameData;

    // Split rendering tasks across available peers
    const renderTasks = this.createRenderTasks(scene, objects, resolution);
    const assignedTasks = this.loadBalancer.distributeTasks(renderTasks, this.peerGPUInfo);
    
    const renderPromises = assignedTasks.map(assignment => 
      this.sendRenderTask(assignment.peerId, assignment.task)
    );

    try {
      const results = await Promise.allSettled(renderPromises);
      return this.combineRenderResults(results, resolution);
    } catch (error) {
      console.error('Distributed rendering failed:', error);
      return this.fallbackLocalRendering(gameData);
    }
  }

  createRenderTasks(scene, objects, resolution) {
    const tasks = [];
    const { width, height } = resolution;
    
    // Split screen into tiles for distributed rendering
    const tileWidth = Math.floor(width / 2);
    const tileHeight = Math.floor(height / 2);
    
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        tasks.push({
          id: `tile_${x}_${y}`,
          type: 'render_tile',
          viewport: {
            x: x * tileWidth,
            y: y * tileHeight,
            width: tileWidth,
            height: tileHeight
          },
          scene: scene,
          objects: objects.filter(obj => this.isObjectInTile(obj, x, y, tileWidth, tileHeight)),
          priority: this.calculateTilePriority(x, y),
          expectedDuration: this.estimateRenderTime(objects.length, tileWidth * tileHeight)
        });
      }
    }

    return tasks;
  }

  async sendRenderTask(peerId, task) {
    const connection = this.connectedPeers.get(peerId);
    if (!connection) throw new Error(`Peer ${peerId} not connected`);

    const taskId = `${task.id}_${Date.now()}`;
    const renderPayload = {
      type: 'game_render',
      taskId: taskId,
      renderData: {
        operation: 'render_frame',
        viewport: task.viewport,
        scene: task.scene,
        objects: task.objects,
        shaders: ['vertex_standard', 'fragment_pbr'],
        quality: 'high',
        timestamp: Date.now()
      }
    };

    this.activeRenderTasks.set(taskId, {
      peerId,
      task,
      startTime: Date.now(),
      status: 'pending'
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.activeRenderTasks.delete(taskId);
        reject(new Error(`Render task ${taskId} timed out`));
      }, 5000); // 5 second timeout

      this.activeRenderTasks.get(taskId).resolve = (result) => {
        clearTimeout(timeout);
        resolve(result);
      };
      
      this.activeRenderTasks.get(taskId).reject = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      connection.send({ job: renderPayload });
    });
  }

  handlePeerResponse(peerId, data) {
    if (data.result && data.jobId) {
      const taskInfo = this.activeRenderTasks.get(data.jobId);
      if (taskInfo) {
        const duration = Date.now() - taskInfo.startTime;
        this.updatePeerPerformance(peerId, duration, data.result.success);
        
        if (taskInfo.resolve) {
          taskInfo.resolve({
            peerId,
            result: data.result,
            duration,
            taskId: data.jobId
          });
        }
        
        this.activeRenderTasks.delete(data.jobId);
      }
    }
  }

  updatePeerPerformance(peerId, latency, success) {
    const peerInfo = this.peerGPUInfo.get(peerId);
    if (peerInfo) {
      peerInfo.averageLatency = (peerInfo.averageLatency * 0.8) + (latency * 0.2);
      peerInfo.reliability = success ? 
        Math.min(1.0, peerInfo.reliability + 0.01) : 
        Math.max(0.1, peerInfo.reliability - 0.1);
      peerInfo.lastActive = Date.now();
    }
  }

  combineRenderResults(results, resolution) {
    const canvas = document.createElement('canvas');
    canvas.width = resolution.width;
    canvas.height = resolution.height;
    const ctx = canvas.getContext('2d');

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.result.frameData) {
        const img = new Image();
        img.onload = () => {
          const task = result.value.result;
          ctx.drawImage(img, task.viewport.x, task.viewport.y);
        };
        img.src = result.value.result.frameData; // Base64 image data
      }
    });

    return {
      combinedFrame: canvas.toDataURL(),
      renderTime: Math.max(...results.map(r => r.value?.duration || 0)),
      peersUsed: results.filter(r => r.status === 'fulfilled').length
    };
  }

  // Utility methods
  isObjectInTile(object, tileX, tileY, tileWidth, tileHeight) {
    // Check if 3D object intersects with screen tile
    const screenPos = this.projectToScreen(object.position);
    return screenPos.x >= tileX * tileWidth && 
           screenPos.x < (tileX + 1) * tileWidth &&
           screenPos.y >= tileY * tileHeight && 
           screenPos.y < (tileY + 1) * tileHeight;
  }

  calculateTilePriority(x, y) {
    // Center tiles get higher priority
    const centerDistance = Math.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2);
    return 1.0 - (centerDistance / Math.sqrt(2));
  }

  estimateRenderTime(objectCount, pixelCount) {
    return Math.max(100, objectCount * 2 + pixelCount / 10000);
  }

  projectToScreen(worldPos) {
    // Simplified projection - would use actual camera matrix in real implementation
    return { x: worldPos.x * 100 + 400, y: worldPos.y * 100 + 300 };
  }

  fallbackLocalRendering(gameData) {
    console.warn('Falling back to local rendering');
    return {
      combinedFrame: null,
      renderTime: 0,
      peersUsed: 0,
      fallback: true
    };
  }
}

// Load balancer for optimal GPU task distribution
class GPULoadBalancer {
  distributeTasks(tasks, peerGPUInfo) {
    const assignments = [];
    const availablePeers = Array.from(peerGPUInfo.entries())
      .filter(([_, info]) => info.reliability > 0.5)
      .sort(([_, a], [__, b]) => this.calculatePeerScore(a) - this.calculatePeerScore(b));

    if (availablePeers.length === 0) {
      throw new Error('No reliable peers available for rendering');
    }

    // Distribute tasks based on peer capabilities and current load
    tasks.forEach((task, index) => {
      const peerIndex = index % availablePeers.length;
      const [peerId, peerInfo] = availablePeers[peerIndex];
      
      assignments.push({
        peerId,
        task,
        estimatedDuration: task.expectedDuration / peerInfo.gpuScore
      });

      // Update peer load
      peerInfo.currentLoad += task.expectedDuration;
    });

    return assignments;
  }

  calculatePeerScore(peerInfo) {
    const latencyScore = Math.max(0, 1000 - peerInfo.averageLatency) / 1000;
    const reliabilityScore = peerInfo.reliability;
    const loadScore = Math.max(0, 1 - peerInfo.currentLoad / 1000);
    const gpuScore = peerInfo.gpuScore || 0.5;

    return (latencyScore * 0.3 + reliabilityScore * 0.3 + loadScore * 0.2 + gpuScore * 0.2);
  }
}
