import robotsParser from "robots-parser";
import { fetchWithTimeout, TIMEOUTS } from "@/lib/http";

const robotsCache: Record<string, any> = {};

/**
 * Checks if crawling is allowed on a target URL based on its robots.txt
 */
export async function isCrawlAllowed(targetUrl: string, userAgent = "DarygerCrawler"): Promise<boolean> {
  try {
    const url = new URL(targetUrl);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;

    let robots = robotsCache[robotsUrl];
    if (!robots) {
      const res = await fetchWithTimeout(robotsUrl, {}, TIMEOUTS.PREFLIGHT);
      if (res.ok) {
        const text = await res.text();
        robots = robotsParser(robotsUrl, text);
        robotsCache[robotsUrl] = robots;
      } else {
        // If robots.txt doesn't exist, assume allowed
        return true;
      }
    }

    return robots.isAllowed(targetUrl, userAgent) ?? true;
  } catch (err) {
    console.error(`Error checking robots.txt for ${targetUrl}:`, err);
    return true; // Allow by default if check fails
  }
}

/**
 * Simple delay helper to space out crawls
 */
export async function spaceRequest(minMs = 1000, maxMs = 2000): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
