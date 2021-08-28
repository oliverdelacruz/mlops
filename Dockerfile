# syntax=docker/dockerfile:1

FROM python:3.8-slim-buster

# Set a docker label to advertise multi-model support on the container
LABEL com.amazonaws.sagemaker.capabilities.multi-models=false

# Set a docker label to enable container to use SAGEMAKER_BIND_TO_PORT environment variable if present
LABEL com.amazonaws.sagemaker.capabilities.accept-bind-to-port=true

# Set working directory
WORKDIR /app

# By default, listen on port 8080
EXPOSE 8080/tcp

# Install common dependecies and libraries
RUN apt-get update -y && apt-get -y install --no-install-recommends default-jdk
RUN rm -rf /var/lib/apt/lists/*

# Install python dependecies and libraries
RUN pip --no-cache-dir install Flask pandas numpy scipy scikit-learn

# Set additional python configuration
ENV PYTHONUNBUFFERED=TRUE
ENV PYTHONDONTWRITEBYTECODE=TRUE

# Copy files
COPY ecs/* ./

# Run flask
CMD [ "python", "-m" , "flask", "run", "--host=0.0.0.0", "--port=8080"]