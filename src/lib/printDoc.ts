/** Browsers suggest `document.title` as the filename when the person picks
 *  "Save as PDF" from the print dialog — swap it to something meaningful
 *  just for the print, then put it back once the dialog closes. */
export function printWithFilename(name: string) {
  const safe = name.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  const original = document.title;
  document.title = safe;

  const restore = () => {
    document.title = original;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  // Safety net for browsers that don't fire afterprint for Save-as-PDF.
  setTimeout(restore, 5000);

  window.print();
}
