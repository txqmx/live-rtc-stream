const { Room } = require("protoo-server");
const FFmpeg = require('./ffmpeg');
const config = require('../config/config');

class ConfRoom {
  constructor(mediasoupRouter) {
    this._protooRoom = new Room();
    this._mediasoupRouter = mediasoupRouter;
  }

  getStatus() {
    const _transports = this._mediasoupRouter._transports;

    const transportDetails = [];
    for (const t of _transports.values()) {
      const item = {};
      if (t.appData.producing) {
        item.producer = t._producers.size;
      }
      if (t.appData.consuming) {
        item.consumer = t._consumers.size;
      }
      transportDetails.push(item);
    }

    return {
      peer: this._protooRoom.peers.length,
      transport: _transports.size,
      transports: transportDetails
    };
  }

  // 建立连接
  handlePeerConnect({ peerId, protooWebSocketTransport }) {
    const existingPeer = this._protooRoom.getPeer(peerId);
    if (existingPeer) {
      console.log(
        "handleProtooConnection() | there is already a protoo Peer with same peerId, closing it [peerId:%s]",
        peerId
      );
      existingPeer.close();
    }

    let peer;
    try {
      peer = this._protooRoom.createPeer(peerId, protooWebSocketTransport);
    } catch (error) {
      console.error("protooRoom.createPeer() failed:%o", error);
      return;
    }
    // Have mediasoup related maps ready even before the Peer joins since we
    // allow creating Transports before joining.
    peer.data.transports = new Map();
    peer.data.producers = new Map();
    peer.data.consumers = new Map();

    peer.on("request", (request, accept, reject) => {
      this._handleProtooRequest(peer, request, accept, reject).catch(error => {
        console.error("request failed:%o", error);
        reject(error);
      });
    });

    peer.on("close", () => {
      console.log('protoo Peer "close" event [peerId:%s]', peer.id);

      // If the Peer was joined, notify all Peers.
      if (peer.data.joined) {
        for (const otherPeer of this._getJoinedPeers({ excludePeer: peer })) {
          otherPeer
            .notify("peerClosed", { peerId: peer.id, peerName: peer.data.peerName })
            .catch(console.error);
        }
      }

      for (const transport of peer.data.transports.values()) {
        transport.close();
      }

      if (this._protooRoom.peers.length === 0) {
        console.log("last Peer in the room left");
      }
    });
  }

