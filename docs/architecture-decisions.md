# Architectural Decision Records (ADRs) — Cancer Institute Platform

This document logs the critical architectural decisions made for the Cancer Institute Management & AI Research Platform, documenting context, choices, and consequences.

---

## ADR-001: Choice of Database (MySQL 8)

### Status
Accepted

### Context
The platform manages relational healthcare data (patients, histories, stages, treatments, documents, and audit logs) requiring strict integrity constraints, foreign key validation, and transactional support (ACID). We need to choose a database engine that fits these requirements.

### Decision
Utilize **MySQL 8** as the primary relational database system, utilizing SQLAlchemy 2.x (async) and Alembic for schema migrations.

### Consequences
- **Pros**:
  - Full support for transactional ACID compliance, crucial for medical records integrity.
  - Native JSON column types allowing flexible schema mapping for variable data (e.g., polymorphism of treatment details or AI raw response JSONs) without resorting to complex EAV patterns.
  - Standardized enterprise tooling and database administrators support.
- **Cons**:
  - Lacks some advanced object-relational mapping capabilities of PostgreSQL (such as table inheritance), but this is mitigated by standard SQLAlchemy polymorphic modeling.
  - Requires explicit index planning for text searches, though AI summarization search needs will be handled separately or via simple query filters.

---

## ADR-002: Token-Based Authentication & Session Strategy

### Status
Accepted

### Context
We must secure access to clinical patient records and research datasets across three distinct user roles (Super Admin, Admin, and Student). The session strategy must prevent session hijacking, cross-site scripting (XSS), and cross-site request forgery (CSRF) vulnerabilities.

### Decision
Implement a **JWT (JSON Web Token) Access Token + Cookie-Based Refresh Token** strategy:
1. **Access Tokens**: Short-lived (30 minutes) JWT access tokens returned in the HTTP response body. The frontend stores this token in-memory (Redux state).
2. **Refresh Tokens**: Long-lived (7 days) database-backed refresh tokens stored in a secure, `HttpOnly`, `SameSite=Strict`, `Secure` cookie.
3. **Session Rotation**: The backend implements refresh token rotation (RTR) where each reuse of a refresh token invalidates the token family to prevent replay attacks.

### Consequences
- **Pros**:
  - Highly secure; in-memory access tokens are protected from persistent XSS storage attacks, and `HttpOnly` cookies protect refresh tokens from access by client scripts.
  - Decoupled API calls; access tokens can be verified statelessly by the backend API without hitting the DB, improving response times.
- **Cons**:
  - Requires the client to coordinate refreshing the access token in the background before expiration (implemented via an Axios interceptor).
  - Session revoking requires blacklisting or database lookups for active refresh tokens, slightly adding to database complexity.

---

## ADR-003: Asynchronous AI Processing via Celery & Redis

### Status
Accepted

### Context
Processing uploaded medical reports involves CPU-intensive OCR (Tesseract / OpenCV) and I/O-intensive external API calls (Google Gemini API). Running these operations synchronously within the FastAPI request lifecycle would tie up web worker threads, lead to client timeouts, and degrade platform responsiveness.

### Decision
Implement an **Asynchronous Task Queue using Celery with Redis as the broker**:
1. FastAPI validates report uploads, stores the file to GCS, creates a database record, and pushes a task message to Redis before immediately returning a `202 Accepted` response.
2. Background Celery workers listen to the Redis queue, download files from GCS, perform OCR text extraction, interact with the Gemini API for clinical summarization, and update the database with results.

### Consequences
- **Pros**:
  - The API remains responsive and scales well, with upload response times independent of AI processing duration.
  - Enables rate-limiting, retries, and error tolerance for external Gemini API calls.
- **Cons**:
  - Adds infrastructure footprint (Redis server and Celery daemon).
  - Requires the client to poll the backend or use real-time sockets to display the processing status and results to users.

---

## ADR-004: Feature-Folder Frontend Architecture

### Status
Accepted

### Context
Standard React boilerplates organize code by files type (e.g., putting all components in `components/`, hooks in `hooks/`, styles in `styles/`). As an enterprise project grows, developers must open multiple distant folders to make changes to a single feature, leading to high cognitive load and code coupling.

### Decision
Adopt a **Feature-Folder (Feature-Sliced) Frontend Structure**:
- Code under `src/features/` is organized by functional domain (e.g., `features/auth/`, `features/patients/`, `features/research/`, `features/reports/`).
- Each feature directory houses its specific components, hooks, Redux slices, Axios API slices, and TS types.
- Global, reusable code is stored in `src/components/shared/`, `src/components/ui/`, `src/hooks/`, or `src/lib/`.

### Consequences
- **Pros**:
  - High cohesion; all code representing a functional module is co-located, facilitating onboarding and maintenance.
  - Easy deletion or refactoring; a feature folder can be removed or restructured with minimal impact on the rest of the application.
- **Cons**:
  - Requires developers to maintain discipline about imports: features should not import internals from other features directly (they must import from the public entry point or share via global slices).
