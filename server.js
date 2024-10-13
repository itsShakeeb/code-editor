const express = require("express");

const app = express();

app.get("/", (req, res) => {
  console.count("Request Received");
  res.send('Hello You"re getting response from server');
});

app.listen(8081, () => {
  console.log("Server is running on PORT 8081");
});
