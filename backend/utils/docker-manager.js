const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { execSync, spawn } = require('child_process');

// Initialize Docker client
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const containerLoggers = new Map(); // Track log streams
const emitter = new EventEmitter();
const buildingImages = new Map(); // Track ongoing image builds

class DockerManager {
  constructor() {
    this.containers = new Map();
    this.logBuffers = new Map();
  }

  /**
   * Check if Docker image exists
   */
  async imageExists(imageName) {
    try {
      const images = await docker.listImages();
      return images.some(img => 
        img.RepoTags && img.RepoTags.includes(imageName)
      );
    } catch (error) {
      console.error(`❌ Error checking image: ${error.message}`);
      return false;
    }
  }

  /**
   * Build Docker image if it doesn't exist
   */
  async ensureImageExists(imageName, dockerfile) {
    // If already building, wait for it
    if (buildingImages.has(imageName)) {
      console.log(`⏳ Image ${imageName} is already being built, waiting...`);
      await buildingImages.get(imageName);
      return;
    }

    // Check if image already exists
    if (await this.imageExists(imageName)) {
      console.log(`✅ Image ${imageName} already exists`);
      return;
    }

    console.log(`🔨 Building Docker image: ${imageName}...`);
    
    // Create build promise
    const buildPromise = this.buildImage(imageName, dockerfile);
    buildingImages.set(imageName, buildPromise);

    try {
      await buildPromise;
      console.log(`✅ Image ${imageName} built successfully`);
    } finally {
      buildingImages.delete(imageName);
    }
  }

