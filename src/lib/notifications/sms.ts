import { NotificationProvider } from "./types";

export class SmsNotificationProvider implements NotificationProvider {
  async send(to: string, message: string, channel: "SMS" | "MESSENGER" | "APP"): Promise<void> {
    const key = process.env.SMS_PROVIDER_KEY;
    const url = process.env.SMS_PROVIDER_URL || "https://api.sms-provider.kz/v1/send";

    if (key) {
      console.log(`[SMS Provider] Sending real SMS via API to ${to}...`);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
          },
          body: JSON.stringify({
            recipient: to,
            text: message,
            channel: channel.toLowerCase(),
          }),
        });
        if (!response.ok) {
          throw new Error(`SMS gateway returned status: ${response.status}`);
        }
        console.log(`[SMS Provider] SMS sent successfully via API to ${to}.`);
      } catch (err: any) {
        console.error(`[SMS Provider] Real SMS send failure: ${err.message || err}`);
        // Do not throw to keep pipeline resilient, but log
      }
    } else {
      // Console logging fallback stub
      console.log(`[Console SMS Stub] [Channel: ${channel}] Sent to ${to}: "${message}"`);
    }
  }
}