  // 信令交互请求统一处理
  async _handleProtooRequest(peer, request, accept, reject) {
    console.log(`request:${request.method}`);
    switch (request.method) {
      // 请求RTP参数，支持的编解码信息
      case "getRouterRtpCapabilities": {
        // rtpCapabilities: 具有路由器RTP功能的对象。Mediasoup客户端通常需要这些功能来计算其发送RTP参数
        accept(this._mediasoupRouter.rtpCapabilities);
        break;
      }

      // 请求加入房间
      case "join": {
        if (peer.data.joined) throw new Error("Peer already joined");

        const { rtpCapabilities, peerName } = request.data;

        if (typeof rtpCapabilities !== "object")
          throw new TypeError("missing rtpCapabilities");

        // Store client data into the protoo Peer data object.
        peer.data.rtpCapabilities = rtpCapabilities;
        peer.data.peerName = peerName

        // 告诉新的Peer有关已加入Peers的信息。
        // 并为现有生产者创建消费者。
        const peers = [];
        for (const otherPeer of this._getJoinedPeers()) {
          peers.push({ peerId: otherPeer.id, peerName: otherPeer.data.peerName });

          for (const producer of otherPeer.data.producers.values()) {
            this._createConsumer({
              consumerPeer: peer,
              producerPeer: otherPeer,
              producer
            });
          }
        }

        accept({ peers });

        // Mark the new Peer as joined.
        peer.data.joined = true;

        // 通知其他所有对等方
        for (const otherPeer of this._getJoinedPeers({ excludePeer: peer })) {
          otherPeer
            .notify("peerJoined", { peerId: peer.id, peerName: peer.data.peerName })
            .catch(console.error);
        }

        break;
      }

      case "createWebRtcTransport": {
        const { producing, consuming } = request.data;

        // 创建一个新的WebRTC传输
        const transport = await this._mediasoupRouter.createWebRtcTransport({
          ...config.webRtcTransport,
          appData: { producing, consuming }
        });

        // Store the WebRtcTransport into the protoo Peer data Object.
        peer.data.transports.set(transport.id, transport);

        accept({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters
        });

        break;
      }

      case "connectWebRtcTransport": {
        const { transportId, dtlsParameters } = request.data;
        const transport = peer.data.transports.get(transportId);

        if (!transport)
          throw new Error(`transport with id "${transportId}" not found`);

        // 为传输提供远程端点的传输参数。每个传输类在此方法中都需要特定的参数。检查其中connect()每个方法
        await transport.connect({ dtlsParameters });
        accept();

        break;
      }

      case "produce": {
        if (!peer.data.joined) throw new Error("Peer not yet joined");

        const { transportId, kind, rtpParameters } = request.data;
        let { appData } = request.data;
        const transport = peer.data.transports.get(transportId);
        // console.log(await transport.getStats());

        if (!transport)
          throw new Error(`transport with id "${transportId}" not found`);

        if (!transport.appData.producing) {
          console.error(
            "_createConsumer() | WebRtcTransport for consuming not found"
          );
          return;
        }

        // Add peerId into appData to later get the associated Peer.
        appData = Object.assign({ peerId: peer.id }, appData);

        // 指示路由器接收音频或视频RTP（或SRTP，具体取决于传输类别）。这是将媒体注入mediasoup的方法。
        const producer = await transport.produce({
          kind,
          rtpParameters,
          appData
        });
        // Store the Producer into the protoo Peer data Object.
        peer.data.producers.set(producer.id, producer);

        accept({ id: producer.id });

        // 优化：为每个对等方创建一个服务器端使用者。
        for (const otherPeer of this._getJoinedPeers({ excludePeer: peer })) {
          this._createConsumer({
            consumerPeer: otherPeer,
            producerPeer: peer,
            producer
          });
        }

        break;
      }

      case "closeProducer": {
        if (!peer.data.joined) throw new Error("Peer not yet joined");

        const { producerId } = request.data;
        const producer = peer.data.producers.get(producerId);

        if (!producer)
          throw new Error(`producer with id "${producerId}" not found`);

        producer.close();

        peer.data.producers.delete(producer.id);
        accept();

        break;
      }

      case 'pauseProducer':
			{
        console.log('pauseProducer')
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { producerId } = request.data;
				const producer = peer.data.producers.get(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				await producer.pause();

				accept();

				break;
			}

      case 'resumeProducer':
			{
        console.log('resumeProducer')
				// Ensure the Peer is joined.
				if (!peer.data.joined)
					throw new Error('Peer not yet joined');

				const { producerId } = request.data;
				const producer = peer.data.producers.get(producerId);

				if (!producer)
					throw new Error(`producer with id "${producerId}" not found`);

				await producer.resume();

				accept();

				break;
			}

      case 'startRecord':
      {
        console.log('startRecord')
        await this._startRecord(peer)
        accept('start');
        break;
      }

      case 'stopRecord':
      {
        console.log('stopRecord')
        if (!peer) {
          throw new Error(`Peer with id  was not found`);
        }

        if (!peer.process) {
          throw new Error(`Peer with id  is not recording`);
        }

        peer.process.kill();
        peer.process = undefined;
        accept('stop');

        break;
      }

      default: {
        console.log('unknown request.method "%s"', request.method);
        reject(500, `unknown request.method "${request.method}"`);
      }
    }
  }

  // 获取房间内的所有peer
  _getJoinedPeers({ excludePeer } = { excludePeer: null }) {
    return this._protooRoom.peers.filter(
      peer => peer.data.joined && peer !== excludePeer
    );
  }

  // 创建消费者，每增加一个生产者就要为其他peer增加一个消费者
  async _createConsumer({ consumerPeer, producerPeer, producer }) {
    if (
      !this._mediasoupRouter.canConsume({
        producerId: producer.id,
        rtpCapabilities: consumerPeer.data.rtpCapabilities
      })
    ) {
      console.error("_createConsumer() | can not consume!");
      return;
    }

    const transport = Array.from(consumerPeer.data.transports.values()).find(
      t => t.appData.consuming
    );
    if (!transport) {
      console.error(
        "_createConsumer() | WebRtcTransport for consuming not found"
      );
      return;
    }

    const { accept } = await consumerPeer.request("newConsumerOffer", {
      peerId: producerPeer.id,
      kind: producer.kind
    });

    if (!accept) {
      console.log("consume canceled");
      return;
    }

    let consumer;
    try {
      // 指示路由器发送音频或视频RTP（或SRTP，具体取决于传输类别）。这是从mediasoup中提取媒体的方法
      consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: consumerPeer.data.rtpCapabilities,
        // consume with paused to avoid from missing keyframe
        paused: producer.kind === "video"
      });
    } catch (error) {
      console.error("_createConsumer() | transport.consume():%o", error);
      return;
    }

