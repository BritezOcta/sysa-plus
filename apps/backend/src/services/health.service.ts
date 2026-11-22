import { healthRepository } from "../repositories/health.repository.js";

export const healthService = {
  async isDatabaseUp(): Promise<boolean> {
    try {
      await healthRepository.ping();
      return true;
    } catch (error) {
      console.error("Database connection error:", error);
      return false;
    }
  },
};
