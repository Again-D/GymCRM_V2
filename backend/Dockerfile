FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

COPY gradle gradle
COPY gradlew gradlew
COPY gradlew.bat gradlew.bat
COPY build.gradle build.gradle
COPY settings.gradle settings.gradle

COPY src src

RUN chmod +x gradlew \
  && ./gradlew bootJar -x test --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /workspace/build/libs/*.jar /app/app.jar

EXPOSE 8080
ENV JAVA_OPTS=""

ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]
