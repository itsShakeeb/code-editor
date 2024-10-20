const express = require("express");
const crypto = require("crypto");
const Docker = require("dockerode");
const getPort = require("get-port");

const router = express.Router();

const docker = new Docker();

async function createContainer(req, res) {
  try {
    // Generate a unique name for each container (using uuid or Date)
    const containerName = `nodejs-container-${crypto.randomUUID()}`; // Unique container name

    // const randomPort = 3001
    const randomPort = (await getPort()).toString();

    const container = await docker.createContainer({
      Image: "node:latest",
      Cmd: [
        "sh", // to execute shell command
        "-c", // arguments to tell docker to treat as single command after that
        "npx create-react-app my-app && cd my-app && npm i && npm start -- --host 0.0.0.0 --port " + randomPort,
      ],
      name: containerName,
      ExposedPorts: {
        [`${randomPort}/tcp`]: {}, // React dev server runs on port 3000 by default
      },
      HostConfig: {
        PortBindings: {
          [`${randomPort}/tcp`]: [{ HostPort: randomPort }], // Bind random host port to container's port 3000
        },
      },
    });

    // Start the container
    await container.start();
    console.log("Container started:", container.id);

    const containerInfo = await container.inspect();
    const containerIP = containerInfo.NetworkSettings.IPAddress;

    return res.status(200).json({
      message: "Container started successfully!",
      containerId: container.id,
      containerName: containerName,
      exposedPort: randomPort,
      appRunning: `http://${containerIP}:${randomPort}`,
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
  docker.pull("node:latest", (pullErr, stream) => {
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
      createContainer(res); // Retry container creation after pulling the image
    }

    function onProgress(event) {
      console.log("Progress:", event);
    }
  });
}

router.post("/create-container", createContainer);

module.exports = router;
