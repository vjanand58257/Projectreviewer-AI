"""
Folder Analyzer Agent — pure filesystem checks, ZERO API calls, ZERO network access.

Checks the extracted project directory for structural indicators and returns
a scored report in the canonical agent schema:
  {"agent": "folder", "score": 0-100, "data": {...}, "errors": []}

Scoring Weights (total = 100 points):
  README present                       15 pts  — high: every project needs one
  Tests folder present                 15 pts  — high: testability matters
  Frontend indicators present          10 pts
  Backend indicators present           10 pts
  .gitignore present                   10 pts
  Docker / docker-compose present       8 pts
  Database indicators present           8 pts
  LICENSE file present                  8 pts
  CI/CD config present                  8 pts
  Images / assets folder present        8 pts
                                 Total 100 pts
"""

from pathlib import Path
import logging

from agents.base_agent import BaseAgent
from agents.registry import register_agent

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# File / directory name patterns for each check
# ---------------------------------------------------------------------------

README_NAMES = {"readme.md", "readme.txt", "readme.rst", "readme"}

FRONTEND_FILES = {
    "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "vite.config.js", "vite.config.ts",
    "webpack.config.js", "webpack.config.ts",
    "next.config.js", "next.config.ts",
    "angular.json", "svelte.config.js",
    "nuxt.config.js", "nuxt.config.ts",
    ".babelrc", "babel.config.js",
    "tsconfig.json",
}
FRONTEND_DIRS = {
    # Named frontend roots — the most direct indicator
    "frontend", "src", "public", "pages", "components", "views", "client",
    # Common alternative names
    "ui", "web", "app", "static", "webapp", "www",
}
# Tertiary fallback: if the project has HTML/JSX/TSX/Vue/Svelte files anywhere,
# it almost certainly has a frontend layer even without a named directory.
FRONTEND_EXTENSIONS = {".html", ".jsx", ".tsx", ".vue", ".svelte"}

BACKEND_FILES = {
    "requirements.txt", "requirements.in", "pipfile", "pipfile.lock",
    "app.py", "main.py", "server.py", "wsgi.py", "asgi.py",
    "manage.py",                               # Django
    "pom.xml", "build.gradle", "build.sbt",   # Java / Scala
    "go.mod",                                  # Go
    "cargo.toml",                              # Rust
    "gemfile",                                 # Ruby
    "composer.json",                           # PHP
    "mix.exs",                                 # Elixir
    "package.json",                            # Node (already frontend but overlaps)
}
BACKEND_DIRS = {"api", "server", "backend", "app", "service", "services", "routes", "controllers", "handlers"}

DATABASE_FILES = {
    # SQL migration files (matched by suffix)
    # ORM / schema descriptors
    "models.py", "models.js", "models.ts",
    "schema.py", "schema.rb", "schema.prisma",
    "database.py", "db.py",
    "alembic.ini",                             # Alembic
    "flyway.conf",                             # Flyway
    "liquibase.properties",
    "ormconfig.json", "ormconfig.ts",          # TypeORM
    "knexfile.js", "knexfile.ts",
    "sequelize-config.js",
}
DATABASE_DIRS = {"migrations", "migration", "db", "database", "schemas"}
DATABASE_MIGRATION_SUFFIXES = {".sql", ".migration"}
DOCKER_COMPOSE_DB_SERVICES = {"postgres", "postgresql", "mysql", "mariadb", "mongo", "mongodb", "redis", "sqlite"}

TESTS_DIRS = {"tests", "test", "__tests__", "spec", "specs", "e2e", "integration", "unit"}
TESTS_FILE_PATTERNS = {"test_", "_test.", ".test.", ".spec."}

DOCKER_FILES = {"dockerfile", "docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"}

LICENSE_NAMES = {"license", "license.md", "license.txt", "licence", "licence.md", "licence.txt", "copying"}

CICD_DIRS = {".github", ".gitlab", ".circleci", ".travis"}
CICD_FILES = {
    ".travis.yml", ".travis.yaml",
    "jenkinsfile",
    "azure-pipelines.yml", "azure-pipelines.yaml",
    ".gitlab-ci.yml", ".gitlab-ci.yaml",
    "bitbucket-pipelines.yml",
    "circle.yml",
    ".drone.yml", ".drone.yaml",
}
# .github/workflows/ presence is checked via the directory tree

ASSETS_DIRS = {"assets", "images", "img", "media", "static", "public", "icons", "fonts"}
ASSETS_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".bmp", ".ttf", ".woff", ".woff2"}

GITIGNORE_NAMES = {".gitignore"}


