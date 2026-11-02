import { NOT_FOUND_BOX, NotFoundContent, notFoundMetadata } from "@/components/NotFoundContent";

// Also the metadata of the page that called notFound().
export async function generateMetadata() {
  return notFoundMetadata();
}

/**
 * notFound() in a page of the site: a sold, withdrawn or mistyped deal, a missing dashboard or admin listing. Shown
 * inside the site layout, which already brings the skip link, header, <main id="main"> and footer (the root
 * src/app/not-found.tsx brings its own, for addresses no route matches).
 */
export default function SiteNotFound() {
  return (
    <div className={NOT_FOUND_BOX}>
      <NotFoundContent />
    </div>
  );
}
