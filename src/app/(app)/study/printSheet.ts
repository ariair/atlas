// "Download PDF": opens the browser's print dialog showing only one printable sheet (the study guide,
// the test, or the answer key), so choosing "Save as PDF" there gives a clean black-on-white document.
// The sheets are hidden on screen; globals.css shows only the one marked data-print-active when printing.
export type SheetKind = 'guide' | 'test' | 'key';

export function printSheet(kind: SheetKind, fileTitle: string) {
  const sheet = document.querySelector<HTMLElement>(`.print-sheet[data-kind="${kind}"]`);
  if (!sheet) return;
  const oldTitle = document.title;
  const done = () => {
    sheet.removeAttribute('data-print-active');
    document.title = oldTitle;
    window.removeEventListener('afterprint', done);
  };
  sheet.setAttribute('data-print-active', 'true');
  document.title = fileTitle; // browsers use the page title as the saved file's name
  window.addEventListener('afterprint', done);
  window.print();
}
