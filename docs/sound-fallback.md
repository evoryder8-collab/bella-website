# Falling back to the earlier sounds

The site's sounds were rebuilt on 22 November 2026 (commit `6ba435b`): ten
designs layered from the owner's sound library replaced the six Freesound
recordings of 29 October, and four new ones were added. The owner's own eight
recordings were not touched.

The earlier set is kept, exactly as it was live, at the tag
**`sfx-october-2026`** (commit `6d1847e`).

To put it back on the live site while keeping every later fix:

```bash
git revert 6ba435b
```

```bash
git push origin main
```

That one commit holds the whole change (the files in `src/sfx/`, their levels
and triggers in `src/sound.js`, and the four call sites), so reverting it
restores the old sounds and removes the new ones in one step. To hear the
earlier set without changing anything, check the tag out in a second folder:

```bash
git worktree add ../bella-october-sounds sfx-october-2026
```

The old and new files can also be compared side by side, over the song, on the
audition page kept on the owner's computer
(`private-assets/sfx-audition/index.html`, not in the repo).
