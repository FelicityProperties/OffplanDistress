import { getT } from "@/i18n/server";
import { BRAND } from "@/lib/config";

/** Floating WhatsApp shortcut, shown only when NEXT_PUBLIC_WHATSAPP is set. */
export async function WhatsAppButton() {
  if (!BRAND.whatsapp) return null;
  const t = await getT("marketing");
  const label = t("contact.whatsapp");
  return (
    <a
      href={`https://wa.me/${BRAND.whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="fixed bottom-5 end-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lift ring-4 ring-background/70 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-ring"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true" fill="currentColor">
        <path d="M16.04 3C8.9 3 3.1 8.78 3.1 15.9c0 2.27.6 4.5 1.74 6.46L3 29l6.83-1.79a12.9 12.9 0 0 0 6.2 1.58h.01c7.13 0 12.93-5.79 12.93-12.9 0-3.45-1.35-6.69-3.79-9.12A12.83 12.83 0 0 0 16.04 3Zm0 23.6h-.01a10.7 10.7 0 0 1-5.46-1.5l-.39-.23-4.05 1.06 1.08-3.94-.25-.4a10.66 10.66 0 0 1-1.64-5.69c0-5.9 4.82-10.7 10.73-10.7 2.86 0 5.55 1.12 7.58 3.14a10.62 10.62 0 0 1 3.14 7.57c0 5.9-4.82 10.7-10.73 10.7Zm5.88-8.01c-.32-.16-1.91-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.83 1.05-1.02 1.26-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.6-.96-.85-1.6-1.9-1.79-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.54-.73-.55h-.62c-.21 0-.56.08-.86.4-.29.32-1.12 1.1-1.12 2.68s1.15 3.11 1.31 3.32c.16.21 2.26 3.45 5.47 4.83.77.33 1.36.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.91-.78 2.18-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  );
}
