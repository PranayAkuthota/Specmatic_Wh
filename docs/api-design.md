# WorkHive API Design Documentation

WorkHive uses **OpenAPI 3.1.0** specifications for defining all REST contracts. Contracts are designed spec-first to align backend developments, frontend consumers, and automated contract testing from day zero.

## OpenAPI 3.1 Benefits
- **Full JSON Schema 2020-12 Integration**: Allows complete validation capability (e.g. `nullable`, complex polymorphism, pattern-matching) within schema definitions.
- **Improved Type Systems**: Supports array-types directly, enhancing compatibility with modern TypeScript compiler interfaces.
- **Contract-as-Code**: Enables Specmatic to generate executable mock servers and test runs automatically.

---

## Endpoint Details

### 1. Authentication Specs
Located at [auth.yaml](file:///Users/pranaykumarakuthota/.gemini/antigravity/scratch/workhive/api-specs/auth.yaml)

- `POST /register`: Atomically creates a Tenant and its first user (assigned the `OWNER` role).
  - Request:
    ```json
    {
      "name": "Alice Smith",
      "email": "alice@example.com",
      "password": "securepassword123",
      "tenantName": "Acme Corp"
    }
    ```
  - Response (201):
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": { "id": 1, "name": "Alice Smith", "email": "alice@example.com", "role": "OWNER", "tenantId": 1 },
      "tenant": { "id": 1, "name": "Acme Corp", "createdAt": "2026-06-12T15:00:00Z" }
    }
    ```

- `POST /login`: Verifies user credentials and returns a JWT token.
  - Request:
    ```json
    {
      "email": "alice@example.com",
      "password": "securepassword123"
    }
    ```

- `GET /profile`: Fetches details of the currently authenticated user session.
  - Requires `Authorization: Bearer <token>` header.

---

### 2. Tenant Management
Located at [tenants.yaml](file:///Users/pranaykumarakuthota/.gemini/antigravity/scratch/workhive/api-specs/tenants.yaml)

- `POST /tenants`: Create a tenant. (Primarily for administrative or system registration actions).
- `GET /tenants`: List all tenants.
- `GET /tenants/{id}`: Fetch details for a specific tenant.

---

### 3. Workspaces Management
Located at [workspaces.yaml](file:///Users/pranaykumarakuthota/.gemini/antigravity/scratch/workhive/api-specs/workspaces.yaml)

Workspaces organize tasks. All operations are isolated by `tenant_id` resolved from the caller's JWT token.

- `POST /workspaces`: Creates a workspace.
  - Request:
    ```json
    {
      "name": "Engineering",
      "description": "Dev sprint cycles"
    }
    ```
- `GET /workspaces`: Lists all workspaces belonging to the caller's organization.
- `GET /workspaces/{id}`: Returns workspace metadata. Fails with `404` if the workspace belongs to a different tenant.

---

### 4. Tasks Management
Located at [tasks.yaml](file:///Users/pranaykumarakuthota/.gemini/antigravity/scratch/workhive/api-specs/tasks.yaml)

Tasks represent items of work.

- `POST /tasks`: Creates a task in a workspace. Validates that the workspace resides inside the active user's tenant.
- `GET /tasks`: Lists tasks. Can be filtered by `workspaceId` using a query parameter.
- `GET /tasks/{id}`: Fetches details of a specific task.
- `PUT /tasks/{id}`: Modifies task properties (`title`, `description`, `priority`, `status`, `dueDate`).
- `DELETE /tasks/{id}`: Deletes a task.

---

## HTTP Status Codes & Error Formats
Errors return a standard JSON body with an `error` key matching the `ErrorResponse` schema:
```json
{
  "error": "Error details explain what failed"
}
```

Common status mappings:
- `200 OK`: Successful retrieval or modification.
- `201 Created`: Successful creation of a resource.
- `400 Bad Request`: Input validation failed, or workspace does not belong to user's tenant.
- `401 Unauthorized`: No token, invalid token, or expired token provided.
- `404 Not Found`: Requesting a resource that does not exist or belongs to another tenant (logical protection).
