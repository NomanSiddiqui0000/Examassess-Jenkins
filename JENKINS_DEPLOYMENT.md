# Jenkins CI/CD Pipeline Integration for ExamAssess

This repository is fully configured for a complete, zero-downtime automated Jenkins CI/CD pipeline. The pipeline automatically detects builds, securely injects environment variables, preserves all persistent user data (uploads, profile images, and database), performs health checks, and supports automated rollbacks.

## 1. Jenkins Architecture Overview

The pipeline executes the following stages automatically upon every GitHub push:
1. **Workspace Cleanup**: Cleans stale builds to prevent cache conflicts.
2. **Checkout**: Pulls the latest code from GitHub.
3. **Environment Validation**: Validates required secrets and ensures local upload directories (`teacher-profiles`, `teacher-images`) exist.
4. **Dependency & Build**: Leverages the multi-stage `Dockerfile` (automatically running `npm ci` and `npm run build`) in an isolated environment without needing Node.js installed on Jenkins.
5. **Docker Build**: Tags the previous image for rollback, utilizes layer caching, and builds the new `uniassess-app:latest` image.
6. **Docker Deployment**: Recreates the container using `docker-compose up -d --remove-orphans`. Persistent volumes mapped in `docker-compose.yml` protect user uploads.
7. **Health Checks**: Monitors API health on port 5000. Fails the pipeline if the app fails to start.
8. **Rollback (On Failure)**: If the health check fails, the pipeline automatically halts, prints logs, restores the previous working image tag, and restarts the container to keep the application online.
9. **Cleanup**: Deletes dangling un-tagged images to save disk space.

## 2. Jenkins Required Credentials

Before running the pipeline, you **MUST** configure the following credentials in your Jenkins server.
Go to **Manage Jenkins -> Credentials -> System -> Global credentials -> Add Credentials**.

Create each as a **Secret text**:

| Credential ID | Description |
| :--- | :--- |
| `examassess-mongodb-uri` | The MongoDB connection string (e.g., `mongodb+srv://user:pass@cluster...`) |
| `examassess-jwt-secret` | The strong JWT secret used for authentication |
| `examassess-smtp-user` | The SMTP user/email for Brevo |
| `examassess-smtp-pass` | The SMTP password for Brevo |

*Note: The pipeline uses the Credentials Binding Plugin to inject these dynamically. They are never hardcoded.*

## 3. Jenkins Pipeline Setup

To set up the project in Jenkins:

1. Go to Jenkins Dashboard -> **New Item**.
2. Enter a name (e.g., `ExamAssess-Production`), select **Pipeline**, and click **OK**.
3. Under the **General** tab, check **GitHub project** and paste the GitHub repository URL.
4. Under **Build Triggers**, check **GitHub hook trigger for GITScm polling**.
5. Under the **Pipeline** section, choose **Pipeline script from SCM**.
6. Select **Git** and enter your repository URL.
7. Ensure the branch specifier is correct (e.g., `*/main` or `*/master`).
8. Set the Script Path to `Jenkinsfile`.
9. Click **Save**.

## 4. GitHub Webhook Integration (Automatic Deployment)

To trigger the pipeline automatically whenever code is pushed:

1. Go to your repository on GitHub -> **Settings** -> **Webhooks**.
2. Click **Add webhook**.
3. Set the **Payload URL** to your Jenkins server webhook endpoint: `http://<your-jenkins-ip>:<port>/github-webhook/` *(Ensure the trailing slash is included!)*
4. Set **Content type** to `application/json`.
5. Choose **Just the push event**.
6. Click **Add webhook**.

*Your Jenkins server must have the [GitHub Integration Plugin](https://plugins.jenkins.io/github/) installed.*

## 5. Persistent Data & Volumes

The `docker-compose.yml` has been updated to mount local persistent volumes. 
The following data is preserved across all automated Jenkins deployments, meaning container restarts or rebuilds will **never** delete user data:
- `backend/teacher-profiles/`
- `backend/teacher-images/`

These folders are also correctly listed in the `.dockerignore` file, preventing the Docker build context from ballooning in size or overwriting local persistent mounts.

## 6. Local Testing of Docker Architecture

If you want to validate the Docker setup locally outside of Jenkins, you can build and run using:
```bash
# Provide environment variables
export MONGODB_URI="..."
export JWT_SECRET="..."
export SMTP_USER="..."
export SMTP_PASS="..."

# Build and deploy locally
docker-compose up -d --build
```
