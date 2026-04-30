import HeroSection from "@/components/hero-section";
import ProjectCard from "@/components/project-card";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <section className="projects-section">
        <div className="projects-content">
          <h2 className="projects-title">Latest Projects</h2>
          <ProjectCard
            title="Species Distribution Model"
            description="Interactive visualization of butterfly occurrence data across North America, built with deck.gl and PostGIS. Temporal animation lets you scrub through observations from 2000–2024."
            date="January 16, 2026"
            postHref="/projects/species-distribution-model"
            githubHref="https://github.com/plantmandev/species-distribution-model"
          />
          <ProjectCard
            title="Mine Reclamation Analysis"
            description="40-year Landsat time series of mountaintop removal and post-mining vegetation recovery at the Hobet Mine, West Virginia. Scrub through annual NDVI and NBR composites from 1985 to 2025."
            date="December 8, 2023"
            postHref="/projects/mine-reclamation-analysis"
            githubHref="https://github.com/plantmandev/hobet-mine-analysis"
          />
        </div>
      </section>
    </div>
  );
}
