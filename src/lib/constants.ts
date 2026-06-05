export const SITE = {
  name: "Kantaka Śodhana",
  tagline: "Removing the Thorns of Deception",
  description: "AI & MLOps Platform",
  coordinates: "12.9716° N, 77.5946° E",
} as const;

export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Process", href: "/#process" },
  { label: "Stack", href: "/#stack" },
  { label: "Use Cases", href: "/#use-cases" },
  { label: "Wins", href: "/#wins" },
  { label: "Contact", href: "/#contact" },
] as const;

export const STATS = [
  { value: "3×", label: "Faster model delivery with automation" },
  { value: "60%", label: "Reduction in production failures" },
  { value: "24/7", label: "Monitoring + drift detection" },
  { value: "100%", label: "Traceability: data → model → deployment" },
] as const;

export const TECH_STACK = [
  "Airflow",
  "Kafka",
  "DVC",
  "MLflow",
  "PyTorch",
  "Ray Tune",
  "KServe",
  "BentoML",
  "Kubernetes",
  "Prometheus",
  "Grafana",
] as const;

export const ACHIEVEMENTS = [
  {
    id: 1,
    title: "2nd Place — NHA Hackathon",
    description: "Problem Statement 2: Radiological image-based correlation",
    event: "National Health Authority",
    place: "Runner-up",
  },
  {
    id: 2,
    title: "3rd Place — NHA Hackathon",
    description: "Problem Statement 3: Document forgery detection",
    event: "National Health Authority",
    place: "3rd Place",
  },
] as const;

export const TEAM_MEMBERS = [
  { id: "1", name: "Member 1", role: "Founder & CEO", image: "" },
  { id: "2", name: "Member 2", role: "CTO", image: "" },
  { id: "3", name: "Member 3", role: "ML Engineer", image: "" },
  { id: "4", name: "Member 4", role: "Full-Stack Developer", image: "" },
  { id: "5", name: "Member 5", role: "Data Scientist", image: "" },
  { id: "6", name: "Member 6", role: "DevOps Engineer", image: "" },
] as const;

export const HERO_TEXTS = [
  "Removing the Thorns of Deception",
  "Every fraud leaves a trace. We find it.",
  "From data to deployment. Governed.",
  "The digital Kantaka Śodhana.",
] as const;
