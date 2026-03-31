import { HeroSection } from "@/components/hero-section";
import ProjectCard from "@/components/project-card";


export default function Home() {
  return (
    <div>
      <HeroSection />
      <section className="projects-section">
  <div className="projects-content">
    <h2 className="projects-title">Latest Projects</h2>
    <ProjectCard
      title="Butterfly Population Analysis"
      description="A species distribution model built on 291k GBIF occurrence records across North America, visualized with deck.gl and PostGIS."
      date="January 01, 2026"
      readTime="10 min read"
      image="/images/butterfly-analysis.jpg"
      githubHref="https://github.com/plantmandev/species-distribution-model"
      externalHref="https://plantman.dev/projects/sdm"
    />
  </div>
</section>
</div>
  );
}
