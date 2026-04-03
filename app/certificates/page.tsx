"use client";

import { useState } from "react";
import CertCard, { CertCardProps } from "@/components/certificate-card"

const FILTER_CATEGORIES = [
  "All Certificates",
  "GIS",
  "Computer Science",
  "EMT",
] as const;

type FilterCategory = (typeof FILTER_CATEGORIES)[number];

const CATEGORY_TAGS: Record<FilterCategory, string[]> = {
  "All Certificates": [],
  "GIS":              ["GIS", "Remote Pilot", "Geospatial"],
  "Computer Science": ["SQL", "Python", "Data Analytics", "Algorithms"],
  "EMT":              ["EMT", "Medical", "Trauma"],
};

const CERTS: CertCardProps[] = [
  {
    title:          "Sequence Query Language (SQL)",
    date:           "April, 2024",
    description:    "Foundations of relational database design, querying, and data extraction. Applied to real-world pipelines including spatial database workflows using MySQL and standard SQL environments.",
    image:          "/images/certs/365-data-science.png",
    credentialHref: "https://learn.365datascience.com/certificates/",
    category:       "SQL",
    published:      true,
  },
  {
    title:          "Dynamic Programming, Greedy Algorithms",
    date:           "October, 2025",
    description:    "Algorithm design and computational thinking covering dynamic programming, greedy strategies, and graph algorithms. Builds problem-solving foundations directly applicable to geospatial data processing and software engineering.",
    image:          "/images/certs/cu-boulder.png",
    credentialHref: "https://coursera.org/verify/",
    category:       "Algorithms",
    published:      true,
  },
  {
    title:          "National Registry Emergency Medical Technician (NREMT)",
    date:           "Work in Progress",
    description:    "Full certification earned through U.S. Army 68W Combat Medic training. Covers emergency patient assessment, trauma care, airway management, and prehospital medical intervention.",
    image:          "/images/certs/nremt.png",
    credentialHref: "#",
    category:       "EMT",
    published:      true,
  },
  {
    title:          "Part 107 Remote Pilot Certificate",
    date:           "Work in Progress",
    description:    "FAA certification covering airspace classification, weather analysis, emergency procedures and decision-making. Applied to GIS photogrammetry and aerial data collection operations.",
    image:          "/images/certs/faa.png",
    credentialHref: "#",
    category:       "Remote Pilot",
    published:      false,
  },
  {
    title:          "Google Data Analytics Certificate",
    date:           "Work in Progress",
    description:    "Foundations of data analytics including data cleaning, analysis and visualization. Covers spreadsheets, SQL, R, and Tableau with emphasis on driving insights from real-world datasets.",
    image:          "/images/certs/google.png",
    credentialHref: "#",
    category:       "Data Analytics",
    published:      false,
  },
  {
    title:          "Tactical Combat Casualty Care",
    date:           "Work in Progress",
    description:    "Battlefield emergency care certification covering hemorrhage control, airway management, and casualty assessment under fire. Earned through U.S. Army 68W Combat Medic training pipeline.",
    image:          "/images/certs/tccc.png",
    credentialHref: "#",
    category:       "Medical",
    published:      false,
  },
];

export default function Certificates() {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("All Certificates");

  const visibleCerts = CERTS.filter((cert) => {
    if (!cert.published) return false;
    if (activeFilter === "All Certificates") return true;
    return CATEGORY_TAGS[activeFilter].includes(cert.category);
  });

  return (
    <section className="projects-section">
      <div className="projects-content">

        <div className="projects-filters">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`project-filter-btn ${activeFilter === cat ? "active" : ""}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {visibleCerts.length > 0 ? (
          visibleCerts.map((cert, i) => (
            <CertCard key={i} {...cert} />
          ))
        ) : (
          <p className="projects-empty">No certificates in this category yet.</p>
        )}

      </div>
    </section>
  );
}