# ---------------------------------------------------------------------------
# Score weights (must sum to 100)
# ---------------------------------------------------------------------------

WEIGHTS = {
    "readme":    15,
    "tests":     15,
    "frontend":  10,
    "backend":   10,
    "gitignore": 10,
    "docker":     8,
    "database":   8,
    "license":    8,
    "cicd":       8,
    "assets":     8,
}
assert sum(WEIGHTS.values()) == 100, "Weights must sum to 100"


# ---------------------------------------------------------------------------
# Helper: check docker-compose for database service
# ---------------------------------------------------------------------------

def _has_docker_db_service(project_root: Path) -> bool:
    """Return True if any docker-compose file references a known DB service image."""
    for fname in ("docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"):
        dc_file = project_root / fname
        if dc_file.is_file():
            try:
                content = dc_file.read_text(encoding="utf-8", errors="ignore").lower()
                if any(svc in content for svc in DOCKER_COMPOSE_DB_SERVICES):
                    return True
            except Exception:
                pass
    return False


# ---------------------------------------------------------------------------
# Helper: check for CI/CD workflows directory (e.g. .github/workflows/)
# ---------------------------------------------------------------------------

def _has_cicd_workflows_dir(project_root: Path) -> bool:
    for cicd_dir in CICD_DIRS:
        d = project_root / cicd_dir
        if d.is_dir():
            return True
    return False


# ---------------------------------------------------------------------------
# Core scan function
# ---------------------------------------------------------------------------

def _scan(project_root: Path) -> dict:
    """
    Walk the project root and detect structural indicators.
    Returns a dict of booleans keyed by check name plus evidence strings.
    """
    results = {k: False for k in WEIGHTS}
    evidence = {k: [] for k in WEIGHTS}  # list of found paths/names

    # Collect all top-level entries for quick checks
    top_names_lower = {p.name.lower() for p in project_root.iterdir() if project_root.is_dir()} if project_root.is_dir() else set()

    # Walk entire tree once, building sets for fast lookup
    all_files_lower: set[str] = set()       # lowercased filenames only
    all_dirs_lower: set[str] = set()        # lowercased directory names only
    all_rel_paths: list[Path] = []          # all relative paths

    for p in project_root.rglob("*"):
        rel = p.relative_to(project_root)
        all_rel_paths.append(rel)
        name_lower = p.name.lower()
        if p.is_dir():
            all_dirs_lower.add(name_lower)
        else:
            all_files_lower.add(name_lower)

    # ---- README ----
    for fname in all_files_lower:
        if fname in README_NAMES:
            results["readme"] = True
            evidence["readme"].append(fname)
            break

    # ---- .gitignore ----
    for fname in all_files_lower:
        if fname in GITIGNORE_NAMES:
            results["gitignore"] = True
            evidence["gitignore"].append(fname)
            break

    # ---- LICENSE ----
    for fname in all_files_lower:
        if fname in LICENSE_NAMES:
            results["license"] = True
            evidence["license"].append(fname)
            break

    # ---- Docker ----
    for fname in all_files_lower:
        if fname in DOCKER_FILES:
            results["docker"] = True
            evidence["docker"].append(fname)
    # Only mark True if at least one was found
    results["docker"] = bool(evidence["docker"])

    # ---- Frontend ----
    for fname in FRONTEND_FILES:
        if fname in all_files_lower:
            results["frontend"] = True
            evidence["frontend"].append(fname)
            break
    if not results["frontend"]:
        for dname in FRONTEND_DIRS:
            if dname in all_dirs_lower:
                results["frontend"] = True
                evidence["frontend"].append(f"{dname}/")
                break
    # Tertiary: detect by presence of HTML/JSX/TSX/Vue/Svelte files anywhere
    if not results["frontend"]:
        for rel in all_rel_paths:
            if rel.suffix.lower() in FRONTEND_EXTENSIONS and not rel.is_dir():
                results["frontend"] = True
                evidence["frontend"].append(f"{rel.suffix.lower()} files detected")
                break

    # ---- Backend ----
    for fname in BACKEND_FILES:
        if fname in all_files_lower:
            results["backend"] = True
            evidence["backend"].append(fname)
            break
    if not results["backend"]:
        for dname in BACKEND_DIRS:
            if dname in all_dirs_lower:
                results["backend"] = True
                evidence["backend"].append(f"{dname}/")
                break

    # ---- Database ----
    # Check ORM config / schema files
    for fname in DATABASE_FILES:
        if fname in all_files_lower:
            results["database"] = True
            evidence["database"].append(fname)
            break
    # Check migration directories
    if not results["database"]:
        for dname in DATABASE_DIRS:
            if dname in all_dirs_lower:
                results["database"] = True
                evidence["database"].append(f"{dname}/")
                break
    # Check migration file suffixes
    if not results["database"]:
        for rel in all_rel_paths:
            if rel.suffix.lower() in DATABASE_MIGRATION_SUFFIXES:
                results["database"] = True
                evidence["database"].append(str(rel))
                break
    # Check docker-compose for DB service
    if not results["database"]:
        if _has_docker_db_service(project_root):
            results["database"] = True
            evidence["database"].append("docker-compose DB service")

    # ---- Tests ----
    for dname in TESTS_DIRS:
        if dname in all_dirs_lower:
            results["tests"] = True
            evidence["tests"].append(f"{dname}/")
            break
    if not results["tests"]:
        for fname in all_files_lower:
            if any(pat in fname for pat in TESTS_FILE_PATTERNS):
                results["tests"] = True
                evidence["tests"].append(fname)
                break

    # ---- CI/CD ----
    if _has_cicd_workflows_dir(project_root):
        results["cicd"] = True
        for d in CICD_DIRS:
            if (project_root / d).is_dir():
                evidence["cicd"].append(f"{d}/")
    if not results["cicd"]:
        for fname in CICD_FILES:
            if fname in all_files_lower:
                results["cicd"] = True
                evidence["cicd"].append(fname)
                break

    # ---- Assets / Images ----
    for dname in ASSETS_DIRS:
        if dname in all_dirs_lower:
            results["assets"] = True
            evidence["assets"].append(f"{dname}/")
            break
    if not results["assets"]:
        for rel in all_rel_paths:
            if rel.suffix.lower() in ASSETS_EXTENSIONS:
                results["assets"] = True
                evidence["assets"].append(str(rel))
                break

    return results, evidence


