import { DurableObject } from "cloudflare:workers";

interface UserPresence {
  enteredAt: string;
  userId: string;
}

export class VenuePresence extends DurableObject {
  async getActiveUsers(): Promise<{ enteredAt: string; userId: string }[]> {
    const state =
      await this.ctx.storage.get<Record<string, UserPresence>>("users");
    if (!state) {
      return [];
    }

    return Object.values(state);
  }

  async userEntered(userId: string): Promise<{ count: number }> {
    const state =
      (await this.ctx.storage.get<Record<string, UserPresence>>("users")) ?? {};
    state[userId] = { enteredAt: new Date().toISOString(), userId };
    await this.ctx.storage.put("users", state);

    const count = Object.keys(state).length;
    return { count };
  }

  async userExited(userId: string): Promise<{ count: number }> {
    const state =
      (await this.ctx.storage.get<Record<string, UserPresence>>("users")) ?? {};
    const { [userId]: _removed, ...rest } = state;
    void _removed;
    await this.ctx.storage.put("users", rest);

    const count = Object.keys(rest).length;
    return { count };
  }

  async getActiveCount(): Promise<number> {
    const state =
      await this.ctx.storage.get<Record<string, UserPresence>>("users");
    if (!state) {
      return 0;
    }

    return Object.keys(state).length;
  }
}
