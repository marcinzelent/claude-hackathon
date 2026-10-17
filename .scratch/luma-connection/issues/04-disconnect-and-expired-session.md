# 04: Disconnect and expired session

**What to build:** A "Disconnect Luma" option clears the Luma sign-in on the phone and returns the user to the connect screen. When the Luma session has expired, the app sends the user to the connect screen with a short explanation instead of showing an error.

**Blocked by:** 01 (Connect Luma at startup)

**Status:** ready-for-agent

- [ ] "Disconnect Luma" clears Luma's cookies in the app and shows the connect screen
- [ ] After disconnecting, the events list is gone and the sign-in check reports signed out
- [ ] An expired session leads to the connect screen with an explanation
- [ ] Typecheck and tests pass
