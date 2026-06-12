# WorkHive Architecture & Design Documentation

This document describes the clean architecture, multi-tenancy implementation, and database relationships for WorkHive.

## Clean Architecture Layers

WorkHive follows Clean Architecture principles by separating the application concerns into four distinct layers:

```
[ Frontend: React Dashboard ]
            │ (HTTP REST API)
            ▼
┌─────────────────────────────────────────────────────────┐
│ BACKEND SERVICES (Django REST Framework)                 │
│                                                         │
│  1. Views Layer (Class-Based Views)                     │
│     - Deserializes inputs using Serializers             │
│     - Resolves JWT credentials                          │
│     - Delegates actions to the Service layer            │
│     - Returns standardized JSON matching OpenAPI spec   │
│                                                         │
│  2. Service Layer (Business Logic Services)              │
│     - Validates tenant membership and permissions       │
│     - Coordinates transactions across entities          │
│     - Encrypts user passwords & generates JWTs          │
│                                                         │
│  3. Repository Layer (Data Access Repositories)          │
│     - Enforces tenant isolation on all database queries│
│     - Translates business operations into database ORMs │
│                                                         │
│  4. Entity Models Layer (Django ORM Models)              │
│     - Defines properties: Tenant, User, Workspace, Task │
└─────────────────────────────────────────────────────────┘
```

- **Views Layer**: Implemented inside `core/views.py`. Views extract path/query parameters, deserialize inputs with DRF Serializers (`core/serializers.py`), delegate execution to Services, and return JSON responses.
- **Service Layer**: Implemented inside `core/services.py`. This contains the core business logic (e.g. JWT token generation, checking if a workspace belongs to the user's tenant before adding a task, hashing passwords).
- **Repository Layer**: Implemented inside `core/repositories.py`. This handles all queries to the database. To guarantee tenant safety, all query filters are written here, preventing cross-tenant data leaks.
- **Models (Entity) Layer**: Implemented inside `core/models.py`. Defines schemas and relations.

---

## Logical Multi-Tenancy Strategy

WorkHive implements a **Shared-Database, Shared-Schema** logical multi-tenancy model. 
- A `Tenant` represents an independent organization.
- Every `User` is associated with a single `Tenant` via a foreign key `tenant_id`.
- Every `Workspace` is linked to a `Tenant` via a foreign key `tenant_id`.
- Every `Task` is linked to a `Workspace`, which implicitly scopes it to a `Tenant` (we join `Task` and `Workspace` to filter by `tenant_id`).

### Multi-Tenant Query Isolation Code Pattern
In the repository layer (`core/repositories.py`), all query operations verify ownership:
```python
# Filtering workspaces by active user's tenant
Workspace.objects.filter(tenant_id=tenant_id)

# Querying tasks belonging to a workspace, ensuring it resides in user's tenant
Task.objects.filter(id=task_id, workspace__tenant_id=tenant_id)
```

---

## Sequence Workflows (Mermaid Diagrams)

### 1. User Registration & Tenant Creation
This workflow demonstrates how a new tenant and user are created atomically upon registration.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant V as RegisterView
    participant S as AuthService
    participant TR as TenantRepository
    participant UR as UserRepository
    participant WR as WorkspaceRepository
    database DB as PostgreSQL

    User->>V: POST /register {email, password, name, tenantName}
    V->>S: register(name, email, password, tenantName)
    
    S->>TR: create(tenantName)
    TR->>DB: INSERT INTO tenants (name)
    DB-->>TR: Tenant (id: 1)
    TR-->>S: tenantObj
    
    S->>UR: create(name, email, password, OWNER, tenantObj)
    UR->>DB: INSERT INTO users (name, email, password, role, tenant_id)
    DB-->>UR: User (id: 1)
    UR-->>S: userObj
    
    S->>WR: create("General Workspace", tenantObj)
    WR->>DB: INSERT INTO workspaces (name, tenant_id)
    DB-->>WR: Workspace (id: 1)
    
    S->>S: generate_token(userObj)
    Note over S: Encodes User ID and Tenant ID inside JWT
    S-->>V: (token, userObj, tenantObj)
    
    V-->>User: 201 Created {token, user, tenant}
```

### 2. Task Creation with Multi-Tenant Validation
This workflow demonstrates how a task is created, showing how the service layer enforces that the workspace belongs to the user's tenant.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant JWT as JWTAuthentication
    participant V as TaskListCreateView
    participant S as TaskService
    participant WR as WorkspaceRepository
    participant TR as TaskRepository
    database DB as PostgreSQL

    User->>V: POST /tasks {title, workspaceId} with Header "Bearer <token>"
    V->>JWT: authenticate(request)
    Note over JWT: Decodes JWT payload: user_id=1, tenant_id=1
    JWT-->>V: (user, token) and attaches request.tenant_id = 1
    
    V->>S: create_task(title, ..., workspaceId, tenantId=1)
    
    S->>WR: get_by_id(workspaceId, tenantId=1)
    Note over WR: Enforces tenant_id isolation check!
    WR->>DB: SELECT * FROM workspaces WHERE id=workspaceId AND tenant_id=1
    DB-->>WR: Workspace Object (or None)
    WR-->>S: Workspace Object
    
    alt Workspace exists and belongs to tenant
        S->>TR: create(title, ..., workspaceObj)
        TR->>DB: INSERT INTO tasks (title, workspace_id)
        DB-->>TR: Task (id: 10)
        TR-->>S: Task Object
        S-->>V: Task Object
        V-->>User: 210 Created {id: 10, title: "...", workspaceId: 1}
    else Workspace not found or belongs to another tenant
        S-->>V: raise ValueError("Workspace not found")
        V-->>User: 400 Bad Request {"error": "Workspace not found"}
    end
```
