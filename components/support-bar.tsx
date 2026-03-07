"use client";

function FlashcardButton() {
  return (
    <a
      className="sb-btn sb-btn--flash"
      href="/flashcards/lepidoptera.apkg"
      download
    >
      <img
        src="/logos/Anki Logo.svg.png"
        alt="Anki"
        className="sb-logo"
      />
      <span className="sb-btn-text">lepidoptera flashcards</span>
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