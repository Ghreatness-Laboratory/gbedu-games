# Gbedu Games: Multiplayer Naija Whot Platform

> **"Play. Connect. Win."**

A real-time, authoritative multiplayer Nigerian Whot card platform built with **React**, **Node.js**, **Express**, **Socket.IO**, **Supabase (Auth/RLS/Postgres)**, and a dedicated, pure-TypeScript unit-tested engine (`@gbedu/whot-engine`).

---

## 1. Architecture Overview

- **Auth & Persistent Data**: Handled via Supabase (or in-memory mock during development).
- **Live Gameplay**: Single authoritative server via Node.js Express + Socket.IO.
- **Client Security**: Private hands and draw piles are NEVER broadcast to opponents. Each client receives a strictly sanitized view via `getPlayerView()`.
- **Authoritative Engine**: `@gbedu/whot-engine` controls turn flow, special cards, pick accumulation, callouts, and win validation.
- **Single Process / Dev Port**: Runs Express + Socket.IO on `0.0.0.0:3000` with Vite middlewares mounted in development (`npm run dev`).

---

## 2. Standard Nigerian Whot Deck (54 Cards)

The deck consists of the official 54 standard Nigerian Whot cards:
- **Circles (12)**: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14
- **Triangles (12)**: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14
- **Crosses (9)**: 1, 2, 3, 5, 7, 10, 11, 13, 14
- **Squares (9)**: 1, 2, 3, 5, 7, 10, 11, 13, 14
- **Stars (7)**: 1, 2, 3, 4, 5, 7, 8
- **Whot 20 (5)**: 5 Wild Cards

### Special Card Effects
- **Card 1 (Hold On)**: The active player plays again.
- **Card 2 (Pick Two)**: The next player draws 2 cards (or passes the penalty).
- **Card 5 (Pick Three)**: The next player draws 3 cards (or passes the penalty).
- **Card 8 (Suspension)**: In 3-6 player games, skips the next player. In 2-player games, the player plays again.
- **Card 14 (General Market)**: All other players draw 1 card.
- **Card 20 (Whot)**: Wild card allowing the player to select the active shape (Circle, Triangle, Cross, Square, Star).

---

## 3. House Rules & Presets

Configured by the host before starting the room:

| Option | Naija Classic | Quick Game | No Specials | Custom |
|---|---|---|---|---|
| **Starting cards** | 6 | 4 | 6 | 4 - 8 |
| **Pick Two passing** | On | On | Off | On / Off |
| **Pick Three passing**| On | On | Off | On / Off |
| **Cross-passing** | Off | Off | Off | On / Off |
| **Whot 20 defends** | Off | Off | Off | On / Off |
| **Per-card effects** | All On | All On | All Off | Switchable |
| **Go out on special** | On | On | On | On / Off |
| **Callouts required** | On | On | On | On / Off |
| **Callout penalty** | 2 | 2 | 2 | 1 - 5 cards |
| **Turn timer** | Off | 15s | Off | Off / 15s / 30s / 60s |
| **Reconnect timeout** | 60s | 30s | 60s | 10s - 300s |

---

## 4. Socket.IO Events

### Client to Server
- `room:create`: `{ ruleset?, maxPlayers? }` → Host creates room
- `room:join`: `{ code }` → Join by 4-letter room code
- `room:leave`: Leave current room
- `room:ready`: `{ isReady: boolean }` → Toggle player readiness
- `room:kick`: `{ userId }` → Host removes player
- `room:start`: Host starts the match
- `rules:update`: `{ ruleset: Partial<Ruleset> }` → Host updates house rules
- `rules:preset`: `{ preset: PresetName }` → Host applies preset
- `rules:reset`: Host resets to Naija Classic
- `game:play`: `{ cardId, chosenShape?, calledLastCard?, calledCheckUp? }`
- `game:draw`: Draw card from market
- `chat:send`: `{ text }` → Send in-game message

### Server to Client
- `room:updated`: Broadcasts room details and player slots
- `rules:changed`: Broadcasts new ruleset and preset name
- `room:readyCleared`: Emitted when rules change to reset ready states
- `game:started`: Match initiated
- `game:state`: Private sanitized `PlayerGameView` sent per player
- `game:completed`: Winner announcement and final standings
- `chat:message`: Broadcasts room chat message
- `player:disconnected`: Reconnection countdown notification

---

## 5. Database Schema & Supabase Setup

Run migrations in `supabase/migrations/20261015000000_init_gbedu.sql`:
1. `profiles`: User identity, username (citext unique), avatar, online status.
2. `player_statistics`: Total games played, games won, win streaks.
3. `friendships`: Normalized table (`user_id_1 < user_id_2`).
4. `friend_requests`: Pending, accepted, declined friend requests.
5. `game_rooms`: Active room states, 4-char codes, max players (2-6).
6. `game_players`: Room membership and seat order.
7. `game_invitations`: Room invites with expiration timestamps.
8. `game_history`: Historical game results, final standings, and jsonb rulesets.
9. `game_snapshots`: Server-only table storing engine state snapshots (no client access).

---

## 6. Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests (Vitest)
npm test

# 3. Start full-stack dev server
npm run dev
# Server boots on http://0.0.0.0:3000
```