  /**
   * Build Docker image using tar stream via stdin
   */
  async buildImage(imageName, dockerfile) {
    return new Promise((resolve, reject) => {
      try {
        const projectRoot = process.env.DOCKER_CONTEXT || path.join(__dirname, '../../');
        const dockerfilePath = path.join(projectRoot, dockerfile);

        if (!fs.existsSync(dockerfilePath)) {
          reject(new Error(`Dockerfile not found: ${dockerfilePath}`));
          return;
        }

        console.log(`📁 Building from: ${projectRoot}/${dockerfile}`);
        console.log(`🔨 Building image: ${imageName}...`);
        
        // Create tar of project directory and pipe to docker build
        const tar = spawn('tar', ['-C', projectRoot, '-czf', '-', '.'], {
          stdio: ['ignore', 'pipe', 'pipe']
        });

        const dockerBuild = spawn('docker', [
          'build',
          '--file', dockerfile,
          '-t', imageName,
          '-'
        ], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        // Pipe tar output to docker build input
        tar.stdout.pipe(dockerBuild.stdin);

        let buildOutput = '';
        let errorOutput = '';

        dockerBuild.stdout.on('data', (data) => {
          const output = data.toString();
          buildOutput += output;
          output.split('\n').forEach(line => {
            if (line.trim()) {
              console.log(`  ${line}`);
            }
          });
        });

        dockerBuild.stderr.on('data', (data) => {
          const error = data.toString();
          errorOutput += error;
        });

        tar.on('error', (err) => {
          console.error(`❌ Tar error: ${err.message}`);
          reject(err);
        });

        dockerBuild.on('error', (err) => {
          console.error(`❌ Docker build error: ${err.message}`);
          reject(err);
        });

        dockerBuild.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Image built successfully: ${imageName}`);
            resolve();
          } else {
            const error = new Error(`Docker build failed with code ${code}: ${errorOutput}`);
            console.error(`❌ Build failed: ${error.message}`);
            reject(error);
          }
        });
      } catch (error) {
        console.error(`❌ Build error: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Create and start a new Palworld server container using pre-built image
   */
  async createServerContainer(serverId, serverConfig) {
    try {
      console.log(`🐳 Creating container for server ${serverId}...`);

      // Using pre-built image from thijsvanloef/palworld-server-docker
      const imageName = 'thijsvanloef/palworld-server-docker:latest';
      
      // Check if image exists, if not pull it
      if (!await this.imageExists(imageName)) {
        console.log(`📥 Pulling image ${imageName}...`);
        try {
          const stream = await docker.pull(imageName);
          await new Promise((resolve, reject) => {
            docker.modem.followProgress(stream, (err, res) => {
              if (err) reject(err);
              else resolve(res);
            });
          });
          console.log(`✅ Image pulled: ${imageName}`);
        } catch (error) {
          console.error(`❌ Failed to pull image: ${error.message}`);
          throw error;
        }
      }

      const containerName = `palworld-${serverId}`;
      const port = serverConfig.port || 8211;
      const maxPlayers = serverConfig.max_players || 32;
      const serverName = serverConfig.server_name || `Palworld Server ${serverId}`;
      const serverPassword = serverConfig.server_password || '';

      // Container configuration for pre-built image
      const containerConfig = {
        Image: imageName,
        name: containerName,
        Hostname: containerName,
        Env: [
          'PUID=1000',
          'PGID=1000',
          `PORT=${port}`,
          `PLAYERS=${maxPlayers}`,
          `SERVER_NAME=${serverName}`,
          `SERVER_DESCRIPTION=Managed by Palworld Panel - ${serverId}`,
          `SERVER_PASSWORD=${serverPassword}`,
          `ADMIN_PASSWORD=${serverConfig.admin_password || 'adminPassword123'}`,
          'MULTITHREADING=true',
          'RCON_ENABLED=true',
          'RCON_PORT=25575',
          'COMMUNITY=false',
          'TZ=UTC'
        ],
        ExposedPorts: {
          [`${port}/udp`]: {},
          '25575/tcp': {}  // RCON
        },
        HostConfig: {
          PortBindings: {
            [`${port}/udp`]: [{ HostIp: '0.0.0.0', HostPort: `${port}` }],
            '25575/tcp': [{ HostIp: '0.0.0.0', HostPort: '25575' }]
          },
          Memory: 4294967296, // 4GB
          MemorySwap: 4294967296,
          CpuShares: 1024,
          RestartPolicy: { Name: 'unless-stopped', MaximumRetryCount: 5 },
          Binds: [`${serverId}-palworld:/palworld`]  // Named volume for persistence
        },
        Labels: {
          'palworld-panel': 'true',
          'server-id': serverId,
          'managed-by': 'palworld-panel'
        }
      };

      // Create container
      const container = await docker.createContainer(containerConfig);
      console.log(`✅ Container created: ${container.id.substring(0, 12)}`);

      // Start container
      await container.start();
      console.log(`✅ Container started: ${serverId}`);

      // Store container reference
      this.containers.set(serverId, {
        id: container.id,
        name: containerName,
        config: serverConfig,
        image: imageName,
        startTime: Date.now(),
        container
      });

      // Initialize log buffer
      this.logBuffers.set(serverId, []);

      // Attach log stream
      await this.attachLogs(serverId, container);

      // Emit event
      emitter.emit('container:created', { serverId, container: container.id });

      return { success: true, containerId: container.id };
    } catch (error) {
      console.error(`❌ Failed to create container for ${serverId}:`, error.message);
      emitter.emit('container:error', { serverId, error: error.message });
      throw error;
    }
  }

  /**
   * Attach and stream logs from container
   */
  async attachLogs(serverId, container) {
    try {
      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        timestamps: true
      });

      containerLoggers.set(serverId, logStream);

      logStream.on('data', (chunk) => {
        const log = chunk.toString();
        this.addLog(serverId, log);
        
        // Emit to Socket.IO clients
        emitter.emit('log', { serverId, message: log });
        global.io?.emit(`server:${serverId}:log`, { message: log });
      });

      logStream.on('error', (error) => {
        console.error(`❌ Log stream error for ${serverId}:`, error.message);
        this.addLog(serverId, `[ERROR] Log stream error: ${error.message}`);
      });

      logStream.on('end', () => {
        console.log(`📭 Log stream ended for ${serverId}`);
        containerLoggers.delete(serverId);
      });

      console.log(`📡 Log stream attached for ${serverId}`);
    } catch (error) {
      console.error(`❌ Failed to attach logs for ${serverId}:`, error.message);
    }
  }

  /**
   * Add log entry
   */
  addLog(serverId, message) {
    if (!this.logBuffers.has(serverId)) {
      this.logBuffers.set(serverId, []);
    }

    const buffer = this.logBuffers.get(serverId);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;

    buffer.push(logEntry);

    // Keep only last 1000 lines
    if (buffer.length > 1000) {
      buffer.shift();
    }
  }

  /**
   * Get recent logs
   */
  getLogs(serverId, lines = 100) {
    const buffer = this.logBuffers.get(serverId) || [];
    return buffer.slice(-lines);
  }

  /**
   * Clear logs
   */
  clearLogs(serverId) {
    this.logBuffers.set(serverId, []);
    this.addLog(serverId, '[Logs cleared]');
  }

  /**
   * Start container
   */
  async startContainer(serverId) {
    try {
      const containerInfo = this.containers.get(serverId);
      if (!containerInfo) throw new Error('Container not found');

      await containerInfo.container.start();
      console.log(`✅ Container started: ${serverId}`);

      emitter.emit('container:started', { serverId });
      global.io?.emit(`server:${serverId}:started`, {});

      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to start container ${serverId}:`, error.message);
      throw error;
    }
  }

  /**
   * Stop container
   */
  async stopContainer(serverId) {
    try {
      const containerInfo = this.containers.get(serverId);
      if (!containerInfo) throw new Error('Container not found');

      // Stop container gracefully with 30 second timeout
      await containerInfo.container.stop({ t: 30 });
      console.log(`✅ Container stopped: ${serverId}`);

      emitter.emit('container:stopped', { serverId });
      global.io?.emit(`server:${serverId}:stopped`, {});

      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to stop container ${serverId}:`, error.message);
      throw error;
    }
  }

  /**
   * Restart container
   */
  async restartContainer(serverId) {
    try {
      const containerInfo = this.containers.get(serverId);
      if (!containerInfo) throw new Error('Container not found');

      await containerInfo.container.restart({ t: 10 });
      console.log(`✅ Container restarted: ${serverId}`);

      emitter.emit('container:restarted', { serverId });
      global.io?.emit(`server:${serverId}:restarted`, {});

      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to restart container ${serverId}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete container
   */
  async deleteContainer(serverId) {
    try {
      const containerInfo = this.containers.get(serverId);
      if (!containerInfo) throw new Error('Container not found');

      // Stop log stream
      if (containerLoggers.has(serverId)) {
        containerLoggers.get(serverId).destroy();
        containerLoggers.delete(serverId);
      }

      // Remove container
      await containerInfo.container.remove({ force: true });
      console.log(`✅ Container deleted: ${serverId}`);

      this.containers.delete(serverId);
      this.logBuffers.delete(serverId);

      emitter.emit('container:deleted', { serverId });
      global.io?.emit(`server:${serverId}:deleted`, {});

      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to delete container ${serverId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get container stats (CPU, memory, network)
   */
  async getStats(serverId) {
    try {
      const containerInfo = this.containers.get(serverId);
      if (!containerInfo) return null;

      const stats = await containerInfo.container.stats({ stream: false });

      // Calculate CPU percentage
      const cpuDelta =
        stats.cpu_stats.cpu_usage.total_usage -
        stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta =
        stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuPercent =
        (cpuDelta / systemDelta) *
        stats.cpu_stats.online_cpus *
        100.0;

      // Memory usage
      const memoryUsage = stats.memory_stats.usage || 0;
      const memoryLimit = stats.memory_stats.limit || 0;
      const memoryPercent = (memoryUsage / memoryLimit) * 100;

      return {
        cpu_percent: Math.round(cpuPercent * 100) / 100,
        memory_usage: Math.round(memoryUsage / 1024 / 1024), // MB
        memory_limit: Math.round(memoryLimit / 1024 / 1024), // MB
        memory_percent: Math.round(memoryPercent * 100) / 100,
        network: {
          rx_bytes: stats.networks?.eth0?.rx_bytes || 0,
          tx_bytes: stats.networks?.eth0?.tx_bytes || 0
        }
      };
    } catch (error) {
      console.error(`❌ Failed to get stats for ${serverId}:`, error.message);
      return null;
    }
  }

  /**
   * Get container info
   */
  async getContainerInfo(serverId) {
    try {
      const containerInfo = this.containers.get(serverId);
      if (!containerInfo) return null;

      const inspection = await containerInfo.container.inspect();

      return {
        id: inspection.Id.substring(0, 12),
        name: inspection.Name.substring(1),
        state: inspection.State.Running ? 'running' : 'stopped',
        status: inspection.State.Status,
        uptime: containerInfo.startTime
          ? Math.floor((Date.now() - containerInfo.startTime) / 1000)
          : 0,
        ports: inspection.NetworkSettings.Ports,
        created: containerInfo.config.created_at
      };
    } catch (error) {
      console.error(`❌ Failed to get container info for ${serverId}:`, error.message);
      return null;
    }
  }

  /**
   * Execute command in container
   */
  async executeCommand(serverId, command) {
    try {
      const containerInfo = this.containers.get(serverId);
      if (!containerInfo) throw new Error('Container not found');

      const exec = await containerInfo.container.exec({
        Cmd: ['/bin/bash', '-c', command],
        AttachStdout: true,
        AttachStderr: true
      });

      const stream = await exec.start({ Detach: false });
      
      return new Promise((resolve, reject) => {
        let output = '';
        stream.on('data', (chunk) => {
          output += chunk.toString();
        });
        stream.on('end', () => {
          resolve(output);
        });
        stream.on('error', reject);
      });
    } catch (error) {
      console.error(`❌ Failed to execute command in ${serverId}:`, error.message);
      throw error;
    }
  }

  /**
   * Send command to server console
   */
  async sendConsoleCommand(serverId, command) {
    try {
      // Execute command in container
      const output = await this.executeCommand(serverId, command);
      
      this.addLog(serverId, `> ${command}`);
      this.addLog(serverId, output);

      emitter.emit('log', { serverId, message: output });
      global.io?.emit(`server:${serverId}:log`, { message: output });

      return { success: true, output };
    } catch (error) {
      console.error(`❌ Failed to send console command:`, error.message);
      throw error;
    }
  }

  /**
   * Send RCON command to Palworld server
   * Requires RCON_ENABLED=true in container environment
   */
  async sendRconCommand(serverId, command) {
    try {
      const containerInfo = this.containers.get(serverId);
      if (!containerInfo) throw new Error('Container not found');

      // Get RCON port from container config (default: 25575)
      const rconPort = 25575;
      const adminPassword = containerInfo.config.admin_password || 'adminPassword123';

      // Use rcon-cli to send commands
      // Install: apt-get install -y rcon-cli
      const rconCommand = `echo "${command}" | nc localhost ${rconPort}`;
      
      console.log(`📡 Sending RCON command: ${command}`);
      const output = await this.executeCommand(serverId, rconCommand);

      this.addLog(serverId, `[RCON] ${command}`);
      if (output) this.addLog(serverId, `[RCON] Response: ${output}`);

      emitter.emit('rcon:command', { serverId, command, output });
      global.io?.emit(`server:${serverId}:rcon`, { command, response: output });

      return { success: true, output };
    } catch (error) {
      console.error(`❌ Failed to send RCON command:`, error.message);
      throw error;
    }
  }

  /**
   * Load existing containers on startup
   */
  async loadExistingContainers() {
    try {
      console.log('🔄 Loading existing Palworld containers...');

      const containers = await docker.listContainers({
        all: true,
        filters: { label: ['palworld-panel=true'] }
      });

      for (const containerData of containers) {
        try {
          const container = docker.getContainer(containerData.Id);
          const inspection = await container.inspect();
          const serverId = inspection.Config.Labels['server-id'];

          if (serverId) {
            this.containers.set(serverId, {
              id: containerData.Id.substring(0, 12),
              name: containerData.Names[0].substring(1),
              config: null,
              startTime: new Date(containerData.Created).getTime(),
              container
            });

            console.log(`✅ Loaded container: ${serverId}`);

            // Re-attach logs if running
            if (containerData.State === 'running') {
              this.attachLogs(serverId, container);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to load container:`, error.message);
        }
      }

      console.log(`✅ Loaded ${this.containers.size} existing containers`);
    } catch (error) {
      console.error(`❌ Failed to load existing containers:`, error.message);
    }
  }
}

module.exports = {
  dockerManager: new DockerManager(),
  emitter
};