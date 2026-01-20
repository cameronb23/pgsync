import * as A from "@automerge/automerge";

export function toAutomergeDoc<DocType>(docIn: string): A.Doc<DocType> {
  const buf = Buffer.from(docIn.slice(2), "hex");
  return A.load<DocType>(buf);
}

export function changeToHex(src: A.Change): string {
  return "\\x" + src.reduce((s, n) => s + n.toString(16).padStart(2, "0"), "");
}
