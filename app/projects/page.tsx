"use client"

import { useState } from "react";
import ProjectCard from "@/components/project-card"
import ProjectHighlight, { HighlightedProject } from "@/components/project-highlight";

const FEATURED: HighlightedProject[] = [
  {
    title: "Species Distribution Model",
    description: "Interactive visualization of butterfly occurrence data across North America, built with deck.gl and PostGIS. Temporal animation lets you scrub through observations from 2000–2024.",
    date: "January 01, 2026",
    readTime: "10 min read",
    tags: ["Python", "GIS", "deck.gl", "scikit-learn", "PostGIS"],
    image: "/screenshots/sdm.png",
    demoHref: "/projects/species-distribution-model",
    githubHref: "https://github.com/plantmandev/plantman.dev",
  },
  {
    title: "Butterfly Population Analysis",
    description: "Statistical analysis of Lepidoptera survey data collected in the Colorado Front Range...",
    date: "March 15, 2025",
    readTime: "8 min read",
    tags: ["R", "GBIF", "iNaturalist", "ggplot2"],
    image: "/screenshots/butterfly-analysis.png",
    demoHref: "/projects/butterfly-population",
    githubHref: "https://github.com/plantmandev/plantman.dev",
  },
];

const FILTER_CATEGORIES = [
  "All Projects",
  "GIS",
  "Data Analytics",
  "Biological Datasets",
  "Machine Learning",
] as const;

type FilterCategory = (typeof FILTER_CATEGORIES)[number];

// Category → which tag strings qualify a card for that filter
const CATEGORY_TAGS: Record<FilterCategory, string[]> = {
  "All Projects":        [],
  "GIS":                 ["GIS", "PostGIS", "deck.gl", "MapLibre", "QGIS"],
  "Data Analytics":      ["R", "Python", "ggplot2", "pandas", "scikit-learn"],
  "Biological Datasets": ["GBIF", "iNaturalist", "Lepidoptera"],
  "Machine Learning":    ["scikit-learn", "ML", "Machine Learning"],
};

interface CardData {
  title: string;
  description: string;
  date: string;
  readTime: string;
  image: string;
  githubHref: string;
  externalHref: string;
  tags: string[];
}

const CARDS: CardData[] = [
  {
    title: "Butterfly Population Analysis",
    description: "A species distribution model built on 291k GBIF occurrence records across North America, visualized with deck.gl and PostGIS.",
    date: "January 01, 2026",
    readTime: "10 min read",
    image: "/images/butterfly-analysis.jpg",
    githubHref: "https://github.com/plantmandev/species-distribution-model",
    externalHref: "/projects/species-distribution-model",
    tags: ["GIS", "PostGIS", "GBIF", "deck.gl", "scikit-learn"],
  },
  {
    title: "Butterfly Population Analysis",
    description: "A species distribution model built on 291k GBIF occurrence records across North America, visualized with deck.gl and PostGIS.",
    date: "January 01, 2026",
    readTime: "10 min read",
    image: "/images/butterfly-analysis.jpg",
    githubHref: "https://github.com/plantmandev/species-distribution-model",
    externalHref: "#",
    tags: ["R", "GBIF", "iNaturalist", "ggplot2"],
  },
  {
    title: "Butterfly Population Analysis",
    description: "A species distribution model built on 291k GBIF occurrence records across North America, visualized with deck.gl and PostGIS.",
    date: "January 01, 2026",
    readTime: "10 min read",
    image: "/images/butterfly-analysis.jpg",
    githubHref: "https://github.com/plantmandev/species-distribution-model",
    externalHref: "#",
    tags: ["Python", "scikit-learn", "Machine Learning"],
  },
];

export default function Projects() {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("All Projects");

  const visibleCards = CARDS.filter((card) => {
    if (activeFilter === "All Projects") return true;
    const required = CATEGORY_TAGS[activeFilter];
    return card.tags.some((t) => required.includes(t));
  });

  return (
    <div>
      {/* Full-width carousel — intentionally outside the constrained column */}
      <ProjectHighlight projects={FEATURED} interval={10000} />

      {/* Constrained column — matches hero and footer width */}
      <section className="projects-section">
        <div className="projects-content">

          {/* Filter row */}
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

          {/* Cards */}
          {visibleCards.length > 0 ? (
            visibleCards.map((card, i) => (
              <ProjectCard
                key={i}
                title={card.title}
                description={card.description}
                date={card.date}
                readTime={card.readTime}
                image={card.image}
                githubHref={card.githubHref}
                externalHref={card.externalHref}
              />
            ))
          ) : (
            <p className="projects-empty">No projects in this category yet.</p>
          )}

        </div>
      </section>
    </div>
  );
}