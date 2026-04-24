"use client"

import { useState } from "react";
import ProjectCard from "@/components/project-card"
import ProjectHighlight, { HighlightedProject } from "@/components/project-highlight";

const FEATURED: HighlightedProject[] = [
  {
    title: "Species Distribution Model",
    description: "Interactive visualization of butterfly occurrence data across North America, built with deck.gl and PostGIS. Temporal animation lets you scrub through observations from 2000–2024.",
    date: "January 16, 2026",
    readTime: "10 min read",
    tags: ["Python", "GIS", "deck.gl", "scikit-learn", "PostGIS"],
    video: "/thumbnails/species-distribution-model-thumbnail.mp4",
    demoHref: "/projects/species-distribution-model",
    githubHref: "https://github.com/plantmandev/species-distribution-model",
  },
  {
    title: "Hobet Mine Analysis",
    description: "40-year Landsat time series of mountaintop removal and post-mining vegetation recovery at the Hobet Mine, West Virginia. Scrub through annual NDVI and NBR composites from 1985 to 2025.",
    date: "April 22, 2026",
    tags: ["Remote Sensing", "GIS", "deck.gl", "Landsat", "Python"],
    video: "/thumbnails/hobit-mine-analysis-thumbnail.mp4",
    demoHref: "/projects/hobet-mine-analysis",
    githubHref: "https://github.com/plantmandev/hobet-mine-analysis",
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
  readTime?: string;
  image?: string;
  imageAlt?: string;
  githubHref?: string;
  externalHref?: string;
  postHref?: string;
  tags: string[];
}

const CARDS: CardData[] = [
  {
    title: "Species Distribution Model",
    description: "Interactive visualization of butterfly occurrence data across North America, built with deck.gl and PostGIS. Temporal animation lets you scrub through observations from 2000–2024.",
    date: "January 16, 2026",
    image: "/species/danaus-plexippus.svg",
    imageAlt: "Monarch butterfly",
    githubHref: "https://github.com/plantmandev/species-distribution-model",
    postHref: "/projects/species-distribution-model",
    tags: ["GIS", "PostGIS", "GBIF", "deck.gl", "scikit-learn"],
  },
  {
    title: "Hobet Mine Analysis",
    description: "40-year Landsat time series of mountaintop removal and post-mining vegetation recovery at the Hobet Mine, West Virginia. Scrub through annual NDVI and NBR composites from 1985 to 2025.",
    date: "December 8, 2023",
    image: "/frames/ndvi/2000.png",
    imageAlt: "NDVI composite 2000",
    githubHref: "https://github.com/plantmandev/hobet-mine-analysis",
    postHref: "/projects/hobet-mine-analysis",
    tags: ["GIS", "deck.gl", "Python", "Remote Sensing", "Landsat"],
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
    <>
      <ProjectHighlight projects={FEATURED} interval={10000} />

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

          {visibleCards.length > 0 ? (
            visibleCards.map((card, i) => (
              <ProjectCard
                key={i}
                title={card.title}
                description={card.description}
                date={card.date}
                readTime={card.readTime}
                image={card.image}
                imageAlt={card.imageAlt}
                githubHref={card.githubHref}
                externalHref={card.externalHref}
                postHref={card.postHref}
              />
            ))
          ) : (
            <p className="projects-empty">No projects in this category yet.</p>
          )}

        </div>
      </section>
    </>
  );
}