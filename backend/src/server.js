const dns = require("dns");
require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/database");


dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"])

const PORT = process.env.PORT || 5000;
connectDB();

app.listen(PORT, () => {
  console.log(`DevTrack server running on port ${PORT}`);
});