/**
 * Golden fixtures. These are the regression baseline for the rubric: if a scoring change
 * moves these numbers, the change must be deliberate and the rubric version must be bumped.
 */

export const STRONG_RESUME = `Priya Raman
Senior Software Engineer · 6 years · Distributed systems
Bengaluru, India | priya.raman@example.com | +91 98765 43210
linkedin.com/in/priyaraman | github.com/priyaraman

Summary
Senior Software Engineer with 6 years building payment infrastructure at scale. Cut p99 checkout latency 68% and owned a ledger service handling 12,000 requests per second.

Work Experience

Senior Software Engineer | Northwind Payments | Bengaluru, India | Mar 2022 - Present
- Owned the payments ledger service end to end, including schema, on-call and capacity planning for 12,000 requests per second at peak.
- Reduced p99 read latency from 840 ms to 120 ms by replacing N+1 queries with a covering index and request coalescing in PostgreSQL.
- Led a migration of 14 microservices from EC2 to Kubernetes, cutting infrastructure spend by $310,000 per year.
- Authored the RFC for event-sourced inventory using Kafka; reviewed by 3 staff engineers and adopted across 4 teams.
- Mentored 4 engineers and ran the code review guild, reducing average pull request cycle time 41%.

Software Engineer | Cobalt Systems | Pune, India | Jul 2019 - Feb 2022
- Built a Python and FastAPI reconciliation pipeline processing 2.4 million transactions daily with 99.98% accuracy.
- Automated deployment with Terraform and GitHub Actions, increasing deployment frequency from weekly to 22 times per week.
- Instrumented services with OpenTelemetry and Grafana, cutting Sev-2 incident volume 37% in two quarters.

Education
Bachelor of Technology in Computer Science | Indian Institute of Technology Bombay | 2015 - 2019
GPA: 8.9/10

Skills
Languages: Python, Go, TypeScript, SQL
Infrastructure: Kubernetes, Docker, Terraform, AWS
Data: PostgreSQL, Kafka, Redis
Practices: CI/CD, Observability, Code Review, System Design

Certifications
AWS Certified Solutions Architect - Associate
`;

export const WEAK_RESUME = `John Smith
john.smith@example.com
555-123-4567

My Journey

Software Developer, TechCorp, '19 - '22
- Responsible for developing web applications
- Worked on various projects with the team
- Helped with bug fixes and testing
- Participated in code reviews
- Duties included attending daily standups and sprint planning meetings
- Was responsible for maintaining the legacy reporting module

Junior Developer, DataWorks, '18 - '19
- Assisted with the migration of an internal tool
- Worked with senior developers on the customer portal
- Helped to write documentation for the API
- Involved in testing new features before release

The Toolkit
Java, Python, JavaScript, React, Angular, Vue, Node, Django, Flask, Spring, Kubernetes, Docker, AWS, Azure, GCP, Terraform, Kafka, Redis, MongoDB, PostgreSQL, MySQL, Elasticsearch, TensorFlow, PyTorch

Where I Studied
B.S. Computer Science, State University, 2019

I am a hard worker and a team player with excelent communication skills. I am detail-oriented and results-driven with a proven track record of delivering software. I have alot of experiance in software developement and I acheived many things throughout my career. I am a fast learner and a self-starter who can wear many hats and think outside the box. I am familar with modern developement practices and I beleive that my knowlege of the full stack would be benefical to your organisation.

References available upon request.
`;

export const NOT_A_RESUME = `INVOICE #48211

Bill To: Acme Corporation
1200 Market Street

Description                Quantity    Rate      Amount
Consulting services        40          $150      $6,000
Software licence           1           $1,200    $1,200

Subtotal: $7,200
Tax: $648
Total due: $7,848

Payment terms: net 30 days. Please remit payment to the account listed below.
`;

export const SAMPLE_JD = `Senior Software Engineer, Payments Platform

About the role
We are looking for a Senior Software Engineer to join our Payments Platform team. You will design and operate services that move billions of dollars annually.

What you'll do
- Design, build and operate distributed services with strong reliability guarantees.
- Own services end to end, including on-call rotation and incident response.
- Partner with product and risk teams to define the roadmap for the ledger.
- Mentor engineers and raise the technical bar through design review.

Minimum qualifications
- 5+ years of experience building backend services in Go, Java or Python.
- Strong experience with distributed systems, Kubernetes and PostgreSQL.
- Experience with observability tooling and on-call ownership.
- Experience designing REST APIs and event-driven systems with Kafka.

Preferred qualifications
- Experience with Terraform and infrastructure as code.
- Familiarity with gRPC and event sourcing.
- Experience with payments, ledgers or financial systems.

We are an equal opportunity employer.
`;
