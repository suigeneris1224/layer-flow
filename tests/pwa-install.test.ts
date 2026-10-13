import { describe, expect, it } from "vitest";
import { isInAppBrowser, isIos, resolveInstallMode, type PlatformInfo } from "@/lib/pwa/install";

const UA = {
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; SM-A146P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1",
  iphoneMessenger:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/470.0.0.40.103]",
  ipadOs:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  desktopSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
};

function platform(userAgent: string, extra: Partial<PlatformInfo> = {}): PlatformInfo {
  return { userAgent, maxTouchPoints: 0, standalone: false, ...extra };
}

describe("isIos", () => {
  it("detects iPhone, and iPadOS despite its Mac user agent", () => {
    expect(isIos(platform(UA.iphoneSafari, { maxTouchPoints: 5 }))).toBe(true);
    expect(isIos(platform(UA.ipadOs, { maxTouchPoints: 5 }))).toBe(true);
  });

  it("does not mistake a desktop Mac or Android for iOS", () => {
    expect(isIos(platform(UA.desktopSafari))).toBe(false);
    expect(isIos(platform(UA.androidChrome, { maxTouchPoints: 5 }))).toBe(false);
  });
});

describe("isInAppBrowser", () => {
  it("recognizes Facebook/Messenger webviews", () => {
    expect(isInAppBrowser(UA.iphoneMessenger)).toBe(true);
    expect(isInAppBrowser(UA.iphoneSafari)).toBe(false);
  });
});

describe("resolveInstallMode", () => {
  it("uses the native prompt whenever the browser offered one", () => {
    expect(resolveInstallMode(platform(UA.androidChrome), true)).toBe("prompt");
  });

  it("hides the button once running as an installed app", () => {
    expect(resolveInstallMode(platform(UA.androidChrome, { standalone: true }), true)).toBe("hidden");
    expect(resolveInstallMode(platform(UA.iphoneSafari, { standalone: true, maxTouchPoints: 5 }), false)).toBe(
      "hidden"
    );
  });

  it("shows Add to Home Screen steps in iOS Safari", () => {
    expect(resolveInstallMode(platform(UA.iphoneSafari, { maxTouchPoints: 5 }), false)).toBe("ios");
  });

  it("sends iOS in-app browsers and Chrome on iOS to Safari", () => {
    expect(resolveInstallMode(platform(UA.iphoneMessenger, { maxTouchPoints: 5 }), false)).toBe("ios-in-app");
    expect(resolveInstallMode(platform(UA.iphoneChrome, { maxTouchPoints: 5 }), false)).toBe("ios-in-app");
  });

  it("hides the button where installing isn't possible", () => {
    expect(resolveInstallMode(platform(UA.androidChrome), false)).toBe("hidden");
    expect(resolveInstallMode(platform(UA.desktopSafari), false)).toBe("hidden");
  });
});
