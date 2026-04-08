"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function NotFound() {
  const [visible, setVisible] = useState(false);
  const [glitch, setGlitch]   = useState(false);

  useEffect(() => {
    // Stagger in
    const t1 = setTimeout(() => setVisible(true), 100);
    // Periodic glitch on the 404
    const t2 = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 4000);
    return () => { clearTimeout(t1); clearInterval(t2); };
  }, []);

  return (
    <div style={styles.root}>
      {/* Scanline overlay */}
      <div style={styles.scanlines} />

      <div style={{ ...styles.content, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.5s ease, transform 0.5s ease" }}>

        {/* 404 */}
        <div style={styles.codeBlock}>
          <span style={{ ...styles.code404, ...(glitch ? styles.glitchActive : {}) }}>
            404
          </span>
          {glitch && (
            <>
              <span style={{ ...styles.code404, ...styles.glitchR }}>404</span>
              <span style={{ ...styles.code404, ...styles.glitchB }}>404</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Message */}
        <p style={styles.label}>PAGE_NOT_FOUND</p>
        <p style={styles.sub}>
          The resource you requested does not exist or has been moved.
        </p>

        {/* Terminal-style path */}
        <div style={styles.terminal}>
          <span style={styles.prompt}>~/plantman.dev</span>
          <span style={styles.cursor}>▋</span>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <Link href="/" style={styles.btnPrimary}>
            ← return home
          </Link>
          <Link href="/projects" style={styles.btnSecondary}>
            view projects
          </Link>
        </div>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position:        "fixed",
    inset:           0,
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "var(--background)",
    overflow:        "hidden",
  },
  scanlines: {
    position:         "absolute",
    inset:            0,
    backgroundImage:  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)",
    pointerEvents:    "none",
    zIndex:           0,
  },
  content: {
    position:   "relative",
    zIndex:     1,
    display:    "flex",
    flexDirection: "column",
    alignItems: "center",
    gap:        "1.5rem",
    padding:    "2rem",
  },
  codeBlock: {
    position: "relative",
    display:  "inline-block",
  },
  code404: {
    display:      "block",
    fontSize:     "clamp(5rem, 15vw, 10rem)",
    fontWeight:   700,
    color:        "var(--foreground)",
    letterSpacing: "-0.04em",
    lineHeight:   1,
    fontFamily:   "Consolas, Monaco, 'Courier New', monospace",
    userSelect:   "none",
  },
  glitchActive: {
    textShadow: "2px 0 var(--foreground), -2px 0 var(--foreground)",
    filter:     "brightness(1.4)",
  },
  glitchR: {
    position:  "absolute",
    top:       0,
    left:      0,
    color:     "rgba(255,50,50,0.5)",
    transform: "translate(3px, -1px)",
    fontSize:  "clamp(5rem, 15vw, 10rem)",
    fontWeight: 700,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    fontFamily: "Consolas, Monaco, 'Courier New', monospace",
    pointerEvents: "none",
    userSelect: "none",
  },
  glitchB: {
    position:  "absolute",
    top:       0,
    left:      0,
    color:     "rgba(50,100,255,0.5)",
    transform: "translate(-3px, 1px)",
    fontSize:  "clamp(5rem, 15vw, 10rem)",
    fontWeight: 700,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    fontFamily: "Consolas, Monaco, 'Courier New', monospace",
    pointerEvents: "none",
    userSelect: "none",
  },
  divider: {
    width:           "100%",
    maxWidth:        "320px",
    height:          "1px",
    backgroundColor: "var(--border)",
  },
  label: {
    margin:        0,
    fontSize:      "0.7rem",
    fontWeight:    700,
    letterSpacing: "0.2em",
    color:         "var(--muted)",
    textTransform: "uppercase",
    fontFamily:    "Consolas, Monaco, 'Courier New', monospace",
  },
  sub: {
    margin:     0,
    fontSize:   "0.8rem",
    color:      "var(--muted)",
    textAlign:  "center",
    maxWidth:   "320px",
    lineHeight: 1.6,
    fontFamily: "Consolas, Monaco, 'Courier New', monospace",
  },
  terminal: {
    display:         "flex",
    alignItems:      "center",
    gap:             "0.4rem",
    padding:         "0.5rem 1rem",
    border:          "1px solid var(--border)",
    backgroundColor: "var(--card-bg)",
    fontFamily:      "Consolas, Monaco, 'Courier New', monospace",
  },
  prompt: {
    fontSize:  "0.75rem",
    color:     "var(--muted)",
  },
  cursor: {
    fontSize:  "0.75rem",
    color:     "var(--foreground)",
    animation: "blink 1s step-start infinite",
  },
  actions: {
    display:   "flex",
    gap:       "0.75rem",
    flexWrap:  "wrap",
    justifyContent: "center",
    marginTop: "0.5rem",
  },
  btnPrimary: {
    display:        "inline-flex",
    alignItems:     "center",
    padding:        "0.55rem 1.25rem",
    fontSize:       "0.8rem",
    fontWeight:     600,
    fontFamily:     "Consolas, Monaco, 'Courier New', monospace",
    letterSpacing:  "0.04em",
    textDecoration: "none",
    color:          "var(--background)",
    backgroundColor:"var(--foreground)",
    border:         "1px solid var(--foreground)",
    transition:     "opacity 0.15s ease",
  },
  btnSecondary: {
    display:        "inline-flex",
    alignItems:     "center",
    padding:        "0.55rem 1.25rem",
    fontSize:       "0.8rem",
    fontWeight:     600,
    fontFamily:     "Consolas, Monaco, 'Courier New', monospace",
    letterSpacing:  "0.04em",
    textDecoration: "none",
    color:          "var(--foreground)",
    backgroundColor:"var(--btn-bg)",
    border:         "1px solid var(--btn-border)",
    transition:     "opacity 0.15s ease",
  },
};