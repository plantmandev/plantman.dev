import React from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faClock, faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

// ── Types ────────────────────────────────────────────────────────────────────
export type ProjectCardProps = {
  title: string;
  description: string;
  date: string;
  readTime?: string;
  image?: string;
  imageAlt?: string;
  postHref?: string;
  githubHref?: string;
  externalHref?: string;
};

// ── Component ────────────────────────────────────────────────────────────────
export default function ProjectCard({
  title,
  description,
  date,
  readTime,
  image,
  imageAlt,
  postHref,
  githubHref,
  externalHref,
}: ProjectCardProps) {
  return (
    <div className="project-card">

      {/* Left — text content */}
      <div className="project-card-body">

        {/* Meta row */}
        <div className="project-card-meta">
          <span className="project-card-meta-item">
            <FontAwesomeIcon icon={faCalendar} />
            {date}
          </span>
          {readTime && (
            <span className="project-card-meta-item">
              <FontAwesomeIcon icon={faClock} />
              {readTime}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="project-card-title">{title}</h3>

        {/* Description */}
        <p className="project-card-description">{description}</p>

        {/* Actions */}
        <div className="project-card-actions">
          {postHref && (
            <Link href={postHref} className="project-card-btn project-card-btn--primary">
              Open
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </Link>
          )}
          {githubHref && (
            <a
              href={githubHref}
              target="_blank"
              rel="noopener noreferrer"
              className="project-card-btn project-card-btn--icon"
              aria-label="GitHub repository"
            >
              <FontAwesomeIcon icon={faGithub} />
            </a>
          )}
          {externalHref && (
            <a
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="project-card-btn project-card-btn--icon"
              aria-label="External link"
            >
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </a>
          )}
        </div>
      </div>

      {/* Right — image */}
      {image && (
        <div className="project-card-image-wrapper">
          <img
            src={image}
            alt={imageAlt ?? title}
            className="project-card-image"
          />
        </div>
      )}
    </div>
  );
}