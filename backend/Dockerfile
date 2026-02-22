# ===== Build stage =====
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# ===== Runtime stage =====
FROM eclipse-temurin:17
WORKDIR /app

# 1. Fix Security: Use Debian/Ubuntu syntax for non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# 2. Copy the jar ONCE and set ownership to the new user
COPY --from=builder /app/target/*.jar app.jar
RUN chown appuser:appgroup app.jar

# 3. Set the user BEFORE running the app
USER appuser

# 4. JVM tuning for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/actuator/health | grep -q '"status":"UP"' || exit 1

# 5. Entrypoint (The single source of truth for starting the app)
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
