# 01: Connect Luma at startup

**What to build:** On first launch, a user who hasn't connected Luma sees a connect screen with two choices: "Connect Luma" and "Try the sample event". "Connect Luma" opens Luma's own sign-in page inside the app. After the user signs in, the app checks the session with Luma and shows that Luma is connected before taking the user to home. A returning user who is still signed in skips the connect screen. On web, the connect screen explains that connecting Luma needs the phone app and offers the sample event and paste options instead.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] First launch without a Luma session shows the connect screen, not home
- [ ] "Connect Luma" opens Luma's sign-in page in the app; the app never sees credentials or the session
- [ ] After sign-in the app confirms the session with Luma (sign-in check) and shows "Connected" before going home
- [ ] If the sign-in didn't complete, the user sees a clear message and can retry
- [ ] A returning signed-in user lands on home directly
- [ ] "Try the sample event" works without any Luma account and leads to home with the sample option ready
- [ ] On web, the connect screen explains that connecting needs the phone app and offers sample event and paste
- [ ] Typecheck and tests pass
