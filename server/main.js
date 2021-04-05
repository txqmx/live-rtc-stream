const fs = require("fs");
const https = require("https");
const { WebSocketServer } = require("protoo-server");
const mediasoup = require("mediasoup");
const ConfRoom = require("./lib/Room");
const config = require('./config/config');


(async () => {
  const worker = await mediasoup.createWorker(config.worker);

  worker.on("died", () => {
    console.log("mediasoup Worker died, exit..");
    process.exit(1);
  });

  const router = await worker.createRouter(config.router);
  const room = new ConfRoom(router);

  let key = "./certs/privkey.pem";
  let certificate = "./certs/fullchain.pem";

  const options = {
    rejectUnauthorized: false,
    key: fs.readFileSync(key),
    cert: fs.readFileSync(certificate),
  };

  const httpsServer = https.createServer(options);
  await new Promise((resolve) => {
    httpsServer.listen(3000, "0.0.0.0", resolve);
  });

  const wsServer = new WebSocketServer(httpsServer);
  wsServer.on("connectionrequest", (info, accept) => {
    console.log(
      "protoo connection request [peerId:%s, address:%s, origin:%s]",
      info.socket.remoteAddress,
      info.origin
    );
    room.handlePeerConnect({
      // to be more and more strict
      peerId: `p${String(Math.random()).slice(2)}`,
      protooWebSocketTransport: accept(),
    });
  });

  console.log("websocket server started on https://10.25.41.86:3000");
  setInterval(async () => console.log("room stat", await room.getStatus()), 1000 * 5);
})();
