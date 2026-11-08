# Decisions (append-only)
- 2026-11-07: Research/survey work skipped (not required for this hackathon); focus on build.
- 2026-11-07: Structured AI output via forced tool call + Zod (callClaudeJson), one repair retry.
- 2026-11-07: Dev branch for Person B is claude/adoring-mccarthy-mxtn40 (cloud session) instead of b/ingest.

## 2026-11-07 Search behavior change (for Person A, prompt 3A) - requested by Person B
The PRD section 5A says a search match highlights itself plus all transitive prerequisites and dependents, and dims everything else to ~15%. Changed to:
- **Default:** searching a node only HIGHLIGHTS that node (and pans/zooms to it, with a clear ring or label). Every other node stays visible at normal opacity. Search never hides or dims the rest of the graph.
- **Toggle in the same search bar area, short name "Focus"** (switch, off by default; label alternatives: "Isolate", "Neighbors only"). When on, the view is limited to the searched node plus its connections, and everything else is hidden.
- "Connections" = the node's direct neighbors by default. Keep the existing depth control (direct / 2 hops / all) next to the toggle, since the PRD already has it; it only applies while Focus is on. "All" = full prerequisite and dependent chains.
- Islands must not move when Focus is on or off (anchors are computed from ALL domains, never the visible set). Turning Focus off or clearing the search restores the full graph.
- Accessibility: the toggle is a real switch (role="switch" or a checkbox), 44px target, announced to screen readers ("Focus on, showing 8 of 130 items"). The Outline view uses the same search and the same toggle.
- Implement the visible-set logic as a pure, tested function in src/lib/graph (for example visibleNodeIds(world, matchId, {focus, depth})).

- 2026-11-07 (Person A): Map look changed from the Figma/"transit map" drafts to an abstract constellation: small subject-coloured dots, white bridge dots, faint links, names only on hover, gentle drift after settling. The PRD's d3-force island layout and fixed anchors are kept (anchors now on a wide ellipse, first subject at the bottom).
- 2026-11-07 (Person A): Fonts changed from Geist (PRD: Inter or Geist) to Host Grotesk + JetBrains Mono, per the taste skill. UI text on the map page and the nav is lowercase; the nav calls /world "map".
- 2026-11-07 (Person A): Entire transcripts stay on each laptop (push_sessions=false) because the GitHub repo is public.

- 2026-11-07 (Person B, approved by the user): Light theme and display settings added. Person B made small marked edits ("[settings]") in Person A's globals.css, layout.tsx, AppNav, GraphCanvas and GraphLegend so the map follows the theme and can show node names, hide subjects and hide suggested links. Please review at the next sync. The PRD's "dark by default, light option, Atkinson Hyperlegible option" is now implemented.

- 2026-11-07 (Person B, approved by the user): Auth0 login. While configured, anyone without a session is demo-only; this also settles the "lock down real mode before opening the site" item. Small marked [auth] edits in Person A's AppNav (login links) and WorldView (empty-map invitation).

- 2026-11-07 (Person B, approved by the user): Search, Focus, filters and the Outline view built by Person B as new pure files + /outline; Person A wires search and filters into the map using useGraphView (steps in vault/log-b.md).
