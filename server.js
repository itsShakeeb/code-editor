const express = require("express");
const Docker = require("dockerode");

const app = express();
const docker = new Docker();

app.use(express.json());

app.post("/create-container", async (req, res) => {
  try {
    const container = await docker.createContainer({
      Image: "node:latest",
      Cmd: ["node", "-e", "console.log('Hello from the container')"],
      name: `nodejs-container-${Date.now()}`,
    });

    await container.start();

    res.status(200).json({
      message: "Container started successfully",
      containerId: container.id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating container",
      error: error.message,
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
