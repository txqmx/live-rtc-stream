import { EventEmitter } from "events";
import { Device } from "mediasoup-client";
import { WebSocketTransport, Peer } from "protoo-client";

export default class Room extends EventEmitter {
  constructor() {
    super();

    this.peer = null;
    this.sendTransport = null;
    this.recvTransport = null;
  }

  // 加入房间
  join(userName) {
    console.warn("room.join()");
    const wsTransport = new WebSocketTransport(`wss://10.25.40.97:3000`);

    this.peer = new Peer(wsTransport);
    // 信令连接成功，触发open
    this.peer.on("open", this.onPeerOpen.bind(this, userName));
    this.peer.on("request", this.onPeerRequest.bind(this));
    this.peer.on("notification", this.onPeerNotification.bind(this));
    this.peer.on("failed", console.error);
    this.peer.on("disconnected", console.error);
    this.peer.on("close", console.error);
  }

  async sendAudio(track) {
    console.warn("room.sendAudio()");
    const audioProducer = await this.sendTransport.produce({
      track
    });
    audioProducer.on("trackended", async () => {
      console.warn("producer.close() by trackended");
      await this._closeProducer(audioProducer);
    });
    return audioProducer;
  }

  async sendVideo(track, type='user') {
    console.warn("room.sendVideo()");
    // 指示传输将音频或视频轨道发送到mediasoup路由器
    const videoProducer = await this.sendTransport.produce({
      track,
      appData: {
        type: type
      }
    });
    videoProducer.on("trackended", async () => {
      console.warn("producer.close() by trackended");
      await this._closeProducer(videoProducer);
    });
    return videoProducer;
  }

  async onPeerOpen(userName) {
    console.warn("room.peer:open");
    // 创建一个新设备
    const device = new Device();

    // 向服务端请求RTP参数，支持的编解码信息
    const routerRtpCapabilities = await this.peer
      .request("getRouterRtpCapabilities")
      .catch(console.error);
    console.log(routerRtpCapabilities);
    // 使用mediasoup路由器的RTP功能加载设备。这是设备了解允许的媒体编解码器和其他设置的方式
    await device.load({ routerRtpCapabilities });

    // 创建一个新的WebRTC传输以发送媒体
    await this._prepareSendTransport(device).catch(console.error);
    // 创建一个新的WebRTC传输以接收媒体
    await this._prepareRecvTransport(device).catch(console.error);

    const res = await this.peer.request("join", {
      // device.rtpCapabilities: 设备RTP功能，是通过组合基础WebRTC功能和路由器RTP功能生成的
      rtpCapabilities: device.rtpCapabilities,
      peerName: userName
    });

    this.emit("@open", res);
  }

  // 创建一个新的WebRTC传输以发送媒体
  async _prepareSendTransport(device) {
    const transportInfo = await this.peer
      .request("createWebRtcTransport", {
        producing: true,
        consuming: false
      })
      .catch(console.error);

    // transportInfo.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    // 创建一个新的WebRTC传输以发送媒体
    this.sendTransport = device.createSendTransport(transportInfo);

    // 在传输即将建立ICE + DTLS连接并且需要与关联的服务器端传输交换信息时发出
    this.sendTransport.on(
      "connect",
      ({ dtlsParameters }, callback, errback) => {
        console.warn("room.sendTransport:connect");
        this.peer
          .request("connectWebRtcTransport", {
            transportId: this.sendTransport.id,
            dtlsParameters
          })
          .then(callback)
          .catch(errback);
      }
    );
    // 在传输需要将有关新生产者的信息传输到关联的服务器端传输时发出。该事件在Produce()方法完成之前发生
    this.sendTransport.on(
      "produce",
      async ({ kind, rtpParameters, appData }, callback, errback) => {
        console.warn("room.sendTransport:produce");
        try {
          const { id } = await this.peer.request("produce", {
            transportId: this.sendTransport.id,
            kind,
            rtpParameters,
            appData
          });

          callback({ id });
        } catch (error) {
          errback(error);
        }
      }
    );
  }

  // 创建一个新的WebRTC传输以接收媒体
  async _prepareRecvTransport(device) {
    const transportInfo = await this.peer
      .request("createWebRtcTransport", {
        producing: false,
        consuming: true
      })
      .catch(console.error);

    // transportInfo.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    this.recvTransport = device.createRecvTransport(transportInfo);
    this.recvTransport.on(
      "connect",
      ({ dtlsParameters }, callback, errback) => {
        console.warn("room.recvTransport:connect");
        this.peer
          .request("connectWebRtcTransport", {
            transportId: this.recvTransport.id,
            dtlsParameters
          })
          .then(callback)
          .catch(errback);
      }
    );
  }

  async _closeProducer(producer) {
    producer.close();
    await this.peer
      .request("closeProducer", { producerId: producer.id })
      .catch(console.error);
    this.emit("@producerClosed", { producerId: producer.id });
  }

  onPeerRequest(req, resolve, reject) {
    console.warn("room.peer:request", req.method);
    switch (req.method) {
      // 新的消费者请求，拒绝将不会请求newConsumer
      case "newConsumerOffer": {
        // if (
        //   confirm(`Do you consume ${req.data.kind} from ${req.data.peerId}?`)
        // ) {
        resolve({ accept: true });
        //return;
        // }
        // resolve({ accept: false });
        break;
      }
      case "newConsumer": {
        // 指示传输从mediasoup路由器接收音频或视频轨道
        this.recvTransport
          .consume(req.data)
          .then(consumer => {
            this.emit("@consumer", consumer);
            resolve();
          })
          .catch(reject);
        break;
      }
      default:
        resolve();
    }
  }

  onPeerNotification(notification) {
    console.warn("room.peer:notification", notification);
    this.emit("@" + notification.method, notification.data);
  }

  // 开始录制
  async startRecord(){
    const res = await this.peer.request("startRecord");
    this.emit('@changeRecord', res)
  }

  // 停止录制
  async stopRecord(){
    const res = await this.peer.request("stopRecord");
    this.emit('@changeRecord', res)
  }

  // 视频上行流量监控
  streamSendMonitor(){
    if(this.sendTransport) {
      return this.sendTransport.getStats().then(res => {
        return res.get('RTCTransport_0_1') ? res.get('RTCTransport_0_1').bytesSent : 0
      })
    } else {
      return Promise.resolve(0)
    }
  }
  // 视频下行流量监控
  streamRecvMonitor(){
    if(this.recvTransport) {
      return this.recvTransport.getStats().then(res => {
        return res.get('RTCTransport_0_1') ? res.get('RTCTransport_0_1').bytesReceived : 0
      })
    } else {
      return Promise.resolve(0)
    }
  }
}
