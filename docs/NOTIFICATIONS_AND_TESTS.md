Desktop notifications and test checklist

Overview
- Implemented desktop notifications for incoming messages when the tab is hidden.
- Added `src/utils/notifications.ts` with helper APIs:
  - `requestNotificationPermission()` — request permission on mount.
  - `showNotification(title, options)` — show a notification (uses service worker if registered).
  - `isNotificationSupported()` — feature detection.

Integration
- `src/hooks/useSocket.ts` now triggers `showNotification` when a `receive_message` event arrives and `document.hidden === true` and the sender is not the current user.
- `src/App.tsx` requests notification permission once a user session is restored or established.

How to test locally
1. Start backend:

```powershell
cd backend
python -m uvicorn main:app --port 8008 --reload
```

2. Start frontend dev server:

```powershell
# from repo root
npm run dev
```

3. Open two browser windows and sign in as two different users (e.g., `kashyap@gmail.com` and `doctor1@gmail.com`).
4. Focus one tab, switch away (or minimize) the other tab.
5. Send a message from the focused tab to the hidden tab. The hidden tab should receive a desktop notification (browser will ask permission on first use).

Automated simulator
- `tools/two_client_simulator.py` is available to simulate two socket clients and validate realtime delivery and persistence. It uses the REST API to confirm messages are saved.

Notes & Next Steps
- Notification click behavior currently falls back to opening/focusing the page depending on browser; we can add a service worker to handle click events and focus the app to a specific conversation.
- Add optional sound alerts for unread messages when tab is hidden.
- Consider adding an opt-in setting per user to control notifications.

If you want, I can add the service worker and click-to-focus behavior next.
