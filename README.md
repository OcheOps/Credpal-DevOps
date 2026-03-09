# Credpal DevOps Challenge - Node.js App & IaC

I have built this project as a scaffold of a production-ready Node.js application, fully containerized, integrated with CI/CD through GitHub Actions, and equipped with Terraform-based AWS Infrastructure as Code (IaC).

## Directory Structure

```text
.
├── app/                  # Node.js application Code
│   ├── package.json      # Dependencies and scripts
│   ├── server.js         # Express app with endpoints
│   ├── server.test.js    # Jest test suite
│   ├── Dockerfile        # Multi-stage production ready Dockerfile
│   └── .dockerignore     # Ignored files for docker build
├── terraform/            # Infrastructure as Code
│   ├── main.tf           # AWS VPC, ECS Fargate, ALB, Security Groups
│   ├── variables.tf      # Variable definitions
│   └── outputs.tf        # Output variables (ALB DNS)
├── .github/
│   └── workflows/
│       └── pipeline.yml  # Github actions pipeline (Test, Build, Deploy)
├── docker-compose.yml    # Local development stack (App + Postgres)
├── .env.example          # Example environment variables file
└── README.md             # Project documentation
```

## Local Development Setup

To run the application locally alongside a PostgreSQL database using Docker Compose:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Start the services with Docker Compose:
   ```bash
   docker-compose up --build
   ```
   The application will be accessible at `http://localhost:3000/`.

3. Local Endpoints available:
   - `GET http://localhost:3000/health`: Healthcheck endpoint for Load Balancers.
   - `GET http://localhost:3000/status`: General status endpoint.
   - `POST http://localhost:3000/process`: Endpoint for processing payloads.

## How to Deploy the Application

There are two primary ways to deploy this architecture:

### Option 1: Automated Deployment via CI/CD (Recommended)
By simply committing and pushing your code to the `main` branch, the pre-configured GitHub Actions pipeline (`.github/workflows/pipeline.yml`) will automatically:
1. Run application tests.
2. Build the new Docker image and push it to GHCR.
3. Automatically apply the Terraform infrastructure changes targeting the newly pushed image.

*(Note: The `Deploy` job requires a manual approval if configured via a GitHub Environment).*

### Option 2: Manual Deployment via Terraform CLI
If you wish to deploy the infrastructure manually from your local machine:

1. Ensure you have the `AWS CLI`, `Terraform`, and `Docker` installed.
2. Authenticate your AWS CLI with an account having sufficient privileges.
3. Initialize Terraform:
   ```bash
   cd terraform
   terraform init
   ```
4. Review the infrastructure plan:
   ```bash
   terraform plan -var="image_tag=latest"
   ```
5. Apply the configuration:
   ```bash
   terraform apply -var="image_tag=latest" -auto-approve
   ```
6. The exact URL to access the deployed application will be outputted as `alb_dns_name` in the terminal after Terraform completes.

## Infrastructure Overview

I have designed the infrastructure to rely on Amazon Web Services (AWS) managed by Terraform (`/terraform`). It includes:

- **VPC & Subnets:** Isolated network containing standard public and private subnets.
- **Application Load Balancer (ALB):** Public-facing ALB accepting requests on port 80 (with placeholders for ACM-managed SSL on port 443) and routing them to ECS tasks.
- **ECS (Fargate):** Scalable container orchestration running the Node.js Docker containers in private subnets.
- **Security Groups:** Enforced security ensuring minimal outside access (HTTP/HTTPS to ALB, port 3000 from ALB to tasks).
- **Zero-Downtime Deployment:** The ECS service is configured with a rolling update deployment strategy (`deployment_minimum_healthy_percent` = 50%, `deployment_maximum_percent` = 200%).

## CI/CD Pipeline

The `.github/workflows/pipeline.yml` pipeline runs on pushes and PRs to the `main` branch. It consists of three jobs:

1. **Test Job**: Installs dependencies and runs Jest tests ensuring application availability (`GET /health`).
2. **Build Job**: On a push to the `main` branch, it builds a new Docker footprint and pushes it to GitHub Container Registry (GHCR).
3. **Deploy Job**: After a successful build, it runs `terraform apply` targeting the newly built Docker tag. This task involves an `environment: production` which can be configured inside GitHub Repository environments to pause for **manual approval**.

### GitHub Secrets needed for CI/CD

To effectively use the CI/CD pipeline, ensure that you add the following GitHub Secrets to the repository:

- `AWS_ACCESS_KEY_ID`: Your AWS programmatic access ID.
- `AWS_SECRET_ACCESS_KEY`: Your AWS programmatic secret key.

*(Note: Provide `GITHUB_TOKEN` access with `packages: write` to allow GHCR push functionality).*

## Key Architectural Decisions

I made several intentional decisions focusing on enterprise readiness, security, and scalability:

