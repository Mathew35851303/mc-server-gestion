import Docker from "dockerode";

const docker = new Docker({
  socketPath:
    process.platform === "win32"
      ? "//./pipe/docker_engine"
      : "/var/run/docker.sock",
});

const containerName = process.env.MC_CONTAINER_NAME || "minecraft-forge";

export async function getContainer() {
  return docker.getContainer(containerName);
}

export interface ContainerStatus {
  running: boolean;
  status: string;
  startedAt: string | null;
  health: string | null;
}

export async function getContainerStatus(): Promise<ContainerStatus> {
  try {
    const container = await getContainer();
    const info = await container.inspect();
    return {
      running: info.State.Running,
      status: info.State.Status,
      startedAt: info.State.StartedAt || null,
      health: info.State.Health?.Status || null,
    };
  } catch (error) {
    console.error("Error getting container status:", error);
    return {
      running: false,
      status: "not found",
      startedAt: null,
      health: null,
    };
  }
}

export interface ContainerStats {
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  cpuPercent: number;
}

function calculateCpuPercent(stats: Docker.ContainerStats): number {
  const cpuDelta =
    stats.cpu_stats.cpu_usage.total_usage -
    stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta =
    stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuCount = stats.cpu_stats.online_cpus || 1;

  if (systemDelta > 0 && cpuDelta > 0) {
    return (cpuDelta / systemDelta) * cpuCount * 100;
  }
  return 0;
}

export async function getContainerStats(): Promise<ContainerStats> {
  try {
    const container = await getContainer();
    const stats = await container.stats({ stream: false });
    const memoryUsage = stats.memory_stats.usage || 0;
    const memoryLimit = stats.memory_stats.limit || 1;

    return {
      memoryUsage,
      memoryLimit,
      memoryPercent: (memoryUsage / memoryLimit) * 100,
      cpuPercent: calculateCpuPercent(stats),
    };
  } catch (error) {
    console.error("Error getting container stats:", error);
    return {
      memoryUsage: 0,
      memoryLimit: 0,
      memoryPercent: 0,
      cpuPercent: 0,
    };
  }
}

export async function startContainer(): Promise<void> {
  const container = await getContainer();
  await container.start();
}

export async function stopContainer(): Promise<void> {
  const container = await getContainer();
  await container.stop();
}

export async function restartContainer(): Promise<void> {
  const container = await getContainer();
  await container.restart();
}

export async function getContainerLogs(tail: number = 100): Promise<string> {
  try {
    const container = await getContainer();
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    });

    // Handle buffer or string response
    if (Buffer.isBuffer(logs)) {
      return demuxDockerLogs(logs);
    }
    return String(logs);
  } catch (error) {
    console.error("Error getting container logs:", error);
    return "";
  }
}

// Docker multiplexes stdout and stderr in the log stream
// Each frame has an 8-byte header: [stream_type(1), 0, 0, 0, size(4)]
function demuxDockerLogs(buffer: Buffer): string {
  const lines: string[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) break;

    // Skip stream type and padding, read size
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;

    if (offset + size > buffer.length) break;

    const line = buffer.slice(offset, offset + size).toString("utf-8");
    lines.push(line.trimEnd());
    offset += size;
  }

  return lines.join("\n");
}

export function formatUptime(startedAt: string | null): string {
  if (!startedAt) return "N/A";

  const start = new Date(startedAt);
  const now = new Date();
  const diff = now.getTime() - start.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}j ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
