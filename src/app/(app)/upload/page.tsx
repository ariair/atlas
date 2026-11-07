import type { Metadata } from 'next';
import UploadFlow from './UploadFlow';

export const metadata: Metadata = { title: 'Add a course | Atlas' };

export default function UploadPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8 text-lg">
      <h1 className="text-3xl font-semibold">Add a course</h1>
      <p className="mt-2 max-w-prose">
        Paste a syllabus or upload a PDF. Atlas reads it, then you check what it found before anything is saved.
        Your file is read once and never stored.
      </p>
      <UploadFlow />
    </main>
  );
}
