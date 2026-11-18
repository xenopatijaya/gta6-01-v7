# Porto Alba II

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/xenopatijaya/gta6-01-v7/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/xenopatijaya/gta6-01-v7/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the spirit of GTA 6, built for the
[make.fun](https://make.fun) **gta6-01 "Make GTA 6"** bounty ($1,666, top 100).

## The game

**Porto Alba II** — Kai Mercer is back in the sun-soaked coastal city of Porto
Alba with $150 and a debt to fixer Vera Solano. Run her three jobs, dodge Alba
PD, and take the city for yourself.

- **Open world:** a 6-street coastal city — towers, shops, palms, Alba Plaza
  park with fountain, a sand beach and a wooden pier, built in three.js.
- **On foot and by car:** walk, run and jump (WASD / Shift / Space); steal any
  parked car (E) and drive it with arcade handling and a handbrake.
- **Traffic & pedestrians:** 14 AI traffic cars that cruise the grid and stop
  behind the car ahead, 6 parked cars, 26 pedestrians who stroll the sidewalks,
  cross at intersections, and flee gunfire and speeding cars.
- **Wanted 0–5:** stealing, hitting pedestrians and shooting raise the heat.
  Alba PD answers with interceptor cars (light bar, ramming) and foot officers
  who chase and shoot. Stay clean 25 seconds to lose a star.
- **Missions & story:** three chained jobs — Courier Run ($500), Grand Theft
  Alba ($1,200), Heat Escape ($2,500) — plus repeatable side deliveries (J, $150).
- **Combat:** shoot (F / click) with tracers, muzzle flash and sparks; ammo and
  reload (R).
- **HUD & minimap:** cash, wanted stars, health, ammo, speed, mission
  objective, toasts, and a live top-down minimap with traffic, police and a
  pulsing mission beacon.
- **Save:** progress (cash, jobs, position) autosaves to localStorage; Continue
  on the start screen picks it back up.
- **Sound:** fully synthesised WebAudio — engine hum, police siren, gunshots,
  pickup blips and a bassline groove. M mutes, P pauses.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/` is plain static files, three.js r160 is
vendored under `game/vendor/three.module.min.js`.

## Files

| Path | What it is |
| --- | --- |
| `game/index.html` | Page, HUD, start / pause / busted screens |
| `game/src/main.js` | Bootstrap, game loop, camera, state machine |
| `game/src/city.js` | Porto Alba: streets, towers, plaza, beach, pier |
| `game/src/player.js` | Kai on foot: walk / run / jump, collision |
| `game/src/vehicles.js` | Traffic AI, parked cars, arcade driving |
| `game/src/pedestrians.js` | 26 citizens: stroll, cross, flee |
| `game/src/police.js` | Alba PD interceptors + foot officers |
| `game/src/combat.js` | Shooting, tracers, ammo, reload |
| `game/src/missions.js` | Vera's three-job chain + side jobs |
| `game/src/effects.js` | Sparks, tracers, muzzle flash |
| `game/src/hud.js` | HUD, wanted stars, live minimap |
| `game/src/audio.js` | Synthesised WebAudio sound + music |
| `game/src/input.js` | Keyboard + mouse camera |
| `game/src/save.js` | localStorage save / load |
| `game/src/util.js` | Math helpers |
| `main.ts` | Hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`) |
| `screenshots/` | Four real renders of the game itself |

## License

MIT — see [LICENSE](LICENSE).
