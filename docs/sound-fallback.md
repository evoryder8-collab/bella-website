# Falling back to the earlier sounds

The site's sounds were rebuilt on 22 November 2026 (commit `6ba435b`): ten
designs layered from the owner's sound library replaced the six Freesound
recordings of 29 October, and four new ones were added. The owner's own eight
recordings were not touched.

The earlier set is kept, exactly as it was live, at the tag
**`sfx-october-2026`** (commit `6d1847e`).

Since then the opening has gone back to its earlier sound: the ring of light
closes on the October breath again, not on singing bowls (the owner found the
bowls eerie there). Everything after the opening keeps the new sounds.

To put the whole earlier set back on the live site while keeping every other
fix, revert the sound commits, newest first:

```bash
git revert --no-edit f2544f6 6ba435b
```

```bash
git push origin main
```

Those commits hold the whole change (the files in `src/sfx/`, their levels and
triggers in `src/sound.js`, and the call sites), so reverting them restores the
old sounds and removes the new ones. Any later commit that changes the sounds
is added to the front of that list here. To hear the
earlier set without changing anything, check the tag out in a second folder:

```bash
git worktree add ../bella-october-sounds sfx-october-2026
```

The old and new files can also be compared side by side, over the song, on the
audition page kept on the owner's computer
(`private-assets/sfx-audition/index.html`, not in the repo).
