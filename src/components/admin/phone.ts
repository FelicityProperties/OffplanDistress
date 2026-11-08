// The admin console's controls on phones and tablets: below lg, where the site has its phone layout (the header's menu
// button, the bottom tab bar), a control a thumb hits is about 44 px tall. From lg (a mouse) nothing changes. Plain
// strings, not a "use client" module, so server pages and client controls can both use them.

/** A button below lg: 44 px tall with a 14 px label (an sm button is 32 px with 12 px). */
export const PHONE_BUTTON = "max-lg:h-11 max-lg:px-4 max-lg:text-sm";
/** A ghost button reads as loose text at that size: outlined below lg. */
export const PHONE_OUTLINED = "max-lg:border max-lg:border-input max-lg:bg-background max-lg:shadow-sm";
/** A text link (an email, a phone number, a back link, a reference) with a 40 px hit area below lg. */
export const PHONE_LINK = "max-lg:inline-flex max-lg:min-h-10 max-lg:items-center";
/**
 * The phone shell (globals.css), where a decisive answer (Approve) is confirmed in a sheet first, as offers are
 * (src/components/OfferActions.tsx).
 */
export const PHONE_SHELL = "(max-width: 1023.98px)";
/**
 * A long form's Save row below lg (the listing editor, the deal file: several screens on a phone): it stays at the bottom
 * of the screen while the form is in view, above the tab bar (PHONE_SAVE_BAR_STYLE), and settles at the form's end. It
 * spans the card it is in, padded p-4 (p-6 from sm). While the on-screen keyboard is up (html[data-keyboard], set by
 * the app shell) it stays in its place in the form, clear of the field being typed in.
 */
export const PHONE_SAVE_BAR =
  "max-lg:sticky max-lg:z-10 max-lg:-mx-4 max-lg:border-t max-lg:bg-card/95 max-lg:px-4 max-lg:py-3 max-lg:backdrop-blur sm:max-lg:-mx-6 sm:max-lg:px-6 [html[data-keyboard]_&]:static";
/** Its offset: the bottom bar on screen (--app-bottom, the app shell's tab bar), none without one. */
export const PHONE_SAVE_BAR_STYLE = { bottom: "var(--app-bottom, 0px)" };
