type EnvInput = {
  DATABASE_URL?: string;
  REDIS_URL?: string;
  ETH_RPC_URL?: string;
};

export type AppEnv = {
  DATABASE_URL: string;
  REDIS_URL: string;
  ETH_RPC_URL: string;
};

export type DbEnv = {
  DATABASE_URL: string;
};

export function loadEnv(input: EnvInput): AppEnv {
  if (!input.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  if (!input.REDIS_URL) {
    throw new Error("REDIS_URL is required");
  }
  if (!input.ETH_RPC_URL) {
    throw new Error("ETH_RPC_URL is required");
  }
  return {
    DATABASE_URL: input.DATABASE_URL,
    REDIS_URL: input.REDIS_URL,
    ETH_RPC_URL: input.ETH_RPC_URL
  };
}

export function loadDbEnv(input: EnvInput): DbEnv {
  if (!input.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  return {
    DATABASE_URL: input.DATABASE_URL
  };
}
