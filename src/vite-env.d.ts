/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    [key: string]: string | undefined;
    readonly VITE_API_URL?: string;
    readonly VITE_EMAIL_API_URL?: string;
    readonly VITE_GEMINI_API_KEY?: string;
    readonly VITE_POCKETBASE_URL?: string;
    readonly POCKETBASE_ADMIN_EMAIL?: string;
    readonly POCKETBASE_ADMIN_PASSWORD?: string;
    readonly VITE_WHATSAPP_API_URL?: string;
  }
}
