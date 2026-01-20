// ai generated...close your eyes
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import {
  baseKeymap,
  toggleMark,
  setBlockType,
  wrapIn,
} from "prosemirror-commands";
import { wrapInList } from "prosemirror-schema-list";
import { next as A } from "@automerge/automerge";
import {
  init,
  type DocHandle,
  basicSchemaAdapter,
} from "@automerge/prosemirror";
import "prosemirror-view/style/prosemirror.css";
import { EventEmitter } from "eventemitter3";
import type { DocHandleChangePayload } from "@automerge/prosemirror/dist/DocHandle";

const node_id = document.location.search.split("=")[1];
const port = node_id === "primary" ? 6969 : 6970;

// Automerge document type
interface EditorDoc {
  text: string;
}

const doc = await fetch(`http://localhost:${port}/doc`);

if (!doc.ok) {
  throw new Error("Failed to fetch document from server");
}

const docBuf = await doc.arrayBuffer();
let automergeDoc = A.load<EditorDoc>(new Uint8Array(docBuf));

let changeCount = 0;

// Create a simple handle wrapper for the Automerge document
// This mimics the DocHandle interface that @automerge/prosemirror expects

const emitter = new EventEmitter<{
  change: (p: DocHandleChangePayload<EditorDoc>) => void;
}>();

const handle: DocHandle<EditorDoc> = {
  // docSync() {
  //   return automergeDoc;
  // },
  doc() {
    return automergeDoc;
  },
  change(callback: (doc: EditorDoc) => void) {
    automergeDoc = A.change(automergeDoc, callback);
    // send to server
    const recentChange = A.getLastLocalChange(automergeDoc);

    changeCount++;
    updateUI();
    if (recentChange) {
      fetch(`http://localhost:${port}/mutate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: recentChange as any,
      });
    }
  },
  on(
    event: "change",
    callback: (p: DocHandleChangePayload<EditorDoc>) => void,
  ) {
    emitter.on(event, callback);
    console.log("Subscribed to event:", event);
  },
  off(
    event: "change",
    callback: (p: DocHandleChangePayload<EditorDoc>) => void,
  ) {
    emitter.off(event, callback);
    // Handle events if needed
    console.log("Unsubscribed from event:", event);
  },
};

// Initialize the ProseMirror editor with Automerge integration
const { schema, pmDoc, plugin } = init(handle, ["text"], {
  schemaAdapter: basicSchemaAdapter,
});

// Create ProseMirror state with the initialized schema, document, and plugin
const state = EditorState.create({
  schema,
  doc: pmDoc,
  plugins: [keymap(baseKeymap), plugin],
});

// Create the editor view
const editorView = new EditorView(document.querySelector("#editor")!, {
  state,
});

// Setup toolbar
const toolbar = document.getElementById("toolbar");
if (toolbar) {
  toolbar.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest(".toolbar-button") as HTMLElement;
    if (!button) return;

    const command = button.dataset.command;
    if (!command) return;

    const { state, dispatch } = editorView;

    switch (command) {
      case "strong":
        toggleMark(schema.marks.strong!)(state, dispatch);
        break;
      case "em":
        toggleMark(schema.marks.em!)(state, dispatch);
        break;
      case "code":
        toggleMark(schema.marks.code!)(state, dispatch);
        break;
      case "heading1":
        setBlockType(schema.nodes.heading!, { level: 1 })(state, dispatch);
        break;
      case "heading2":
        setBlockType(schema.nodes.heading!, { level: 2 })(state, dispatch);
        break;
      case "heading3":
        setBlockType(schema.nodes.heading!, { level: 3 })(state, dispatch);
        break;
      case "bullet_list":
        wrapInList(schema.nodes.bullet_list!)(state, dispatch);
        break;
      case "ordered_list":
        wrapInList(schema.nodes.ordered_list!)(state, dispatch);
        break;
      case "blockquote":
        wrapIn(schema.nodes.blockquote!)(state, dispatch);
        break;
    }

    editorView.focus();
  });
}

// Update UI elements
function updateUI() {
  const changeCountEl = document.getElementById("change-count");
  if (changeCountEl) {
    changeCountEl.textContent = changeCount.toString();
  }

  const debugContent = document.getElementById("debug-content");
  if (debugContent) {
    const heads = A.getHeads(automergeDoc);
    const lastLocalChange = A.getLastLocalChange(automergeDoc);

    debugContent.innerHTML = `
      <div>Document Heads: ${JSON.stringify(heads)}</div>
      <div>Content Length: ${automergeDoc.text.length} characters</div>
      <div>Changes Applied: ${changeCount}</div>
      <div>Last Change: ${lastLocalChange ? new Date().toLocaleTimeString() : "None"}</div>
      <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border);">
        Text Preview: ${automergeDoc.text.toString().slice(0, 100)}${automergeDoc.text.length > 100 ? "..." : ""}
      </div>
    `;
  }
}

// Simulate server sync (placeholder for real implementation)
async function syncWithServer() {
  try {
    // This is where you would send changes to the server
    // const changes = A.getChanges(automergeDoc, lastSyncedHeads);
    // await fetch('/api/sync', { method: 'POST', body: JSON.stringify(changes) });

    updateConnectionStatus(true);
  } catch (error) {
    console.error("Sync error:", error);
    updateConnectionStatus(false);
  }
}

function updateConnectionStatus(connected: boolean) {
  const statusIndicator = document.querySelector(".status-indicator");
  const statusText = document.getElementById("connection-status");

  if (statusIndicator && statusText) {
    if (connected) {
      statusIndicator.classList.remove("disconnected");
      statusIndicator.classList.add("connected");
      statusText.textContent = "Connected";
    } else {
      statusIndicator.classList.remove("connected");
      statusIndicator.classList.add("disconnected");
      statusText.textContent = "Disconnected";
    }
  }
}

// Initialize
updateUI();
editorView.focus();

// Periodic sync (every 2 seconds)
setInterval(syncWithServer, 2000);

// Listen to server events
const eventSource = new EventSource(`http://localhost:${port}/stream`);
eventSource.addEventListener("mutation", (event: MessageEvent<string>) => {
  console.log("Received server event:", event.data);
  // convert the string to a Uint8Array
  const bin = Uint8Array.from(atob(event.data.slice(1, -1)), (c) =>
    c.charCodeAt(0),
  );
  const s = performance.now();
  [automergeDoc] = A.applyChanges(automergeDoc, [bin], {
    patchCallback: (patches, info) => {
      emitter.emit("change", {
        handle,
        doc: automergeDoc,
        patches,
        patchInfo: info,
      });
    },
  });
  const f = performance.now();
  console.log("Applied change from server in", f - s, "ms");
  updateUI();
  // Handle incoming changes from server
});

// eventSource.onerror = (error) => {
//   console.error("EventSource error:", error);
//   updateConnectionStatus(false);
// };

// Export for debugging
(window as any).automergeDoc = automergeDoc;
(window as any).editorView = editorView;