### 1. Infrastructure (AWS + Terraform)
- **ECS with Fargate:** I chose Fargate because it is serverless, meaning there is zero underlying EC2 OS instance patching or scaling to manage.
- **Network Isolation:** I placed the Docker tasks strictly in Private Subnets. They are completely inaccessible from the outside internet except through the Application Load Balancer (ALB), ensuring a deeply defended network boundary.
- **Zero-Downtime Deployments:** I configured the ECS Service to utilize a rolling update strategy ensuring existing containers are not killed until new health-checked containers are actively receiving traffic.

### 2. CI/CD (GitHub Actions)
- **Immutable Artifacts using GHCR:** The pipeline builds the Docker image and tags it intimately with the unique `github.sha`. The subsequent Terraform plan natively references this exact SHA tag, ensuring no "latest" tag ambiguity and predictable, rollback-friendly deployments.
- **Environment Targeting Strategy:** I structured the Deploy job to map to a GitHub `production` environment, allowing leads to interject manual approval gates natively in GitHub before Terraform touches live AWS APIs.

### 3. Security
- **Least Privilege Execution:** I baked the Dockerfile such that the application execution natively switches to the `node` user instead of root. This entirely curbs container breakout attacks.
- **Dumb-init Injection:** Node.js does not handle Linux kernel signals natively as PID 1. I injected `dumb-init` to handle OS interrupts so containers gracefully spin down, guaranteeing connections aren't unexpectedly severed during ECS rolling updates.
- **Minimized Attack Surface:** The Docker build occurs via a multi-stage approach (`--omit=dev`). Development dependencies and local caching footprints never hit the final production image.

## Future Recommendations & Production Hardening

While I believe this scaffold provides a solid foundation, here are my architectural recommendations for scaling and surviving in a true enterprise production environment:

### 1. Unified Secrets Management
- **AWS Secrets Manager / Systems Manager (SSM) Parameter Store:** Currently, I pass environment variables directly in the task definition or rely on local `.env` strategies. In a true enterprise setup, integrating AWS Secrets Manager directly into the ECS Task Definition ensures that secrets (like `DATABASE_URL` or API keys) are securely decrypted and injected strictly at runtime.
- **Benefits:** Centralized secret rotation, IAM-based granular access control, and keeping sensitive configuration completely out of Terraform state and version control.

### 2. Leverage Managed Services
- **Amazon RDS for PostgreSQL:** Instead of running the database via a simple container or self-managing EC2 instances, I recommend utilizing Amazon RDS (or Aurora Serverless v2 PostgreSQL). This provides automated daily backups, point-in-time recovery, Multi-AZ high availability out of the box, and managed OS/engine patching.
- **Amazon ElastiCache (Redis):** If your Node.js application scales horizontally and requires caching, rate-limiting, or session management, I suggest offloading those requests to a managed ElastiCache instance to maintain perfectly stateless application containers.

### 3. Advanced CI/CD & Deployment Strategies
- **Blue/Green Deployments:** My current setup utilizes a standard ECS rolling update. I recommend moving to AWS CodeDeploy to allow for Blue/Green deployments, enabling traffic validation on a staging port/listener before safely cutting over 100% of production traffic instantly.
- **Infrastructure Security Checks:** I suggest integrating powerful tools like Checkov, `tfsec`, or TFLint within the GitHub Actions pipeline to scan the `.tf` files for infrastructure misconfigurations prior to running `terraform apply`.
- **DAST/SAST Scanners:** You should hook up analyzers like SonarQube, Trivy, or Snyk in standard CI/CD steps to proactively block vulnerable NPM dependencies and sniff out code smells.

### 4. Robust Observability & Monitoring
- **Application Performance Monitoring (APM):** I recommend adding AWS X-Ray, Datadog, or OpenTelemetry to instrument your Express application and capture deep end-to-end request tracing.
- **Metric Alarms & Alerting:** Formulate custom CloudWatch Alarms bundled with SNS to automatically alert your incident response team (e.g., via Slack or PagerDuty) on High CPU/Memory Exhaustion, or dangerous spikes in HTTP 5XX error codes at the Application Load Balancer level.

### 5. Advanced Infrastructure Hardening
- **AWS WAF (Web Application Firewall):** I highly advise shielding your Application Load Balancer with an attached WAF ACL to filter out malicious, automated bots and protect against deep OWASP Top 10 vulnerabilities (like SQLi and XSS payloads).
- **Terraform Remote State:** Currently, I handle the Terraform state locally. However, production environments should invariably declare a robust remote state backend utilizing **Amazon S3** (with versioning explicitly enabled) and a **DynamoDB** table for strict state locking. This effortlessly averts simultaneous state modifications and provides a durable, shared source-of-truth for multi-developer DevOps teams.
