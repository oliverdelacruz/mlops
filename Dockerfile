# syntax=docker/dockerfile:1

# Set base image
FROM tiangolo/meinheld-gunicorn-flask:python3.8

# Set working directory
# WORKDIR /app

# By default, listen on port 8080
EXPOSE 8080
ENV LISTEN_PORT 8080

# Install common dependecies and libraries
RUN apt-get update -y && apt-get -y install --no-install-recommends default-jdk
RUN rm -rf /var/lib/apt/lists/*

# Install python dependecies and libraries
RUN pip --no-cache-dir install Flask pandas numpy scipy scikit-learn

# Set additional python configuration
ENV PYTHONUNBUFFERED=TRUE
ENV PYTHONDONTWRITEBYTECODE=TRUE

# Copy files
COPY ./app /app
EXPOSE 8080
