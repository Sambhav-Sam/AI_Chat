FROM node:16-alpine

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port the app will run on
EXPOSE 5000

# Command to run the application
CMD ["node", "server.js"] 