# Project-local skill imports

Installed on 2026-10-02 into `.agents/skills/`. Existing global skills were not
overwritten. No downloaded helper scripts were executed during installation.

| Source | Pinned commit | Installed |
| --- | --- | --- |
| https://github.com/anthropics/skills | `8a1541c4a3ffa5a20a5a91de0dcf3f0bab1d1ef4` | 19 skills plus `template` starter |
| https://github.com/vercel-labs/agent-skills | `063bee94c3f4df8453406c830b0a7df0f2860278` | 9 skills |
| https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | `09170eec67eefd46a7ae85de61b40c194020f997` | 7 skills from `.claude/skills/` |

The repeated Vercel URL and duplicate UI/UX CLI-packaged copies were installed
only once. Each skill's supporting files were copied with its directory. See
`.agents/skills/AGENTS.md` for Claude-to-Codex path and Windows Python mappings.

Installation verification covers the expected directories and SKILL.md
frontmatter, not every skill's runtime or optional dependency. Imported files
retain their upstream instructions and license files where supplied inside the
skill directory; consult the pinned source repositories for licensing terms.

Skills become available on the next turn. Some skills require additional
tools, runtimes, credentials, or dependencies before their workflows can run.
