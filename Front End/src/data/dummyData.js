export const agentsData = [
  {
    id: "folder",
    name: "Structure Agent",
    fullName: "Folder & Structure Reviewer Agent",
    description: "Evaluates project directory organization, modularity, and compliance with clean code patterns.",
    icon: "FolderIcon",
    score: 88,
    status: "done", // done, in_progress, pending
    color: "indigo",
    bullets: [
      "Well-structured directory with clear separation of concerns (Components, Pages, Services, Context).",
      "Noticeable absence of circular dependencies, showing clean module boundary management.",
      "Recommendation: Consolidate configuration files at the root level to simplify deployment scripts."
    ]
  },
  {
    id: "documentation",
    name: "Documentation Agent",
    fullName: "Documentation Reviewer Agent",
    description: "Analyzes README completeness, inline documentation, API specifications, and code readability.",
    icon: "DocIcon",
    score: 72,
    status: "done",
    color: "blue",
    bullets: [
      "README is present and covers basic installation instructions.",
      "Inline comments are sparse in critical helper modules, making deep debugging harder for new devs.",
      "Recommendation: Document all API contracts and add JSDoc comments to complex React Hooks."
    ]
  },
  {
    id: "innovation",
    name: "Innovation Agent",
    fullName: "Innovation Reviewer Agent",
    description: "Appraises engineering creativity, performance optimizations, and the use of modern development patterns.",
    icon: "SparklesIcon",
    score: 95,
    status: "done",
    color: "violet",
    bullets: [
      "Excellent use of client-side state hooks combined with optimized rendering contexts.",
      "Advanced React 19 features are integrated seamlessly without compromising older runtime support.",
      "Recommendation: Explore React Server Components (RSC) to minimize bundle footprint on subsequent pages."
    ]
  },
  {
    id: "bug",
    name: "Bug & Correctness Agent",
    fullName: "Bug & Correctness Reviewer Agent",
    description: "Scans for logic errors, memory leaks, unhandled exceptions, and edge-case vulnerabilities.",
    icon: "BugIcon",
    score: 84,
    status: "done",
    color: "rose",
    bullets: [
      "No critical infinite-rendering bugs detected in React component lifecycles.",
      "Several async operations lack proper error catch blocks, which may crash the UI during API downtime.",
      "Recommendation: Wrap all fetch calls in robust try-catch blocks and add a global error boundary."
    ]
  },
  {
    id: "security",
    name: "Security Agent",
    fullName: "Security Reviewer Agent",
    description: "Audits vulnerability reports, looks for exposed API secrets, and checks for package vulnerabilities.",
    icon: "ShieldIcon",
    score: 90,
    status: "done",
    color: "emerald",
    bullets: [
      "Environment variables are correctly externalized; no hardcoded API keys found in VCS tracking.",
      "Dependency tree shows two packages with medium-risk CVEs (related to dev server packages).",
      "Recommendation: Execute 'npm audit fix' and upgrade minor versions of third-party CSS compilers."
    ]
  },
  {
    id: "presentation",
    name: "Presentation Agent",
    fullName: "Presentation Reviewer Agent",
    description: "Inspects UI design, layouts, responsiveness, typography, and visual accessibility standards.",
    icon: "EyeIcon",
    score: 81,
    status: "done",
    color: "cyan",
    bullets: [
      "Visually stunning theme integration with smooth hover states and consistent typography scaling.",
      "Contrast ratios are compliant with WCAG AA standards in dark mode, but fall slightly short in light mode.",
      "Recommendation: Increase font weight or adjust contrast colors for secondary text tags in light mode."
    ]
  },
  {
    id: "interview",
    name: "Interview Agent",
    fullName: "Interview & Q&A Agent",
    description: "Simulates architectural Q&A to check how developer decisions map to standard trade-offs.",
    icon: "ChatIcon",
    score: 78,
    status: "done",
    color: "amber",
    bullets: [
      "Code shows high familiarity with React hooks but could justify state choice decisions better.",
      "Separation of presentation and business logic is clear, showcasing professional-grade architectural patterns.",
      "Recommendation: Document state-management trade-offs in architecture.md to facilitate team onboarding."
    ]
  },
  {
    id: "improvement",
    name: "Improvement Agent",
    fullName: "Improvement & Feedback Agent",
    description: "Synthesizes final developer roadmaps, refactoring guides, and direct actionable optimizations.",
    icon: "TrendingUpIcon",
    score: 86,
    status: "done",
    color: "orange",
    bullets: [
      "Clear pathway forward exists by focusing first on Documentation and Bug/Correctness agents.",
      "Performance bottlenecks can be reduced by implementing lazy loading for heavy dashboard widgets.",
      "Recommendation: Establish a strict code linting pipeline pre-commit to automatically resolve styling issues."
    ]
  }
];

export const overallEvaluation = {
  score: 84,
  grade: "Good",
  summary: "Your project displays high structural cleanliness and outstanding innovation scores. Primary areas of focus for improvement are code documentation coverage and handling asynchronous error boundaries.",
  meta: {
    projectName: "ProjectReviewer AI",
    analyzedAt: "2026-07-04 14:30:00",
    filesScanned: 42,
    loc: 4850,
    language: "JavaScript/React"
  }
};
