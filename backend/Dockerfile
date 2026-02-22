# ── Stage 1: Build ──────────────────────────────────────────────────────────
#FROM eclipse-temurin:21-jdk-alpine AS builder
#WORKDIR /app

# Cache dependencies first
COPY pom.xml .
#COPY mvnw .
#COPY .mvn .mvn
#RUN ./mvnw dependency:go-offline -q

# Build
#COPY src ./src
#RUN ./mvnw clean package -DskipTests -q

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app
COPY . .
RUN mvn clean package


# Security: non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy jar
COPY --from=builder /app/target/*.jar app.jar

# JVM tuning for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
