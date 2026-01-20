import { sql } from "bun";
import { changeToHex } from "../am";
import { pg } from "../pg";
import { changeStreamChannel } from "../sse";

import { applyCors } from "./apply-cors";

export const ingestRoute: Partial<
  Record<
    Bun.Serve.HTTPMethod,
    | Response
    | Bun.Serve.Handler<
        Bun.BunRequest<"/ingest">,
        Bun.Server<undefined>,
        Response
      >
  >
> = {
  POST: async (req) => {
    const row = await req.json();

    // const buf = new Uint8Array(Object.values(data.change));

    console.log("Received change for ingestion:", row);

    const change = new Uint8Array(row.change.data);
    await pg.begin(async (sql) => {
      const hex = changeToHex(change);
      await sql`insert into changes (uuid, origin_node, table_name, id, change) values (${row.uuid}, ${row.origin_node}, ${row.table_name}, ${row.id}, ${hex})`;
      await sql`update ${sql(row.table_name)} set doc = automerge.apply(doc, ${hex}) where id = ${row.id};`;
    });

    changeStreamChannel.broadcast(change.toBase64(), "mutation");

    return applyCors(new Response(null, { status: 200 }));
  },
};
