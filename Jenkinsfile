pipeline {
    agent any

    environment {
        // Automatically mapped via Jenkins Credentials Binding plugin
        MONGODB_URI = credentials('examassess-mongodb-uri')
        JWT_SECRET = credentials('examassess-jwt-secret')
        SMTP_PASS = credentials('examassess-smtp-pass')
        SMTP_USER = credentials('examassess-smtp-user')
        
        // Defaults
        NODE_ENV = 'production'
        PORT = '5000'
        COMPOSE_PROJECT_NAME = 'examassess'
        IMAGE_NAME = 'uniassess-app:latest'
        BACKUP_IMAGE_NAME = 'uniassess-app:previous'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Workspace Cleanup') {
            steps {
                script {
                    echo 'Cleaning Jenkins workspace to prevent stale builds...'
                    cleanWs()
                }
            }
        }

        stage('Checkout') {
            steps {
                script {
                    echo 'Checking out source code from SCM...'
                    checkout scm
                }
            }
        }

        stage('Environment Validation') {
            steps {
                script {
                    echo 'Validating required directories and environment variables...'
                    if (!env.MONGODB_URI || !env.JWT_SECRET) {
                        error('Pipeline failed: Critical environment variables (MONGODB_URI or JWT_SECRET) are missing. Check Jenkins Credentials.')
                    }

                    // Create required upload directories if they don't exist
                    sh 'mkdir -p backend/teacher-profiles'
                    sh 'mkdir -p backend/teacher-images'
                    
                    echo 'Environment validation successful.'
                }
            }
        }

        stage('Dependency Installation & Build') {
            steps {
                script {
                    echo 'Dependencies and build steps (npm ci, npm run build) are automatically managed within the isolated multi-stage Docker build.'
                    echo 'This guarantees a clean build environment without requiring Node.js to be installed on the Jenkins host.'
                }
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    echo 'Tagging current image as previous for rollback support...'
                    sh "docker tag ${IMAGE_NAME} ${BACKUP_IMAGE_NAME} || true"

                    echo 'Building latest Docker image...'
                    // Docker layer caching is utilized automatically by Docker daemon
                    sh 'docker compose build uniassess-app'
                }
            }
        }

        stage('Docker Deployment') {
            steps {
                script {
                    echo 'Deploying ExamAssess via Docker Compose...'
                    sh 'docker compose up -d --remove-orphans uniassess-app'
                }
            }
        }

        stage('Health Checks') {
            steps {
                script {
                    echo 'Waiting for ExamAssess containers to initialize (15 seconds)...'
                    sleep time: 15, unit: 'SECONDS'
                    
                    echo 'Verifying backend API health connectivity...'
                    // Check if container is running
                    def isRunning = sh(script: "docker ps -q -f name=uniassess-app", returnStdout: true).trim()
                    if (!isRunning) {
                        error('Health check failed: uniassess-app container is not running!')
                    }

                    // Check API port
                    def response = sh(script: 'curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health || echo "FAILED"', returnStdout: true).trim()
                    
                    if (response != '200') {
                        error("Health check failed: Application is not returning HTTP 200 on port 5000. (Response: ${response})")
                    } else {
                        echo "Health check passed! Application responded with HTTP 200."
                    }
                }
            }
        }
    }

    post {
        success {
            script {
                echo '✅ Deployment completed successfully! ExamAssess is live.'
            }
        }
        failure {
            script {
                echo '❌ Deployment failed. Initiating automated Rollback...'
                
                // Print failure logs
                echo '=== DOCKER LOGS ==='
                sh 'docker compose logs --tail=150 uniassess-app'
                
                // Rollback
                echo 'Rolling back to previous working deployment...'
                sh "docker tag ${BACKUP_IMAGE_NAME} ${IMAGE_NAME} || echo 'No previous image found for rollback.'"
                sh 'docker compose up -d --remove-orphans uniassess-app'
                
                echo 'Rollback complete. The application should be back online using the previous state.'
            }
        }
        always {
            script {
                echo 'Cleaning up dangling Docker images and unused build cache to optimize disk space...'
                // Remove dangling images, but DO NOT remove volumes
                sh 'docker image prune -f'
            }
        }
    }
}
