export interface RawCallback {
  sourceIp: string;
  contentType?: string;
  headers: Record<string, unknown>;
  rawBody: string;
}
