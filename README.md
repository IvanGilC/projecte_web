# 🏆 Tournament App

A full-stack tournament management platform. Organizers create tournaments (single-elimination or round-robin league), players register and get approved, matches are generated and tracked automatically, and final standings are computed once every match is complete.

Built with a **Node.js/Express REST API** backed by **SQLite**, and a **React (Vite) SPA** frontend consuming it over Axios.

---

## ✨ Features

- **JWT authentication** with three roles: `player`, `organizer`, `admin`
- **Automatic bracket / league generation** on tournament creation, based on format and player cap
- **Full tournament lifecycle**: planned → ongoing → finished, with registration approval workflow
- **Automatic round advancement** for elimination brackets when a match result is submitted
- **Role-aware authorization** at the route level (owners, support organizers, and admins have distinct permissions)
- **Public read endpoints** (browse tournaments, videogames, and player profiles without logging in)
- Fully covered by an **integration test suite** (Node's built-in test runner + Supertest)

## 🧱 Tech Stack

**Backend**
- Node.js · Express 5
- SQLite (`better-sqlite3`)
- JWT (`jsonwebtoken`) + `bcrypt` for password hashing
- `supertest` / `node:test` for integration testing

**Frontend**
- React 19 · Vite
- React Router
- Axios

## 🏗️ Architecture

```
┌──────────────┐        REST/JSON        ┌──────────────────┐
│  React (SPA) │ ───────────────────────▶│  Express API      │
│  Vite / axios│ ◀─────────────────────── │  JWT middleware   │
└──────────────┘                          │  Role-based auth  │
                                           └─────────┬─────────┘
                                                      │
                                                 ┌────▼─────┐
                                                 │  SQLite   │
                                                 │ (better-  │
                                                 │  sqlite3) │
                                                 └───────────┘
```

Layered backend structure: `controllers/` (HTTP layer) → `models/` (SQL access) → `utils/` (auth middleware, config, logging). The frontend follows a `pages/ + services/ + context/` structure, with the API client centralized in `services/api.js` and auth state provided via React Context.

Full endpoint reference: **[docs/API.md](docs/API.md)**

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18

### 1. Backend

```bash
git clone https://github.com/<your-username>/tournament-app.git
cd tournament-app
npm install
cp .env.example .env   # then edit values as needed
npm run dev             # http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Both servers need to be running for the app to work end to end. On first boot, a default admin user is created automatically using the credentials from `.env` (`ADMIN_PASSWORD`).

## 🧪 Testing

```bash
npm test
```

Runs the full integration suite (users, tournaments, matches) against an in-memory SQLite database — no setup required.

## 📁 Project Structure

```
├── controllers/     # Express route handlers
├── models/          # SQL queries / data access layer
├── utils/           # auth middleware, config, logger
├── tests/           # integration tests (node:test + supertest)
├── docs/
│   └── API.md        # full API reference & design decisions
└── frontend/
    ├── src/
    │   ├── pages/     # route-level views
    │   ├── services/  # API client + per-resource service modules
    │   └── context/   # auth context/provider
    └── ...
```

## 🧭 Pages & Access Control

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page with live stats and quick links to ongoing/upcoming tournaments |
| `/tournaments` | Public | Browse all tournaments, filter by name, videogame, and status |
| `/tournaments/:id` | Public | Tournament detail: players, organizers, bracket/league view, final standings |
| `/tournaments/new` | `organizer` | Create a tournament |
| `/tournaments/:id/manage` | owner, support organizer, `admin` | Approve players, edit match results, edit tournament data, start/finish/delete (owner-only actions gated within the same page) |
| `/videogames` | Public (write: `admin`) | Browse videogames; admins can create/edit/delete inline |
| `/profile/:username` | Authenticated | Public profile + match history; self/`admin` can edit |
| `/my-registrations` | `player` | Tournaments the player is registered in, with approval status |
| `/my-tournaments` | `organizer` | Tournaments the user owns |
| `/users`, `/users/new` | `admin` | User management |
| `/login`, `/register` | Public | Auth flows |

Route-level access is enforced client-side via a `ProtectedRoute` wrapper (redirects to `/login` or shows a 403 view) and server-side via the API's role middleware — the frontend guard is a UX convenience, not the security boundary.

## 🗺️ Roadmap

- [ ] Pagination on list endpoints
- [ ] WebSocket-based live match/bracket updates
- [ ] Dockerized deployment (backend + frontend + reverse proxy)
- [ ] E2E tests with Playwright

## 👥 Authors

- [Ivan Gil Cañizares](https://github.com/IvanGilC)
- [Marco Beruet Morelli](https://github.com/marcoberuetmor)

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.
