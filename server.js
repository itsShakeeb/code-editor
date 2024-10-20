const express = require("express");
const Docker = require("dockerode");

const app = express();

// const docker = new Docker({
//   host: "127.0.0.1", // or 'localhost'
//   port: 2375,
// });

app.use(express.json());

app.post("/create-container", async (req, res) => {
  console.log("request hit");

  try {
    const container = await docker.createContainer({
      Image: "node:latest",
      Cmd: [
        "sh", // to execute shell command
        "-c", // arguments to tell docker to treat as single command after that
        "npx create-react-app my-app && cd my-app && npm i && npm start",
      ],
      name: `react-app-${Date.now()}`,
      ExposedPorts: {
        "3000/tcp": {}, // React dev server runs on port 3000 by default
      },
      HostConfig: {
        PortBindings: {
          "3000/tcp": [
            {
              HostPort: "3000", // Bind container's port 3000 to host's port 3000
            },
          ],
        },
      },
    });

    await container.start();
    console.log("Container started:", container.id);

    const containerInfo = await container.inspect();
    const containerIP = containerInfo.NetworkSettings.IPAddress;

    console.log("React app running at:", `http://${containerIP}:3000`);

    res.status(200).json({
      message: "Container started successfully",
      containerId: container.id,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error creating container",
      error: err.message,
    });
  }
});

app.post("/stop-container", async (req, res) => {
  const { containerId } = req.body;

  try {
    const container = docker.getContainer(containerId);
    await container.stop();
    await container.remove();
    res.status(200).json({ message: "Container stopped and removed" });
  } catch (error) {
    res.status(500).json({
      message: "Error stopping/removing container",
      error: error.message,
    });
  }
});
app.get("/", (req, res) => {
  console.count("Request Received");
  res.send('Hello You"re getting response from server');
});

app.listen(8081, () => {
  console.log("Server is running on PORT 8081");
});

/**
 * fallback case code when node:latest image is not available locally
 * 
 * catch (err) {
    if (res.status === 500) {
      res.status(500).json({
        message: "Error creating container",
        error: err.message,
      });
    } else if (err.statusCode === 404) {
      console.log("Image not found locally, pulling from Docker Hub...");

      // Pull the image from Docker Hub
      await docker.pull("node:latest", (pullErr, stream) => {
        if (pullErr) {
          console.error("Error pulling the image:", pullErr);
          return;
        }

        // Listen for the 'end' event when the image has been pulled
        docker.modem.followProgress(stream, onFinished, onProgress);

        function onFinished(err, output) {
          if (err) {
            console.error("Error after pulling the image:", err);
            return;
          }

          console.log("Image pulled successfully. Creating container...");

          // After pulling the image, try to create the container again
          docker
            .createContainer({
              Image: "node:latest",
              Cmd: ["node", "-e", "console.log('Hello from the container')"],
              name: `nodejs-container-${Date.now()}`,
            })
            .then((container) => container.start())
            .then((container) =>
              console.log("Container started:", container)
            )
            .catch((err) =>
              console.error("Error creating container after pull:", err)
            );
        }

        function onProgress(event) {
          console.log("Progress:", event);
        }
      });
    } else {
      // Handle other errors
      console.error("Error creating container:", err);
      res.status(500).json({
        message: "Error creating container in else part",
        error: err.message,
      });
    }
  }
 */
