# TrolleyGames

A home page linking to several browser mini-games for learning San Diego MTS
trolley signal schematics:

- **HoppyTrain** – a flappy-bird-style game where you flap through the correct signal.
- **RememberBee** – recall the signal sequence on a number keypad.
- **SchemaPro** – click the named signal on a schematic image.
- **SignalSlayer** – steer onto the lane showing the correct signal.

Progress is saved per user via a small Express + SQLite backend.

## Project layout

```
public/            ← the entire front-end (this folder is the web root)
  index.html
  styles.css
  assets/
  src/             ← game code, data, and API client (ES modules)
server/            ← Express API: auth + per-user progress (SQLite)
```

## Running it locally

You need [Node.js](https://nodejs.org/) (v18+).

```bash
npm run setup     # one-time: install server dependencies
npm run dev       # starts the server AND serves the front-end
```

Then open **http://localhost:3001** in your browser.

The dev server serves the front-end and the API from the same origin, so there
is nothing else to start.

### Configuration

Server settings live in `server/.env` (copy `server/.env.example` to get
started). The important one is `JWT_SECRET` — set it to a long random string so
login sessions survive a restart. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Tests

```bash
npm test          # run the server test suite once
npm run test:watch
```

## Deployment (Render)

- **Static site** – serves the `public/` folder.
- **Web service** – runs `server/` (`npm start`). Set `JWT_SECRET` and
  `ALLOWED_ORIGINS` (the static site's URL) in the service's environment.

`public/src/config.js` automatically targets the local API when opened on
`localhost` and the production API otherwise, so no manual edits are needed
before deploying.
