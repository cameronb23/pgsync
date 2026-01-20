import { SQL } from "bun";

export const pg = new SQL(
  `postgres://postgres:postgres@localhost:${process.env.NODE_ID === "primary" ? 5432 : 5433}/postgres`,
);
