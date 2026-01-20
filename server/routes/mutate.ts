import { sdk } from "../realtime";
import { changeStreamChannel } from "../sse";
import { applyCors } from "./apply-cors";

export const mutateRoute: Partial<
  Record<
    Bun.Serve.HTTPMethod,
    | Response
    | Bun.Serve.Handler<
        Bun.BunRequest<"/mutate">,
        Bun.Server<undefined>,
        Response
      >
  >
> = {
  OPTIONS: () => {
    return applyCors(new Response("ok", { status: 200 }));
  },
  POST: async (req) => {
    const bin = await req.bytes();

    const s = performance.now();
    const result = await sdk.mutate(
      "documents",
      "019bd93d-2d25-7d22-adf1-a2a0b44d5e6a",
      bin,
    );
    const f = performance.now();
    console.log("Applied change in", f - s, "ms");

    if (!result.success) {
      return applyCors(new Response(result.error.message, { status: 500 }));
    }

    changeStreamChannel.broadcast(bin.toBase64(), "mutation");

    return applyCors(new Response("ok", { status: 200 }));
  },
};
