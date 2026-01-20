import Bun from "bun";
import { routes } from "./routes";

Bun.serve({
  port: process.env.NODE_ID === "primary" ? 6969 : 6970,
  routes,
});
