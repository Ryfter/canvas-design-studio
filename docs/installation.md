# Installing canvas-design-mcp

This guide covers every supported MCP client. The server is a stdio MCP server — clients that speak stdio connect directly. Clients that require an HTTP/SSE bridge need an extra step.

---

## Prerequisites

- **Node.js 18 or later** — check with `node --version`
- **A Canvas LMS instance** with an API token
- (Optional) A Panopto account if you want video search/embed

---

## Step 1 — Install Globally

```bash
npm install -g github:Ryfter/canvas-design-studio
```

This puts the `canvas-design-mcp` binary on your PATH.

> **Once it's published to npm:** `npm install -g canvas-design-mcp`

---

## Step 2 — Run the Setup Wizard (One Time)

Run the binary once in a terminal to trigger the interactive wizard:

```bash
canvas-design-mcp
```

The wizard asks for your Canvas instance URL, API token, and (optionally) Panopto credentials. It writes config to `~/.canvas-design-mcp/config.json`. Run this once — every client then shares the same config.

After setup, the binary exits the wizard and starts the MCP server (which clients connect to automatically). Close it with Ctrl+C — from this point on the MCP client launches it.

---

## Client Configurations

---

### Claude Desktop

**Config file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "canvas-design-mcp": {
      "command": "canvas-design-mcp"
    }
  }
}
```

Restart Claude Desktop after saving. The hammer icon in the bottom-left of the input box confirms the server is connected.

---

### VS Code (GitHub Copilot)

VS Code uses a `servers` key (not `mcpServers`) and supports both workspace-level and user-level config.

**Workspace config** (checked into the repo — recommended for teams):
`.vscode/mcp.json`

```json
{
  "servers": {
    "canvas-design-mcp": {
      "type": "stdio",
      "command": "canvas-design-mcp"
    }
  }
}
```

**User-level config** (applies to all workspaces):
Add to your VS Code `settings.json`:

```json
{
  "mcp": {
    "servers": {
      "canvas-design-mcp": {
        "type": "stdio",
        "command": "canvas-design-mcp"
      }
    }
  }
}
```

Open the Command Palette → `MCP: List Servers` to verify the server appears and is running.

---

### Cursor

**Config file:** `~/.cursor/mcp.json` (global, applies to all projects)

```json
{
  "mcpServers": {
    "canvas-design-mcp": {
      "command": "canvas-design-mcp"
    }
  }
}
```

Alternatively, create `.cursor/mcp.json` inside a specific project for project-scoped config (same format).

Restart Cursor after saving. Go to **Settings → MCP** to confirm the server shows a green status indicator.

---

### Kiro

**Config file:** `.kiro/settings/mcp.json` inside your project folder (workspace-scoped)

```json
{
  "mcpServers": {
    "canvas-design-mcp": {
      "command": "canvas-design-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

Kiro auto-detects this file when it opens the workspace. Check **Kiro → MCP Servers** in the sidebar to confirm connection.

---

### Codex CLI (ChatGPT CLI)

Codex uses TOML, not JSON. Each server gets its own `[mcp_servers.<name>]` block.

**Config file:** `~/.codex/config.toml`

```toml
[mcp_servers.canvas-design-mcp]
command = "canvas-design-mcp"
args = []
```

If you also want to pass environment variables (e.g., for debugging):

```toml
[mcp_servers.canvas-design-mcp]
command = "canvas-design-mcp"
args = []

[mcp_servers.canvas-design-mcp.env]
NODE_ENV = "production"
```

Run `codex` and use the `/mcp` command to list connected servers.

---

### LM Studio

LM Studio (≥ 0.3.x) supports MCP via a config file.

**Config file:** `%USERPROFILE%\.lmstudio\mcp.json` (Windows) / `~/.lmstudio/mcp.json` (macOS/Linux)

```json
{
  "mcpServers": {
    "canvas-design-mcp": {
      "command": "canvas-design-mcp",
      "args": []
    }
  }
}
```

Restart LM Studio after saving. In the Chat tab, click the plug icon to verify the server is listed.

---

### AnythingLLM

AnythingLLM Desktop stores MCP config in:

- **Windows:** `%APPDATA%\anythingllm-desktop\storage\plugins\anythingllm_mcp_servers.json`
- **macOS:** `~/Library/Application Support/anythingllm-desktop/storage/plugins/anythingllm_mcp_servers.json`
- **Linux:** `~/.config/anythingllm-desktop/storage/plugins/anythingllm_mcp_servers.json`

```json
{
  "mcpServers": {
    "canvas-design-mcp": {
      "command": "canvas-design-mcp",
      "args": []
    }
  }
}
```

After saving, restart AnythingLLM Desktop and go to **Settings → Agent Skills → MCP Servers** to enable the server for your workspace agent.

---

### Antigravity

Antigravity manages MCP config through its UI — there's no file to edit manually.

1. Open Antigravity and go to **Settings → Integrations → MCP Servers**
2. Click **Add Server**
3. Set **Name:** `canvas-design-mcp`
4. Set **Command:** `canvas-design-mcp`
5. Leave **Args** empty
6. Click **Save**

Antigravity writes its own `mcp_config.json` internally. The server should appear with a green status indicator immediately after saving.

---

### Open WebUI

Open WebUI requires an HTTP/SSE bridge because it communicates with tools over HTTP, not stdio. Use `mcpo` to wrap the stdio server.

**Step 1 — Install mcpo:**

```bash
pip install mcpo
```

**Step 2 — Start the bridge:**

```bash
mcpo --port 8808 -- canvas-design-mcp
```

Leave this running. It exposes the MCP server at `http://localhost:8808`.

**Step 3 — Add to Open WebUI:**

1. Go to **Settings → Tools**
2. Click **Add Tool Server**
3. Set **URL:** `http://localhost:8808`
4. Click **Save**

The tools appear in the chat interface. To keep the bridge running persistently, set it up as a system service or add it to your shell profile.

**Alternative — Docker Compose:**

If you run Open WebUI via Docker Compose, add an `mcpo` service:

```yaml
services:
  mcpo:
    image: ghcr.io/open-webui/mcpo:main
    command: --port 8808 -- canvas-design-mcp
    volumes:
      - ~/.canvas-design-mcp:/root/.canvas-design-mcp:ro
    ports:
      - "8808:8808"
```

---

### Ollama

Ollama itself does not have a built-in MCP client. To use canvas-design-mcp with Ollama-hosted models, you need a front-end that supports both MCP and Ollama:

- **Open WebUI** (recommended) — add Ollama as the model backend and connect MCP via the HTTP bridge above
- **AnythingLLM** — set Ollama as the LLM provider and configure MCP as shown above
- **LM Studio** — can load Ollama-compatible models and supports MCP directly

Once your chosen front-end is running with Ollama as the backend, follow that client's MCP instructions above.

---

### ChatGPT Web

ChatGPT's web interface does not support custom MCP servers. The Responses API (for developers) can connect to remote MCP servers over HTTP, but there is no way to connect a local stdio server from the ChatGPT.com UI.

**What you can do instead:**

- Use **Codex CLI** (the `codex` terminal tool from OpenAI) — it supports stdio MCP natively via `~/.codex/config.toml` as shown above
- Build an HTTP wrapper and deploy it, then connect via the OpenAI Responses API in your own code

---

## Upgrading

To pull the latest version from GitHub:

```bash
npm install -g github:Ryfter/canvas-design-studio
```

Config in `~/.canvas-design-mcp/` is untouched by upgrades. Re-run the setup wizard only if you need to change your institution settings:

```bash
rm ~/.canvas-design-mcp/config.json
canvas-design-mcp
```

---

## Troubleshooting

**"No institution config found" on server start**

The wizard hasn't been run yet, or config was deleted. Run `canvas-design-mcp` in a terminal to trigger the wizard.

**Server shows as disconnected in client**

1. Confirm `canvas-design-mcp` is on your PATH: `which canvas-design-mcp` (macOS/Linux) or `where canvas-design-mcp` (Windows)
2. If not found, re-run `npm install -g github:Ryfter/canvas-design-studio`
3. Restart the client application after any config change

**Canvas API errors ("Invalid access token")**

Re-run the wizard to update your token: delete `~/.canvas-design-mcp/config.json` and run `canvas-design-mcp`.

**Panopto search returns no results**

Panopto credentials are optional. If not configured during wizard setup, Panopto tools will return an error. Re-run the wizard to add them.

**Windows path issues**

Use PowerShell and confirm Node is on your PATH: `node --version`. If `npm install -g` succeeds but `canvas-design-mcp` isn't found, add the npm global bin directory to your PATH:

```powershell
npm config get prefix
# Add <prefix>\bin to your PATH in System Environment Variables
```
