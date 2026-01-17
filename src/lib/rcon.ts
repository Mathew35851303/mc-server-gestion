import { Rcon } from "rcon-client";

class MinecraftRcon {
  private rcon: Rcon | null = null;
  private connecting: Promise<void> | null = null;

  private get host(): string {
    return process.env.RCON_HOST || "localhost";
  }

  private get port(): number {
    return parseInt(process.env.RCON_PORT || "25575");
  }

  private get password(): string {
    return process.env.RCON_PASSWORD || "";
  }

  async connect(): Promise<void> {
    if (this.rcon) {
      return;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = (async () => {
      try {
        this.rcon = await Rcon.connect({
          host: this.host,
          port: this.port,
          password: this.password,
        });

        this.rcon.on("end", () => {
          this.rcon = null;
          this.connecting = null;
        });
      } catch (error) {
        this.connecting = null;
        throw error;
      }
    })();

    return this.connecting;
  }

  async send(command: string): Promise<string> {
    try {
      await this.connect();
      if (!this.rcon) {
        throw new Error("Failed to connect to RCON");
      }
      return await this.rcon.send(command);
    } catch (error) {
      // Reset connection on error
      this.rcon = null;
      this.connecting = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.rcon) {
      await this.rcon.end();
      this.rcon = null;
      this.connecting = null;
    }
  }

  // Whitelist commands
  async whitelistAdd(player: string): Promise<string> {
    return this.send(`whitelist add ${player}`);
  }

  async whitelistRemove(player: string): Promise<string> {
    return this.send(`whitelist remove ${player}`);
  }

  async whitelistList(): Promise<string> {
    return this.send("whitelist list");
  }

  async whitelistReload(): Promise<string> {
    return this.send("whitelist reload");
  }

  async whitelistOn(): Promise<string> {
    return this.send("whitelist on");
  }

  async whitelistOff(): Promise<string> {
    return this.send("whitelist off");
  }

  // Player commands
  async listPlayers(): Promise<{ online: number; max: number; players: string[] }> {
    const response = await this.send("list");
    // Response format: "There are X of a max of Y players online: player1, player2"
    const match = response.match(
      /There are (\d+) of a max of (\d+) players online:?\s*(.*)?/i
    );

    if (match) {
      const online = parseInt(match[1]);
      const max = parseInt(match[2]);
      const playerList = match[3]?.trim();
      const players = playerList
        ? playerList.split(",").map((p) => p.trim()).filter(Boolean)
        : [];

      return { online, max, players };
    }

    return { online: 0, max: 20, players: [] };
  }

  // Server commands
  async say(message: string): Promise<string> {
    return this.send(`say ${message}`);
  }

  async kick(player: string, reason?: string): Promise<string> {
    return this.send(`kick ${player}${reason ? ` ${reason}` : ""}`);
  }

  async stop(): Promise<string> {
    return this.send("stop");
  }

  async save(): Promise<string> {
    return this.send("save-all");
  }
}

export const rcon = new MinecraftRcon();
