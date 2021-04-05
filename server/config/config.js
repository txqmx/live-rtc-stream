module.exports = Object.freeze({
  worker: {
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  },
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        name: 'opus',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2
      },
      // {
      //   kind: 'video',
      //   name: 'VP8',
      //   mimeType: 'video/VP8',
      //   clockRate: 90000,
      //   parameters: {
      //     'x-google-start-bitrate': 1000
      //   }
      // },
      // {
      //   kind: 'video',
      //   name: 'VP9',
      //   mimeType: 'video/VP9',
      //   clockRate: 90000,
      //   parameters: {
      //     'x-google-start-bitrate': 1000
      //   }
      // },
      {
        kind: 'video',
        name: 'H264',
        mimeType: 'video/H264',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000
        }
      },
    ]
  },
  webRtcTransport: {
    listenIps: [ { ip: '0.0.0.0', announcedIp: '127.0.0.1' } ], // TODO: Change announcedIp to your external IP or domain name
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    maxIncomingBitrate: 1500000
  },
  plainRtpTransport: {
    listenIp: { ip: '0.0.0.0', announcedIp: '127.0.0.1' }, // TODO: Change announcedIp to your external IP or domain name
    rtcpMux: false,
    comedia: false
  }
})
