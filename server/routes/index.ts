import { docRoute } from "./doc";
import { ingestRoute } from "./ingest";
import { mutateRoute } from "./mutate";
import { streamRoute } from "./stream";

export const routes = {
  "/doc": docRoute,
  "/stream": streamRoute,
  "/mutate": mutateRoute,
  "/ingest": ingestRoute,
} as const;
