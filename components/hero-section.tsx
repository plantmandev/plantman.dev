"use client";

import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { faLinkedin, faGithub } from "@fortawesome/free-brands-svg-icons";

export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-content">

        {/* Left — text content */}
        <div className="hero-text">
          <h1 className="hero-name">Gabriel Guzman Blanco</h1>

          {/* Social links */}
          <div className="hero-socials">
            <Link
              href="https://linkedin.com/in/gabeguzman"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="social-link"
            >
              <FontAwesomeIcon icon={faLinkedin} />
            </Link>
            <Link
              href="https://github.com/plantmandev"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="social-link"
            >
              <FontAwesomeIcon icon={faGithub} />
            </Link>
          </div>

          {/* Quote */}
          <blockquote className="hero-quote">
            <p>"Without data, you're just another person with an opinion"</p>
            <cite>- W. Edwards Deming</cite>
          </blockquote>

          {/* Actions */}
          <div className="hero-actions">
            <a href="/resume.pdf" download className="hero-button primary">
              Resume
              <FontAwesomeIcon icon={faDownload} />
            </a>
            <Link href="/projects" className="hero-button secondary">
              View Projects
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </Link>
          </div>
        </div>

        {/* Right — profile image */}
        <div className="hero-image">
          <Image
            src="/profile.png"
            alt="Gabriel Guzman Blanco"
            width={300}
            height={360}
            className="profile-img"
            priority
          />
        </div>

      </div>
    </section>
  );
}