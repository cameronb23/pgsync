import { sql, SQL } from "bun";
import { changeToHex } from "../server/am";
import EventEmitter from "eventemitter3";

interface RealtimeEvents {}

type MutationResult =
  | {
      success: true;
    }
  | { success: false; error: Error };

interface RealtimeSDKOptions {
  postgresUri: string;
}

interface RealtimeSDK<Models = Record<string, unknown>> {
  get<T extends keyof Models>(
    type: T,
    id: string,
  ): Promise<ArrayBuffer | undefined>;
  mutate<T extends keyof Models>(
    type: T,
    id: string,
    // the mutation function should likely take in a buffer
    changes: Buffer | Uint8Array,
  ): Promise<MutationResult>;
  on: EventEmitter<RealtimeEvents>["on"];
  off: EventEmitter<RealtimeEvents>["off"];
  once: EventEmitter<RealtimeEvents>["once"];
}

function createPostgresConnection(optionsUri?: string) {
  const uri =
    optionsUri || process.env.POSTGRES_URI || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("Postgres connection URI must be provided.");
  }

  return new SQL(uri);
}

function createGet<Models>(pg: SQL): RealtimeSDK<Models>["get"] {
  return async function get<T extends keyof Models>(
    type: T,
    id: string,
  ): Promise<ArrayBuffer | undefined> {
    console.log("Getting document of type", type, "with id", id);
    const result = await pg`SELECT doc FROM ${sql(type)} WHERE id = ${id}`;
    if (result.length === 0) {
      return undefined;
    }
    const doc = result[0].doc;
    const buf = Buffer.from(doc.slice(2), "hex");
    return buf;
  };
}

function createMutate<Models>(pg: SQL): RealtimeSDK<Models>["mutate"] {
  return async function mutate<T extends keyof Models>(
    type: T,
    id: string,
    change: Buffer | Uint8Array,
  ): Promise<MutationResult> {
    console.log("Mutating document of type", type, "with id", id);
    // implement applying changes to Postgres
    try {
      // TODO: this is unsafe
      const rows = await pg.begin(async (sql) => {
        const hex = changeToHex(change);
        const row =
          await sql`insert into changes (table_name, id, origin_node, change) values (${type}, ${id}, ${process.env.NODE_ID}, ${hex}) returning *;`;
        await sql`update ${sql(type)} set doc = automerge.apply(doc, ${hex}) where id = ${id};`;
        return row;
      });

      const row = rows[0];

      if (!row) {
        throw new Error("Failed to retrieve UUID after mutation.");
      }

      await fetch(
        `http://localhost:${process.env.NODE_ID === "primary" ? 6970 : 6969}/ingest`,
        {
          method: "POST",
          body: JSON.stringify(row),
        },
      );

      console.log("Mutation applied successfully.");
      return { success: true };
    } catch (e) {
      console.error("Error applying mutation:", e);
      return { success: false, error: e as Error };
    }
  };
}

export function realtime<Models = {}>(
  options?: RealtimeSDKOptions,
): RealtimeSDK<Models> {
  if (!process.env.NODE_ID) {
    throw new Error("NODE_ID environment variable must be set.");
  }
  // setup postgres. we can also look at environment for POSTGRES_URI or DATABASE_URL
  const pg = createPostgresConnection(options?.postgresUri);
  const eventEmitter = new EventEmitter<RealtimeEvents>();

  return {
    get: createGet<Models>(pg),
    mutate: createMutate<Models>(pg),
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
  };
}
