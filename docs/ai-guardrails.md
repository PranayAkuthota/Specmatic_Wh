# Specmatic as Guardrails for AI Coding Agents

In modern software development, AI coding assistants (such as Cursor, Claude, and ChatGPT) are widely used to generate application features, views, and tests. However, AI generation can lead to **integration drift** — where the AI introduces subtle code variations, API format differences, or unexpected request/response structures.

WorkHive showcases how **Specmatic** acts as an automated, executable guardrail to regulate AI code generation.

---

## The Integration Drift Problem

When an AI agent is asked to "Implement a task creation API view", it might write:
1. Response fields in `snake_case` (e.g., `workspace_id`) instead of the contracted `camelCase` (`workspaceId`).
2. Return status `200 OK` instead of `201 Created`.
3. Unexpected nested structures for errors (e.g. `{"detail": "..."}` instead of `{"error": "..."}`).

Without automated checks, these variations go unnoticed until deployment, causing frontend application crashes or broken third-party integrations.

---

## How Specmatic Solves This

Specmatic acts as a rigid, contract-based compiler for API behavior:

```
┌──────────────────────────┐
│  OpenAPI 3.1 Contract    │◄─── Single Source of Truth
└────────────┬─────────────┘
             │
             ├─────────────────────────────────────────┐
             ▼                                         ▼
┌──────────────────────────┐             ┌──────────────────────────┐
│  AI Agent Code Gen       │             │   Specmatic Test Runner  │
│  (Cursor, Claude, etc.)  │             │   (Validates DRF views)  │
└────────────┬─────────────┘             └─────────────▲────────────┘
             │                                         │
             ▼                                         │
┌──────────────────────────┐                           │
│  Generated Backend Code  ├───────────────────────────┘
│  (Django Service/Views)  │ (Generates dynamic checks & highlights drift)
└──────────────────────────┘
```

1. **Contract First**: The OpenAPI yaml file is locked before any implementation begins.
2. **AI Implementation**: The developer instructs the AI coding agent to implement the backend view matching the contract.
3. **Execution Guardrails**: The developer runs the Specmatic test runner:
   ```bash
   specmatic test --host=localhost --port=8000
   ```
4. **Immediate Feedback**: If the AI-generated code deviates from the spec (e.g., missing a required header, returning an integer as a string, or outputting a different status code), Specmatic prints a precise schema validation failure.
5. **Self-Correction**: The developer pastes the Specmatic error log back into the AI assistant. The AI can analyze the exact contract violation and correct its code immediately.

---

## Real-World Example: Serializer Drift

Consider this AI-generated serializer missing a field mapping:

```python
# AI Generated code (Drifted!)
class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ["id", "title", "description", "priority", "status", "workspace"] # Using snake_case 'workspace'
```

Specmatic runs the contract tests against this implementation, sees that `/tasks` returns `workspace` instead of `workspaceId`, and fails the test:

```
>> RESPONSE BODY DOES NOT MATCH CONTRACT
>> Path: /tasks
>> Expected: workspaceId (integer)
>> Actual: workspace (integer)
```

By correcting the AI with this log, it generates the proper camelCase source mapping:
```python
# Corrected Code
class TaskSerializer(serializers.ModelSerializer):
    workspaceId = serializers.IntegerField(source="workspace_id")
    # ...
```
This loop ensures 100% adherence to the API contract, preventing integration drift across frontend, backend, and third-party systems.
