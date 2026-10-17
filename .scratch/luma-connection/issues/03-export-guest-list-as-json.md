# 03: Export guest list as JSON

**What to build:** The export on the results screen produces a JSON array of guests (name, bio, Luma link and every connected profile link, including TikTok and YouTube) instead of JSONL, so it can be dropped into other tools such as Claude.ai. Result cards also show the new TikTok and YouTube links.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Export produces a valid JSON array of guests with their match data when ranked
- [ ] Guests without profile links are included with their name
- [ ] Result cards show TikTok and YouTube links when present
- [ ] Typecheck and tests pass
