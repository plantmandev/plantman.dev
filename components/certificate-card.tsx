"use client";

import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";

export interface CertCardProps {
  title: string;
  date: string;
  description: string;
  image: string;
  credentialHref: string;
  category: string;
  published: boolean;
}

export default function CertCard({
  title,
  date,
  description,
  image,
  credentialHref,
}: CertCardProps) {
  return (
    <div className="cert-card">
      <div className="cert-card-body">
        <div className="cert-card-meta">
          <span className="cert-card-meta-item">
            <FontAwesomeIcon icon={faCalendar} className="cert-card-meta-icon" />
            {date}
          </span>
        </div>
        <h3 className="cert-card-title">{title}</h3>
        <p className="cert-card-description">{description}</p>
        <div className="cert-card-actions">
          <a
            href={credentialHref}
            target="_blank"
            rel="noopener noreferrer"
            className="cert-card-btn"
          >
            Show credential
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
          </a>
        </div>
      </div>
      <div className="cert-card-image-wrapper">
        <Image
          src={image}
          alt={title}
          width={150}
          height={150}
          className="cert-card-image"
        />
      </div>
    </div>
  );
}