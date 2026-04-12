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

function TerrainButton({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      className={`sb-btn sb-btn--terrain${enabled ? " active" : ""}`}
      onClick={onToggle}
      data-tooltip={enabled ? "hide terrain" : "show terrain"}
    >
      <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3,20 9,8 14,14 17,10 21,20" />
      </svg>
    </button>
  );
}

export default function SupportBar({
  terrainEnabled,
  onTerrainToggle,
}: {
  terrainEnabled?: boolean;
  onTerrainToggle?: () => void;
} = {}) {
  return (
    <div className="sb-root">
      {onTerrainToggle && (
        <TerrainButton enabled={terrainEnabled ?? false} onToggle={onTerrainToggle} />
      )}
      <FlashcardButton />
    </div>
  );
}
