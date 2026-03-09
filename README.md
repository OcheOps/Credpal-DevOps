# Credpal DevOps Challenge - Node.js App & IaC

This project is a scaffold of a production-ready Node.js application, fully containerized, integrated with CI/CD through GitHub Actions, and equipped with Terraform-based AWS Infrastructure as Code (IaC).

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

## Infrastructure Overview

The infrastructure relies on Amazon Web Services (AWS) managed by Terraform (`/terraform`). It includes:

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

To effectively use the CI/CD pipeline, ensure the following GitHub Secrets are added to the repository:

- `AWS_ACCESS_KEY_ID`: Your AWS programmatic access ID.
- `AWS_SECRET_ACCESS_KEY`: Your AWS programmatic secret key.

*(Note: Provide `GITHUB_TOKEN` access with `packages: write` to allow GHCR push functionality).*

## Security Insights

- The Node app image executes via a non-root `node` user to prevent privilege escalation.
- Application logs are gracefully pumped to stdout/stderr, which are inherently harvested by AWS CloudWatch Logs.
- Passwords and access keys are kept out of source code by employing GitHub Secrets and `.env` references.
