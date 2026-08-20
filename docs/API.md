# API Reference

Base URL: `http://localhost:3001/api`

All authenticated endpoints expect a `Authorization: Bearer <token>` header. Tokens are issued by `POST /login` and expire after 24 hours.

---

## Authentication

### `POST /login`
Authenticates a user and returns a JWT.
- **Auth:** none
- **Body:** `{ username, password }`
- **Response:** `{ token, id, username, role }`

---

## Users

| Method & Path | Description | Auth |
|---|---|---|
| `GET /users` | List all users | `admin` |
| `GET /users/:username` | Public profile + match history | none |
| `POST /users` | Register a user (defaults to `player`; only an `admin` token can assign `organizer`/`admin`) | none / `admin` |
| `PUT /users/:id` | Update email/password (own profile or `admin`) | required |
| `DELETE /users/:id` | Delete a user | `admin` |
| `GET /users/:id/registrations` | Tournaments the user is registered in, with registration status | own user / `admin` |
| `GET /users/:id/tournaments` | Tournaments the user owns | `organizer` (own) / `admin` |

## Videogames

| Method & Path | Description | Auth |
|---|---|---|
| `GET /videogames` | List all videogames | none |
| `GET /videogames/:id` | Get a videogame | none |
| `POST /videogames` | Create a videogame | `admin` |
| `PUT /videogames/:id` | Update a videogame | `admin` |
| `DELETE /videogames/:id` | Delete a videogame (blocked while it has active tournaments) | `admin` |

## Tournaments

| Method & Path | Description | Auth |
|---|---|---|
| `GET /tournaments` | List all tournaments | none |
| `GET /tournaments/:id` | Full tournament detail: players, organizers, matches, standings (if finished) | none |
| `POST /tournaments` | Create a tournament; matches are auto-generated from `type` + `max_players` | `organizer` |
| `PUT /tournaments/:id` | Update tournament data | owner / `admin` |
| `DELETE /tournaments/:id` | Delete a tournament and all related data | owner / `admin` |
| `POST /tournaments/:id/start` | Move to `ongoing`, auto-assign approved players to matches | owner / `admin` |
| `POST /tournaments/:id/finish` | Move to `finished`, compute final standings (requires all matches completed) | owner / `admin` |
| `POST /tournaments/:id/register` | Register the authenticated player | `player` |
| `PUT /tournaments/:id/registrations` | Open/close registrations | owner / `admin` |
| `PUT /tournaments/:id/players/:userId` | Approve/reject a registration | owner, support organizer / `admin` |
| `POST /tournaments/:id/organizers` | Add a support organizer | owner / `admin` |
| `DELETE /tournaments/:id/organizers/:userId` | Remove a support organizer | owner / `admin` |

## Matches

| Method & Path | Description | Auth |
|---|---|---|
| `GET /matches/:id` | Get a match | none |
| `PUT /matches/:id` | Set winner/scores (setting `winner_id` auto-completes the match); a completed match is immutable | tournament organizer / `admin` |

---

## Data Model

```
users
  id · username (unique) · email (unique) · password_hash · role [player|organizer|admin]

videogames
  id · name (unique) · description?

tournaments
  id · name · description? · videogame_id → videogames
  owner_id → users · type [elimination|league] · status [planned|ongoing|finished]
  start_date · end_date? · max_players · registrations_open

tournament_organizers   (many-to-many: support organizers)
  tournament_id → tournaments · user_id → users

tournament_players       (registrations)
  id · tournament_id → tournaments · user_id → users · status [pending|approved|rejected]

matches
  id · tournament_id → tournaments
  player1_id / player2_id / winner_id → users
  status [pending|assigned|completed] · round · score_player1 · score_player2

final_standings
  id · tournament_id → tournaments · user_id → users · position · points
```

Foreign keys cascade on delete: removing a videogame removes its tournaments; removing a tournament removes its matches, registrations, support organizers, and standings.

---

## Design Decisions

**Match generation is deterministic and automatic.** Matches are created the moment a tournament is created, based on `type` and `max_players` — `max_players - 1` matches for elimination brackets (distributed across rounds), `max_players * (max_players - 1) / 2` for round-robin leagues. This keeps the schema consistent and avoids having to reconcile match counts after the fact.

**Player assignment happens on `/start`, not on approval.** Approved players are only wired into their matches when the organizer explicitly starts the tournament, rather than incrementally as each registration is approved. This avoids partially-filled brackets and gives the organizer a single, deliberate go/no-go moment.

**Match completion is implicit.** Submitting a `winner_id` automatically flips the match to `completed` — the client never has to send status transitions explicitly, which removes a class of client/server disagreement bugs.

**Elimination winners auto-advance.** When a winner is set, the system finds the next open slot in the following round and assigns them — no separate "advance" call needed.

**Standings require full completion.** `/finish` refuses to run while any match is still `pending`/`assigned`, guaranteeing the computed standings are never based on partial data.

**Roles are mutually exclusive.** A user is exactly one of `player`, `organizer`, or `admin`. This is a deliberate simplification — for example, an organizer cannot also register as a player in the same account — that keeps authorization logic simple and auditable. `admin` bypasses ownership checks entirely and can act on any tournament.

**Support organizers vs. owners.** A tournament owner can delegate match management (score entry, approvals) to support organizers, but administrative actions (editing core tournament data, starting/finishing, deleting, managing the organizer list) remain owner-only.

**Extended endpoints for the frontend.** `GET /users/:id/registrations` and `GET /users/:id/tournaments` exist purely to serve the frontend's "My Registrations" and "My Tournaments" views efficiently, avoiding an O(n) client-side scan over all tournaments. They follow the same authorization rule as the rest of the API: only the resource owner or an `admin` can access them.

**Security.** Password hashes are never returned by any endpoint. JWTs expire after 24 hours to bound the blast radius of a leaked token. `.env` and the SQLite database file are excluded from version control.
