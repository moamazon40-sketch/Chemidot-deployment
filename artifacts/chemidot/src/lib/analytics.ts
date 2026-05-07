export interface AnalyticsEvent {
  event: string;
  label: string;
  page: string;
  [key: string]: string | number | boolean | undefined;
}

export function trackEvent(data: AnalyticsEvent): void {
  if (typeof window === "undefined") return;

  if (import.meta.env.DEV) {
    console.debug("[analytics]", data);
  }

  const w = window as unknown as Record<string, unknown>;
  if (typeof w["gtag"] === "function") {
    (w["gtag"] as (...args: unknown[]) => void)("event", data.event, {
      event_label: data.label,
      page_location: data.page,
      ...data,
    });
  }

  window.dispatchEvent(new CustomEvent("chemidot:analytics", { detail: data }));
}