# ---------------------------------------------------------------------------
# Score calculator + report builder
# ---------------------------------------------------------------------------

def _build_report(results: dict, evidence: dict) -> dict:
    score = sum(WEIGHTS[k] for k, v in results.items() if v)

    highlights = []
    findings = []
    recommendations = []

    # Highlights: things found that are positive
    label_map = {
        "readme":    ("README file", "README"),
        "tests":     ("tests directory", "test suite"),
        "frontend":  ("frontend layer", "frontend"),
        "backend":   ("backend layer", "backend"),
        "gitignore": (".gitignore", ".gitignore"),
        "docker":    ("Docker configuration", "Docker"),
        "database":  ("database layer", "database"),
        "license":   ("LICENSE file", "LICENSE"),
        "cicd":      ("CI/CD configuration", "CI/CD pipeline"),
        "assets":    ("images/assets directory", "assets"),
    }

    for key, (long_label, short_label) in label_map.items():
        found = results[key]
        ev = evidence[key]
        ev_str = f" ({', '.join(ev[:2])})" if ev else ""
        if found:
            highlights.append(f"{long_label.capitalize()} detected{ev_str}.")
        else:
            findings.append(f"No {long_label} found.")
            recommendations.append(f"Add a {short_label} — this is a critical project indicator.")

    return {
        "agent": "folder",
        "score": score,
        "data": {
            "highlights": highlights,
            "findings": findings,
            "recommendations": recommendations,
        },
        "errors": [],
    }


# ---------------------------------------------------------------------------
# Agent class (registered in the dynamic registry)
# ---------------------------------------------------------------------------

@register_agent("folder")
class FolderAgent(BaseAgent):
    """
    Evaluates project directory structure via pure filesystem inspection.
    Makes NO network calls and NO Gemini API calls — entirely offline.
    """

    def __init__(self):
        super().__init__("Folder Agent")

    def run(self, code_context: dict) -> dict:
        """
        Args:
            code_context: must contain 'project_root' (str | Path) pointing
                          to the extracted project directory.
        Returns:
            Canonical agent schema dict.
        """
        project_root_raw = code_context.get("project_root")
        if not project_root_raw:
            return {
                "agent": "folder",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": ["Missing 'project_root' in code_context."],
            }

        project_root = Path(project_root_raw)
        if not project_root.is_dir():
            return {
                "agent": "folder",
                "score": 0,
                "data": {"highlights": [], "findings": [], "recommendations": []},
                "errors": [f"project_root does not exist or is not a directory: {project_root}"],
            }

        logger.info(f"FolderAgent scanning: {project_root}")
        results, evidence = _scan(project_root)
        report = _build_report(results, evidence)
        logger.info(f"FolderAgent score: {report['score']}/100")
        return report
