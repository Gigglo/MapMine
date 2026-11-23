import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "expo-router";
import { PostHogProvider, usePostHog, type PostHogOptions } from "posthog-react-native";

const options = {
  host: "https://us.i.posthog.com",
  disabled: __DEV__,
  captureAppLifecycleEvents: true,
  disableGeoip: true,
  enableSessionReplay: false,
  capturePushNotificationSubscriptions: false,
  personProfiles: "never",
  preloadFeatureFlags: false,
  disableRemoteConfig: true,
  disableSurveys: true,
} satisfies PostHogOptions;

const screens = {
  "/": "map",
  "/activity": "activity",
  "/places": "places",
  "/achievements": "achievements",
  "/profile": "profile",
  "/settings": "settings",
} as const;

export function AppAnalytics({ children }: { children: ReactNode }) {
  return <PostHogProvider apiKey="phc_nA7X6XBdyuCbpMjFwaXK9f4tGxLrYCzLnx6KGjgn7QDU" options={options} autocapture={false}>
    {children}
  </PostHogProvider>;
}

export function ScreenAnalytics({ ready }: { ready: boolean }) {
  const pathname = usePathname();
  const previous = useRef<string | undefined>(undefined);
  const posthog = usePostHog();
  useEffect(() => {
    if (!ready || previous.current === pathname) return;
    previous.current = pathname;
    if (Object.hasOwn(screens, pathname)) void posthog.screen(screens[pathname as keyof typeof screens]);
  }, [pathname, posthog, ready]);
  return null;
}
