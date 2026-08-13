export type GreetingPeriod = "morning" | "afternoon" | "evening";

export function greetingPeriod(date = new Date()): GreetingPeriod {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function firstNameFromDisplayName(name: string) {
  const token = name.trim().split(/\s+/)[0];
  return token || name.trim();
}
