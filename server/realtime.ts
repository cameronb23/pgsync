import { realtime } from "../sdk";

export const sdk = realtime<{ documents: { text: string } }>({
  postgresUri: `postgres://postgres:postgres@localhost:${process.env.NODE_ID === "primary" ? "5432" : "5433"}/postgres`,
});
