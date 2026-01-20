import { createResponse as createSSEResponse } from "better-sse";
import { changeStreamChannel } from "../sse";
import { applyCors } from "./apply-cors";

export const streamRoute: Bun.Serve.Handler<
  Bun.BunRequest<"/stream">,
  Bun.Server<undefined>,
  Response
> = async (req) => {
  return applyCors(
    createSSEResponse(
      req,
      {
        // Set the keep-alive interval to below
        // Bun's default idle timeout of ten (10) seconds
        keepAlive: 8000,
      },
      (session) => {
        // begin streaming to the client!
        changeStreamChannel.register(session);
      },
    ),
  );
};
