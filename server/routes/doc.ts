import { sdk } from "../realtime";
import { applyCors } from "./apply-cors";

export const docRoute: Bun.Serve.Handler<
  Bun.BunRequest<"/doc">,
  Bun.Server<undefined>,
  Response
> = async () => {
  const document = await sdk.get(
    "documents",
    "019bd93d-2d25-7d22-adf1-a2a0b44d5e6a",
  );

  if (!document) {
    return applyCors(new Response(null, { status: 404 }));
  }

  return applyCors(new Response(document, { status: 200 }));
};
