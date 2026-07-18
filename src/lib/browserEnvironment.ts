const META_IN_APP_BROWSER_PATTERN = /(?:FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram)/i;

export function isMetaInAppBrowser(userAgent: string) {
  return META_IN_APP_BROWSER_PATTERN.test(userAgent);
}
