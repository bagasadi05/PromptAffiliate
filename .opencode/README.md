# OpenCode Ensemble Configuration (Cloud Auth)

This configuration enables a **Multi-Model Autonomous Swarm** utilizing **OpenCode Cloud Auth**.

Access to all models is managed via your single OpenCode authentication token. No individual API keys are required.

## 🧠 The AI Triad

| Model | Role | Trigger Tasks |
|-------|------|---------------|
| **Gemini 3 Pro** | **The Architect** | Project planning, analyzing huge context, security auditing, final code review. |
| **Claude Opus 4.6** | **The Engineer** | Writing complex logic, difficult refactoring, creative solutions, algorithm design. |
| **GPT Codex 5.3** | **The Builder** | Fast boilerplate code, writing unit tests, executing shell commands, simple scripts. |

## 🔑 Setup Required

You only need **ONE** token:

```bash
# Set your unified OpenCode Auth Token
export OPENCODE_AUTH_TOKEN="oc_..."
```

*(Note: If you are logged in via the OpenCode CLI (`opencode login`), this token is likely already managed for you automatically.)*

## 🔄 How Auto-Switching Works

The system routes tasks through the OpenCode Gateway:

1.  **Planning/Review** -> Routes to **Gemini 3 Pro**.
2.  **Logic/Refactoring** -> Routes to **Claude Opus 4.6**.
3.  **Scripting/Tests** -> Routes to **Codex 5.3**.
