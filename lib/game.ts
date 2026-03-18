export function make6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getOrCreateLocalId(key: string) {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  window.localStorage.setItem(key, id);
  return id;
}

export function scoreFromTimeSeconds(timeTaken: number) {
  if (!Number.isFinite(timeTaken) || timeTaken < 0) return 0;
  if (timeTaken <= 15) return 300;
  if (timeTaken <= 25) return 200;
  if (timeTaken <= 45) return 100;
  return 50;
}

