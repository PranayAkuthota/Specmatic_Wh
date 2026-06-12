# Specmatic Integration & Setup Guide

This guide explains how **Specmatic** is integrated into WorkHive to drive Spec-First Engineering, Contract Testing, API Stubbing, Backward Compatibility Checks, and Schema Resiliency Testing.

---

## 1. Specmatic Concepts

Specmatic is a contract testing tool that turns your OpenAPI contracts into executable specifications:
- **Executable Contract**: Instead of writing manual integration mocks, the OpenAPI YAML file is the single source of truth used to run mocks and test servers.
- **Specmatic Stub (Mocking)**: Enables developers (e.g. frontend) to run a mock server based on the contract and pre-defined JSON examples. No backend code is required to start developing the frontend.
- **Specmatic Test (Contract Verification)**: Asserts that a running backend API conforms exactly to the OpenAPI contract by making generative HTTP requests and validating response status and structures.

---

## 2. Configuration (`specmatic.yaml`)

Our `specmatic.yaml` configuration links the specifications and enables schema resilience checking:
```yaml
# specmatic.yaml
sources:
  - provider: filesystem
    directories:
      - api-specs
schemaResiliencyTests: all
```
- **Filesystem Provider**: Reads local specs under the `api-specs` folder.
- **Schema Resiliency Tests**: Setting this to `all` instructs Specmatic to auto-generate edge-case request inputs (nulls, missing fields, type mismatches) to verify that the backend handles validation failures gracefully (typically responding with 4xx rather than 500 Internal Server Errors).

---

## 3. Specmatic Commands Reference

Ensure Java 17+ and Node.js are installed on your environment. Run `npm install -g specmatic` to make commands available.

### A. Specmatic Stub (Local Mock Server)
Start a stub server on port 9000 using your contracts and examples:
```bash
specmatic stub --port=9000
```
- **Frontend Autonomy**: Once started, the React frontend can direct its requests to `http://localhost:9000`. Specmatic will match incoming request paths and bodies with the contract and return the structured mock data declared in `examples/`.

### B. Specmatic Test (Backend Verification)
Verify that your local running Django server conforms to the contract.
1. Spin up the Django application:
   ```bash
   cd backend
   python manage.py migrate
   python manage.py runserver 8000
   ```
2. In a separate terminal, execute the contract tests:
   ```bash
   specmatic test --host=localhost --port=8000
   ```
   Specmatic automatically generates requests for every path defined in the OpenAPI files, sends them to Django, and asserts that the response headers, body key-names, and data types match the contract.

### C. Example Validation
Specmatic validates that all example files inside `examples/` comply with the OpenAPI contract. This happens automatically when running `specmatic stub` or `specmatic test`. If a JSON file contains fields not in the spec, or missing required fields, Specmatic will print an error.

### D. Backward Compatibility Checks
When modifying contracts, Specmatic compares the current contract files with the baseline contracts (e.g., from the main git branch) to ensure no existing consumers will break:
```bash
specmatic compare --base=main --current=HEAD
```
- **Breaking changes** include: deleting paths, renaming parameters, marking optional inputs as required, or changing data types. Specmatic will block the build if any such changes are found.
- **Non-breaking changes** include: adding new paths or adding optional request parameters.
