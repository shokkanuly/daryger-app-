export interface NotificationProvider {
  send(to: string, message: string, channel: "SMS" | "MESSENGER" | "APP"): Promise<void>;
}
