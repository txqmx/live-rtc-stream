const fs = require("fs");

module.exports = {
  devServer: {
    https: {
      key: fs.readFileSync("./certs/privkey.pem"),
      cert: fs.readFileSync("./certs/fullchain.pem")
    },
    disableHostCheck: true,
    host: '0.0.0.0',
    // port: 8080,
  }
};
