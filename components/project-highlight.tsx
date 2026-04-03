"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendar,
  faClock,
  faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

// ── Types ─────────────────────────────────────────────────────────────────────

export type HighlightedProject = {
  title: string;
  description: string;
  date: string;
  readTime?: string;
  tags?: string[];
  image?: string;       // screenshot / thumbnail
  imageAlt?: string;
  demoHref?: string;
  githubHref?: string;
};

type Props = {
  projects: HighlightedProject[];
  /** Milliseconds between auto-advances. Default: 10 000 */
  interval?: number;
};

// ── Component ─────────────────────────────────────────────────────────────────

const INTERVAL_DEFAULT = 10_000;

export default function ProjectHighlight({
  projects,
  interval = INTERVAL_DEFAULT,
}: Props) {
  const [active, setActive]       = useState(0);
  const [progress, setProgress]   = useState(0);
  const [fading, setFading]       = useState(false);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef  = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const startRef  = useRef<number>(performance.now());

  // ── Go to a specific slide ──────────────────────────────────────────────────
  const goTo = useCallback(
    (index: number) => {
      if (index === active) return;
      setFading(true);
      setTimeout(() => {
        setActive(index);
        setProgress(0);
        startRef.current = performance.now();
        setFading(false);
      }, 220);
    },
    [active]
  );

  // ── Progress bar via rAF ───────────────────────────────────────────────────
  useEffect(() => {
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct     = Math.min((elapsed / interval) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [active, interval]);

  // ── Auto-advance timer ─────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActive((prev) => (prev + 1) % projects.length);
        setProgress(0);
        startRef.current = performance.now();
        setFading(false);
      }, 220);
    }, interval);

    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [interval, projects.length]);

  // ── Restart timer on manual nav ───────────────────────────────────────────
  const handleDot = (i: number) => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    goTo(i);
    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActive((prev) => (prev + 1) % projects.length);
        setProgress(0);
        startRef.current = performance.now();
        setFading(false);
      }, 220);
    }, interval);
  };

  const project = projects[active];

  return (
    <section className="ph-root">

      {/* ── Left: project image ─────────────────────────────────────────── */}
      <div className="ph-image-pane">
        {project.image ? (
          <img
            src={project.image}
            alt={project.imageAlt ?? project.title}
            className={`ph-image ${fading ? "ph-fading" : ""}`}
          />
        ) : (
          <div className="ph-image-placeholder">
            <span>[ no preview ]</span>
          </div>
        )}

        {/* Progress bar anchored to the bottom of the image pane */}
        <div className="ph-progress-track">
          <div className="ph-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* ── Right: content ──────────────────────────────────────────────── */}
      <div className={`ph-content ${fading ? "ph-fading" : ""}`}>

        {/* Top row: meta + dots */}
        <div className="ph-top-row">
          <div className="ph-meta">
            <span className="ph-meta-item">
              <FontAwesomeIcon icon={faCalendar} className="ph-meta-icon" />
              {project.date}
            </span>
            {project.readTime && (
              <span className="ph-meta-item">
                <FontAwesomeIcon icon={faClock} className="ph-meta-icon" />
                {project.readTime}
              </span>
            )}
          </div>

          {/* Pagination dots */}
          <div className="ph-dots" role="tablist" aria-label="Project slides">
            {projects.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === active}
                aria-label={`Go to project ${i + 1}`}
                className={`ph-dot ${i === active ? "ph-dot--active" : ""}`}
                onClick={() => handleDot(i)}
              />
            ))}
          </div>
        </div>

        {/* Title */}
        <h2 className="ph-title">{project.title}</h2>

        {/* Description */}
        <p className="ph-description">{project.description}</p>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="ph-tags">
            {project.tags.map((tag) => (
              <span key={tag} className="ph-tag">{tag}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="ph-actions">
          {project.demoHref && (
            <a
              href={project.demoHref}
              target="_blank"
              rel="noreferrer"
              className="ph-btn ph-btn--demo"
            >
              View Demo
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </a>
          )}
          {project.githubHref && (
            <a
              href={project.githubHref}
              target="_blank"
              rel="noreferrer"
              className="ph-btn ph-btn--icon"
              aria-label="GitHub repository"
            >
              <FontAwesomeIcon icon={faGithub} />
            </a>
          )}
        </div>

      </div>
    </section>
  );
}