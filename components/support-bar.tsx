"use client";

function FlashcardButton() {
  return (
    <a
      className="sb-btn sb-btn--flash"
      href="/flashcards/lepidoptera.apkg"
      download
      data-tooltip="lepidoptera flashcards"
    >
      <img
        src="/logos/Anki Logo.svg.png"
        alt="Anki"
        className="sb-logo"
      />
    </a>
  );
}

export default function SupportBar() {
  return (
    <div className="sb-root">
      <FlashcardButton />
    </div>
  );
}
