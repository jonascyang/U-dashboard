type QueryHandler = (query: string, args: unknown[]) => unknown;

export function createMockD1(handlers?: {
  first?: QueryHandler;
  all?: QueryHandler;
  run?: QueryHandler;
}) {
  const history: Array<{ query: string; args: unknown[] }> = [];

  const db = {
    prepare(query: string) {
      let args: unknown[] = [];
      const statement = {
        bind(...nextArgs: unknown[]) {
          args = nextArgs;
          return statement;
        },
        async run() {
          history.push({ query, args });
          const out = handlers?.run?.(query, args);
          return (out as Record<string, unknown>) ?? { success: true };
        },
        async first<T = unknown>() {
          history.push({ query, args });
          const out = handlers?.first?.(query, args);
          return (out as T) ?? null;
        },
        async all<T = unknown>() {
          history.push({ query, args });
          const out = handlers?.all?.(query, args);
          return { results: (out as T[]) ?? [] };
        }
      };

      return statement;
    }
  };

  return { db, history };
}