    consumerPeer.data.consumers.set(consumer.id, consumer);

    // Set Consumer events.
    consumer.on("transportclose", () => {
      // Remove from its map.
      consumerPeer.data.consumers.delete(consumer.id);
    });

    consumer.on("producerclose", () => {
      // Remove from its map.
      consumerPeer.data.consumers.delete(consumer.id);
      consumerPeer
        .notify("consumerClosed", { consumerId: consumer.id, producer: producer })
        .catch(console.error);
    });

    // Send a protoo request to the remote Peer with Consumer parameters.
    await consumerPeer
      .request("newConsumer", {
        peerId: producerPeer.id,
        producerId: producer.id,
        id: consumer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        appData: producer.appData,
        producerPaused: consumer.producerPaused
      })
      .then(() => {
        // Resume it when accepted
        // 恢复使用者（RTP再次发送到使用者端点）
        if (producer.kind === "video") consumer.resume();
      })
      .catch(error => {
        console.error("_createConsumer() | failed:%o", error);
      });
  }

  // 开始录制
  async _startRecord(peer){
    let recordInfo = {};
    for (const producer of peer.data.producers.values()) {
      if(producer._appData.type === 'window'){
        recordInfo[producer._data.kind] = await this._publishProducerRtpStream(peer, producer);
      }
    }

    recordInfo.fileName = Date.now().toString();

    peer.process = new FFmpeg(recordInfo)

    setTimeout(async () => {
      for (const consumer of peer.data.consumers.values()) {
        // 有时，使用者可以在GStreamer进程完全启动之前恢复工作
        // so wait a couple of seconds
        await consumer.resume();
      }
    }, 1000);
  }
  async _publishProducerRtpStream(peer, producer, ffmpegRtpCapabilities) {
    console.log('publishProducerRtpStream()');

    const rtpTransport = await this._mediasoupRouter.createPlainRtpTransport(config.plainRtpTransport);

    // Connect the mediasoup RTP transport to the ports used by GStreamer
    await rtpTransport.connect({
      ip: '127.0.0.1',
      port: 8098,
      rtcpPort: 8099
    });
    peer.data.transports.set(rtpTransport.id, rtpTransport);

    const codecs = [];
    // 传递给RTP使用者的编解码器必须与Mediasoup路由器rtpCapabilities中的编解码器匹配
    const routerCodec = this._mediasoupRouter.rtpCapabilities.codecs.find(
      codec => codec.kind === producer.kind
    );
    codecs.push(routerCodec);

    const rtpCapabilities = {
      codecs,
      rtcpFeedback: []
    };

    // Start the consumer paused
    // Once the gstreamer process is ready to consume resume and send a keyframe
    const rtpConsumer = await rtpTransport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: true
    })

    peer.data.consumers.set(rtpConsumer.id, rtpConsumer);

    return {
      remoteRtpPort: 8098,
      remoteRtcpPort: 8099,
      localRtcpPort: rtpTransport.rtcpTuple ? rtpTransport.rtcpTuple.localPort : undefined,
      rtpCapabilities,
      rtpParameters: rtpConsumer.rtpParameters
    };
  }
}

module.exports = ConfRoom;
