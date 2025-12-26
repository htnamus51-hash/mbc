// Notification helper utilities
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  let permission = Notification.permission;
  if (permission === "default") {
    try {
      permission = await Notification.requestPermission();
    } catch (e) {
      console.warn("Notification permission request failed", e);
    }
  }
  return permission;
}

export function showNotification(title: string, options?: NotificationOptions) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    // If a service worker registration is active, prefer its showNotification
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg && reg.showNotification) {
            reg.showNotification(title, options as any).catch(() => {
              // fallback
              try {
                // eslint-disable-next-line no-new
                new Notification(title, options);
              } catch (err) {
                /* ignore */
              }
            });
          } else {
            try {
              // eslint-disable-next-line no-new
              new Notification(title, options);
            } catch (err) {
              /* ignore */
            }
          }
        })
        .catch(() => {
          try {
            // eslint-disable-next-line no-new
            new Notification(title, options);
          } catch (err) {
            /* ignore */
          }
        });
    } else {
      try {
        // eslint-disable-next-line no-new
        new Notification(title, options);
      } catch (err) {
        /* ignore */
      }
    }
  } catch (e) {
    console.warn("showNotification error", e);
  }
}

export const isNotificationSupported = (): boolean => {
  return typeof window !== "undefined" && "Notification" in window;
};
