// Shim de types minimal pour web-push (évite d'installer @types/web-push).
declare module "web-push" {
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  export function sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload?: string | Buffer,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
  export function generateVAPIDKeys(): { publicKey: string; privateKey: string };
  const _default: {
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
    generateVAPIDKeys: typeof generateVAPIDKeys;
  };
  export default _default;
}
