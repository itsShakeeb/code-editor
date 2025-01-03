const express = require("express");
const crypto = require("crypto");
const Docker = require("dockerode");
const getPort = require("get-port");

const router = express.Router();

const docker = new Docker();
const nodeImage = "node:alpine";

async function createContainer(req, res) {
  try {
    // Generate a unique name for each container (using uuid or Date)
    const containerName = `nodejs-container-${crypto.randomUUID()}`; // Unique container name
    // const appName = `react-app-${crypto.randomUUID()}`; //Unique react app name

    // const randomPort = 3001
    const randomPort = await getPort();
    const port = randomPort.toString();

    const container = await docker.createContainer({
      Image: nodeImage,
      Cmd: [
        "sh", // to execute shell command
        "-c", // arguments to tell docker to treat as single command after that
        // `npx create-react-app ${appName} && cd ${appName} && npm i && npm start -- --host 0.0.0.0 --port ${port}`,
        // `npm install -g npm@9.8.1 && npm install -g create-react-app && create-react-app my-app && cd my-app && npm i && npm start -- --host 0.0.0.0 --port 3000`,
        `npm install -g npm@9.8.1 && npm create vite@latest my-vite-react-app -- --template react && cd my-vite-react-app && npm i && npm run dev -- --host 0.0.0.0 --port 3000`,
      ],
      name: containerName,
      ExposedPorts: {
        "3000/tcp": {}, // React dev server runs on port port by default
      },
      HostConfig: {
        PortBindings: {
          "3000/tcp": [{ HostPort: port }], // Bind random host port to container's port 3000
        },
        RestartPolicy: {
          Name: "always", // Restart the container if it crashes
        },
      },
    });

    // Start the container
    await container.start();

    return res.status(200).json({
      message: "Container started successfully!",
      containerId: container.id,
      containerName: containerName,
      exposedPort: randomPort,
    });
  } catch (err) {
    if (err.statusCode === 404) {
      console.log("Image not found locally, pulling from Docker Hub...");
      await pullImageAndCreateContainer(res); // Pull image and retry
    } else {
      console.error("Error creating container:", err);
      return res.status(500).json({ error: err.message });
    }
  }
}

async function pullImageAndCreateContainer(res) {
  docker.pull(nodeImage, (pullErr, stream) => {
    console.log("Node.js image pulling");
    if (pullErr) {
      console.error("Error pulling the image:", pullErr);
      return res
        .status(500)
        .json({ error: "Failed to pull image from Docker Hub" });
    }

    docker.modem.followProgress(stream, onFinished, onProgress);

    function onFinished(err) {
      if (err) {
        console.error("Error after pulling the image:", err);
        return res.status(500).json({ error: "Failed after pulling image" });
      }

      console.log("Image pulled successfully. Creating container...");
      createContainer(null, res); // Retry container creation after pulling the image
    }

    function onProgress(event) {
      console.log("Progress:", event);
    }
  });
}

router.post("/create-container", createContainer);

module.exports = router;

// Ports
// 0.0.0.0:18415->3000/tcp, :::18415->3000/tcp
