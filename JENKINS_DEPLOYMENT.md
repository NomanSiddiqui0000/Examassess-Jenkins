# Jenkins Deployment Guide for Uniassess-v2

This guide outlines the steps to deploy the Uniassess-v2 application using Jenkins. The application is fully dockerized, containing both the backend and frontend, and can be orchestrated using Docker Compose.

## Prerequisites

Before starting, ensure that the Jenkins server has the following installed and configured:
1. **Docker**: Jenkins must be able to run Docker commands (the `jenkins` user should be in the `docker` group).
2. **Docker Compose**: Required for orchestrating the application container along with any environment variables.
3. **Git**: To pull the source code from the repository.
4. **Jenkins Plugins**: 
   - Git Plugin
   - Docker Pipeline Plugin (if using Pipeline)
   - Credentials Binding Plugin (for securely injecting environment variables)

## Deployment Options

You can deploy the application using either a **Jenkins Pipeline (Jenkinsfile)** or a **Freestyle Project**. We recommend using the Pipeline approach for better version control and maintainability.

### Option 1: Jenkins Pipeline (Recommended)

1. **Create a `Jenkinsfile`**: In the root of your repository, create a file named `Jenkinsfile` with the following content:

```groovy
pipeline {
    agent any
    
    environment {
        // Define environment variables or use Jenkins Credentials
        // Example of using credentials for sensitive data:
        // MONGODB_URI = credentials('mongodb-uri')
        // JWT_SECRET = credentials('jwt-secret')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    echo 'Building the Docker image...'
                    sh 'docker-compose build'
                }
            }
        }
        
        stage('Deploy Application') {
            steps {
                script {
                    echo 'Deploying application using Docker Compose...'
                    // It is recommended to use an .env file on the server or inject variables directly
                    sh 'docker-compose up -d --remove-orphans'
                }
            }
        }
    }
    
    post {
        always {
            // Optional: Clean up workspace or untagged images
            sh 'docker image prune -f'
        }
    }
}
```

2. **Configure Jenkins**:
   - Go to Jenkins Dashboard -> **New Item**.
   - Enter a name (e.g., `Uniassess-Pipeline`), select **Pipeline**, and click **OK**.
   - Under the **Pipeline** section, choose **Pipeline script from SCM**.
   - Select **Git** and enter your repository URL.
   - Set the Script Path to `Jenkinsfile`.
   - Click **Save** and then **Build Now**.

### Option 2: Freestyle Project

If you prefer a simpler setup without a Jenkinsfile:

1. Go to Jenkins Dashboard -> **New Item**.
2. Enter a name (e.g., `Uniassess-Freestyle`), select **Freestyle project**, and click **OK**.
3. **Source Code Management**: Select **Git** and provide your repository URL.
4. **Build Environment**: Use **Use secret text(s) or file(s)** to securely pass your environment variables (like `MONGODB_URI`, `JWT_SECRET`, etc.) to the build.
5. **Build Steps**: Add an **Execute shell** step with the following commands:

```bash
# Build the Docker image
docker-compose build

# Deploy the container in detached mode
docker-compose up -d --remove-orphans

# Optional: Clean up dangling images to free up space
docker image prune -f
```

6. Click **Save** and then **Build Now**.

## Environment Variables Configuration

The application requires several environment variables to run successfully (as defined in `docker-compose.yml`). You must configure these variables securely in Jenkins:

1. Navigate to **Manage Jenkins** -> **Manage Credentials**.
2. Add your secrets (e.g., `MONGODB_URI`, `JWT_SECRET`, `SMTP_PASS`).
3. During the deployment, either:
   - Create a `.env` file dynamically during the build process containing these secrets.
   - Or map them directly in the pipeline/freestyle project so that `docker-compose up` can read them from the environment.

Example of generating an `.env` file in the pipeline shell step before `docker-compose up`:
```bash
cat <<EOF > .env
NODE_ENV=production
PORT=5000
MONGODB_URI=${MONGODB_URI}
JWT_SECRET=${JWT_SECRET}
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
FRONTEND_URL=${FRONTEND_URL}
EOF
```

## Health Check and Verification

After a successful deployment, the application should be running on the configured server port (default `5000` mapped to host port `5000`).
- You can verify the container status by running: `docker ps | grep uniassess-app`
- Check logs for any startup errors: `docker logs uniassess-app`
- Visit `http://<your-server-ip>:5000` to verify the application is live.
