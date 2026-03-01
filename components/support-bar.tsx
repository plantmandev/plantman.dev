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

function CoffeeButton() {
  return (
    <a
      className="sb-btn sb-btn--coffee"
      href="https://buymeacoffee.com/plantmandev"
      target="_blank"
      rel="noreferrer"
    >
      <img
        src="/logos/buy-me-a-coffee Logo.png"
        alt="Buy Me a Coffee"
        className="sb-logo sb-logo--coffee"
      />
      <span className="sb-btn-text">buy me a coffee</span>
    </a>
  );
}

export default function SupportBar() {
  return (
    <div className="sb-root">
      <FlashcardButton />
      <CoffeeButton />
    </div>
  );
}