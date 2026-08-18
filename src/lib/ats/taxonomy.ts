/**
 * Skill taxonomy with alias expansion.
 *
 * Real applicant tracking systems index on canonical skill entities, not raw strings.
 * "k8s", "K8S" and "Kubernetes" must all resolve to one node, otherwise a resume that
 * says "k8s" scores zero against a requisition that says "Kubernetes".
 */

export type SkillCategory =
  | "language"
  | "frontend"
  | "backend"
  | "data"
  | "cloud"
  | "devops"
  | "database"
  | "ml"
  | "mobile"
  | "testing"
  | "security"
  | "practice"
  | "tooling"
  | "design"
  | "product"
  | "soft";

export interface SkillNode {
  canonical: string;
  category: SkillCategory;
  aliases: string[];
  /** Relative market weight used when a job description does not state importance. */
  weight: number;
  /** Skills that are effectively deprecated signal risk when they are the only evidence. */
  dated?: boolean;
}

const S = (
  canonical: string,
  category: SkillCategory,
  aliases: string[] = [],
  weight = 1,
  dated = false,
): SkillNode => ({ canonical, category, aliases, weight, dated });

export const SKILL_TAXONOMY: SkillNode[] = [
  // Languages
  S("JavaScript", "language", ["js", "ecmascript", "es6", "es2015", "vanilla js"], 1.2),
  S("TypeScript", "language", ["ts", "type script"], 1.3),
  S("Python", "language", ["python3", "py"], 1.3),
  S("Java", "language", ["java 8", "java8", "java 11", "java 17", "core java"], 1.2),
  S("C++", "language", ["cpp", "c plus plus", "cplusplus"], 1.1),
  S("C#", "language", ["csharp", "c sharp", "dotnet c#"], 1.1),
  S("Go", "language", ["golang"], 1.2),
  S("Rust", "language", ["rust-lang"], 1.1),
  S("Ruby", "language", ["ruby on rails language"], 0.9),
  S("PHP", "language", ["php8", "php7"], 0.8),
  S("Kotlin", "language", [], 1.0),
  S("Swift", "language", ["swiftui language"], 1.0),
  S("Scala", "language", [], 1.0),
  S("SQL", "language", ["structured query language", "t-sql", "pl/sql", "ansi sql"], 1.3),
  S("Bash", "language", ["shell scripting", "shell", "sh", "zsh"], 0.8),
  S("R", "language", ["r language"], 0.8),
  S("MATLAB", "language", [], 0.6),
  S("Perl", "language", [], 0.4, true),
  S("COBOL", "language", [], 0.3, true),

  // Frontend
  S("React", "frontend", ["react.js", "reactjs", "react 18", "react 19"], 1.3),
  S("Next.js", "frontend", ["nextjs", "next js", "next 14", "next 15", "next 16"], 1.2),
  S("Vue.js", "frontend", ["vue", "vuejs", "vue 3", "nuxt"], 1.0),
  S("Angular", "frontend", ["angularjs", "angular 2+", "angular 17"], 1.0),
  S("Svelte", "frontend", ["sveltekit"], 0.9),
  S("Redux", "frontend", ["redux toolkit", "rtk"], 0.9),
  S("HTML", "frontend", ["html5", "semantic html"], 0.8),
  S("CSS", "frontend", ["css3", "scss", "sass", "less"], 0.8),
  S("Tailwind CSS", "frontend", ["tailwind", "tailwindcss"], 0.9),
  S("Webpack", "frontend", ["web pack"], 0.7),
  S("Vite", "frontend", ["vitejs"], 0.8),
  S("Three.js", "frontend", ["threejs", "webgl", "react three fiber", "r3f"], 0.8),
  S("Accessibility", "frontend", ["a11y", "wcag", "aria", "screen reader support"], 1.0),
  S("Web Performance", "frontend", ["core web vitals", "lighthouse", "lcp", "cls", "inp"], 1.0),

  // Backend
  S("Node.js", "backend", ["node", "nodejs", "node js"], 1.2),
  S("Express.js", "backend", ["express", "expressjs"], 0.9),
  S("Spring Boot", "backend", ["spring", "springboot", "spring framework"], 1.1),
  S("Django", "backend", ["django rest framework", "drf"], 1.0),
  S("Flask", "backend", [], 0.9),
  S("FastAPI", "backend", ["fast api"], 1.0),
  S("Ruby on Rails", "backend", ["rails", "ror"], 0.8),
  S(".NET", "backend", ["dotnet", ".net core", "asp.net", "aspnet"], 1.0),
  S("GraphQL", "backend", ["apollo", "graph ql"], 1.0),
  S("REST APIs", "backend", ["rest", "restful", "rest api", "restful api", "http api"], 1.2),
  S("gRPC", "backend", ["grpc", "protobuf", "protocol buffers"], 1.0),
  S("Microservices", "backend", ["micro services", "microservice architecture", "service oriented"], 1.2),
  S("Distributed Systems", "backend", ["distributed computing", "distributed architecture", "consensus", "sharding"], 1.4),
  S("System Design", "backend", ["systems design", "architecture design", "high level design", "hld"], 1.3),
  S("Event-Driven Architecture", "backend", ["event driven", "pub/sub", "publish subscribe", "event sourcing", "cqrs"], 1.1),
  S("Caching", "backend", ["cache", "cdn caching", "memoization", "cache invalidation"], 1.0),
  S("WebSockets", "backend", ["websocket", "socket.io", "realtime messaging"], 0.8),

  // Data & queues
  S("PostgreSQL", "database", ["postgres", "psql", "pg"], 1.2),
  S("MySQL", "database", ["mariadb"], 1.0),
  S("MongoDB", "database", ["mongo", "mongoose"], 1.0),
  S("Redis", "database", ["redis cache", "elasticache"], 1.1),
  S("DynamoDB", "database", ["dynamo"], 1.0),
  S("Cassandra", "database", ["apache cassandra"], 0.9),
  S("Elasticsearch", "database", ["elastic search", "opensearch", "elk"], 1.0),
  S("Snowflake", "database", [], 1.0),
  S("BigQuery", "database", ["big query"], 1.0),
  S("Kafka", "data", ["apache kafka", "kafka streams", "confluent"], 1.2),
  S("RabbitMQ", "data", ["rabbit mq", "amqp"], 0.8),
  S("Spark", "data", ["apache spark", "pyspark"], 1.1),
  S("Airflow", "data", ["apache airflow", "dags"], 1.0),
  S("dbt", "data", ["data build tool"], 0.9),
  S("ETL", "data", ["elt", "data pipeline", "data pipelines", "ingestion pipeline"], 1.1),
  S("Data Modeling", "data", ["dimensional modeling", "star schema", "schema design"], 1.0),
  S("Data Warehousing", "data", ["data warehouse", "lakehouse", "data lake"], 1.0),

  // Cloud & infra
  S("AWS", "cloud", ["amazon web services", "ec2", "s3", "lambda", "eks", "ecs", "cloudfront", "rds"], 1.4),
  S("Google Cloud Platform", "cloud", ["gcp", "google cloud", "gke", "cloud run", "bigtable"], 1.2),
  S("Microsoft Azure", "cloud", ["azure", "aks", "azure devops cloud"], 1.2),
  S("Kubernetes", "cloud", ["k8s", "kubernetes cluster", "helm", "kubectl"], 1.3),
  S("Docker", "devops", ["containerization", "containers", "docker compose", "dockerfile"], 1.2),
  S("Terraform", "devops", ["hcl", "infrastructure as code", "iac", "terragrunt"], 1.2),
  S("CI/CD", "devops", ["continuous integration", "continuous delivery", "continuous deployment", "ci cd", "cicd", "build pipeline"], 1.3),
  S("GitHub Actions", "devops", ["gh actions", "github workflow"], 0.9),
  S("Jenkins", "devops", ["jenkins pipeline"], 0.7),
  S("Observability", "devops", ["monitoring", "telemetry", "prometheus", "grafana", "datadog", "opentelemetry", "otel", "new relic", "splunk"], 1.3),
  S("On-Call", "devops", ["on call", "oncall", "incident response", "pagerduty", "sev1", "postmortem", "blameless retrospective"], 1.3),
  S("Site Reliability Engineering", "devops", ["sre", "slo", "sla", "error budget", "reliability engineering"], 1.2),
  S("Linux", "devops", ["unix", "ubuntu", "debian", "rhel"], 0.9),
  S("Git", "tooling", ["version control", "github", "gitlab", "bitbucket"], 0.8),
  S("Serverless", "cloud", ["lambda functions", "faas", "cloud functions"], 1.0),

  // ML / AI
  S("Machine Learning", "ml", ["ml", "supervised learning", "unsupervised learning", "model training"], 1.3),
  S("Deep Learning", "ml", ["neural networks", "cnn", "rnn", "transformer models"], 1.2),
  S("PyTorch", "ml", ["torch"], 1.1),
  S("TensorFlow", "ml", ["tf", "keras"], 1.0),
  S("scikit-learn", "ml", ["sklearn", "scikit learn"], 0.9),
  S("Natural Language Processing", "ml", ["nlp", "text classification", "named entity recognition", "ner"], 1.1),
  S("Large Language Models", "ml", ["llm", "llms", "gpt", "rag", "retrieval augmented generation", "prompt engineering", "fine tuning", "embeddings"], 1.3),
  S("MLOps", "ml", ["ml ops", "model deployment", "feature store", "model monitoring"], 1.1),
  S("Computer Vision", "ml", ["cv", "image classification", "object detection"], 1.0),
  S("Statistics", "ml", ["statistical analysis", "hypothesis testing", "regression analysis"], 1.0),

  // Mobile
  S("React Native", "mobile", ["react-native", "rn"], 1.0),
  S("iOS Development", "mobile", ["ios", "uikit", "swiftui", "xcode"], 1.0),
  S("Android Development", "mobile", ["android", "jetpack compose", "android studio"], 1.0),
  S("Flutter", "mobile", ["dart flutter"], 0.9),

  // Testing & quality
  S("Unit Testing", "testing", ["unit tests", "jest", "vitest", "junit", "pytest", "mocha"], 1.1),
  S("Integration Testing", "testing", ["integration tests", "contract testing"], 1.0),
  S("End-to-End Testing", "testing", ["e2e testing", "playwright", "cypress", "selenium"], 1.0),
  S("Test-Driven Development", "testing", ["tdd", "bdd"], 0.9),
  S("Code Review", "practice", ["peer review", "pull request review", "pr review"], 1.0),
  S("Performance Testing", "testing", ["load testing", "stress testing", "k6", "jmeter"], 0.9),

  // Security
  S("Application Security", "security", ["appsec", "owasp", "secure coding", "threat modeling", "penetration testing"], 1.2),
  S("Authentication", "security", ["oauth", "oauth2", "oidc", "saml", "sso", "jwt", "auth"], 1.1),
  S("Encryption", "security", ["tls", "ssl", "aes", "cryptography", "key management"], 1.0),
  S("Compliance", "security", ["soc 2", "soc2", "gdpr", "hipaa", "pci dss", "iso 27001"], 1.0),

  // Practices
  S("Agile", "practice", ["scrum", "kanban", "sprint planning", "agile methodology", "standups"], 0.9),
  S("Technical Documentation", "practice", ["design doc", "design docs", "rfc", "runbook", "adr"], 1.1),
  S("Mentoring", "soft", ["mentorship", "coaching engineers", "onboarding engineers", "mentored"], 1.2),
  S("Cross-Functional Collaboration", "soft", ["cross functional", "cross-team", "stakeholder management", "partnered with product"], 1.2),
  S("Technical Leadership", "soft", ["tech lead", "team lead", "led a team", "technical lead"], 1.3),
  S("Communication", "soft", ["written communication", "verbal communication", "presented to"], 0.9),
  S("Problem Solving", "soft", ["analytical thinking", "root cause analysis", "rca", "debugging"], 1.0),
  S("Ownership", "soft", ["end to end ownership", "end-to-end ownership", "drove", "owned"], 1.2),

  // Product / design adjacency
  S("Product Sense", "product", ["product thinking", "roadmap", "product requirements", "prd"], 1.0),
  S("A/B Testing", "product", ["ab testing", "experimentation", "split testing"], 1.0),
  S("Analytics", "product", ["amplitude", "mixpanel", "google analytics", "product analytics"], 0.9),
  S("UX Design", "design", ["user experience", "wireframing", "figma", "design system"], 0.8),
];

export interface TaxonomyIndexEntry {
  node: SkillNode;
  /** Alias surface form, lowercased. */
  surface: string;
}

const index = new Map<string, TaxonomyIndexEntry>();
for (const node of SKILL_TAXONOMY) {
  index.set(node.canonical.toLowerCase(), { node, surface: node.canonical.toLowerCase() });
  for (const alias of node.aliases) {
    if (!index.has(alias)) index.set(alias, { node, surface: alias });
  }
}

export const TAXONOMY_INDEX = index;

/** Longest surface forms first so "google cloud platform" wins over "google". */
export const TAXONOMY_SURFACES: string[] = Array.from(index.keys()).sort(
  (a, b) => b.length - a.length,
);

export function resolveSkill(term: string): SkillNode | null {
  const key = term.trim().toLowerCase();
  return index.get(key)?.node ?? null;
}

export function isKnownSkillTerm(term: string): boolean {
  return index.has(term.trim().toLowerCase());
}

/** Every surface form the taxonomy knows about, used to whitelist the spell checker. */
export const SKILL_VOCABULARY: Set<string> = new Set(
  Array.from(index.keys()).flatMap((surface) => surface.split(/[\s/]+/)).filter((w) => w.length > 1),
);
