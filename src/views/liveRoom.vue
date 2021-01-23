<template>
  <el-container class="live-room">
    <el-header class="live-room-header">
      <div class="back" @click="leaveRoom">
        <i class="el-icon-back"></i>
      </div>
      {{roomId}}
    </el-header>
    <el-container>
      <el-main>Main</el-main>
      <el-aside class="live-room-aside" width="260px">
        <div class="video-content">
          <div class="video-model">
            {{userName}}
          </div>
          <video id="localvideo" autoplay playsinline></video>
        </div>
        <div class="video-content">
          <div class="video-model">
            {{remoteUser}}
            <el-button v-if="otherState === 'mediaReady'" @click="call" size="mini">呼叫</el-button>
          </div>
          <video id="remotevideo" autoplay playsinline></video>
        </div>
      </el-aside>
    </el-container>
  </el-container>
</template>

<script>
function handleError(err) {
  console.error('Failed to get Media Stream!', err);
}
export default {
  name: 'liveRoom',
  data() {
    return {
      roomId: this.$route.query.roomId,
      userName: this.$route.query.name,
      localStream: '',
      localVideo: '',
      remoteVideo: '',
      remoteUser: '',
      mediaDevices: {
        video: {
          width: 260,
          height: 195,
          frameRate: 18,
        },
        audio: false,
      },
      pc: '',
      state: 'joined_conn',
      otherState: ''
    }
  },
  created() {
    this.initListen()
  },
  mounted() {
    this.localVideo = document.querySelector('#localvideo');
    this.remoteVideo = document.querySelector('#remotevideo');
    this.getUserMedia(this.mediaDevices)
  },
  methods: {
    // 初始化监听
    initListen(){
      this.$socket.on('leaved', (roomId) => {
        this.$router.replace({name: 'login'})
      })
      this.$socket.on('otherJoin', (userName) => {
        this.otherState = 'joined'
        this.remoteUser = userName
        this.$notify.info(`${userName}加入房间`)
      })
      this.$socket.on('otherLeave', (userName) => {
        this.otherState = 'leaved'
        this.remoteUser = ''
        this.remoteVideo.srcObject = null
        this.$notify.info(`${userName}离开房间`)
      })
      // 媒体准备好
      this.$socket.on('otherMediaReady', (userName) => {
        this.otherState = 'mediaReady'
      })

      this.$socket.on('message', (roomId, data) => {
        console.log('receive client message:', roomId, data);
        // 媒体协商
        if(data){
          if(data.type === 'offer'){
            console.log(this.pc);
            this.pc.setRemoteDescription(new RTCSessionDescription(data))
            this.pc.createAnswer().then(this.getAnswer)
          }else if(data.type === 'answer'){
            this.pc.setRemoteDescription(new RTCSessionDescription(data))
          }else if(data.type === 'candidate'){
            let candidate = new RTCIceCandidate(data.candidate)
            this.pc.addIceCandidate(candidate)
          }else{
            console.error('this message is invalid')
          }
        }
      })
    },
    // 离开房间
    leaveRoom(){
      this.$socket.emit('leave', this.roomId, this.userName);
      this.closePeerConnection()
      this.closeLocalMedia()
    },
    // 获取本地视频
    getUserMedia(mediaDevices) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.$message.error('the getUserMedia is not supported');
      } else {
        navigator.mediaDevices.getUserMedia(mediaDevices).then((stream) => {
          this.localVideo.srcObject = stream;
          this.localStream = stream;
          this.createPeerConnection()
        }).catch(handleError);
      }
    },
    // 关闭媒体视频
    closeLocalMedia(){
      if(this.localStream && this.localStream.getTracks()){
        this.localStream.getTracks().forEach(track => {
          track.stop()
        })
      }
      this.localStream = null
    },
    createPeerConnection(){
      console.log('创建 RTCPeerConnection');
        let pcConfig = {
          iceServers:[
            {urls: 'stun:stun.l.google.com:19302'},
            {
              urls: 'turn:82.156.100.6:3478',
              credential: 'liusinan',
              username: 'liusinan'
            }
            ]
        };
        this.pc = new RTCPeerConnection(pcConfig)

        // 监听ICE候选信息 如果收集到，就发送给对方
        this.pc.onicecandidate = e => {
          if(e.candidate){
            console.log('find an new candidate');
            this.sendMessage(this.roomId, {
              type: 'candidate',
              candidate: e.candidate
            })
          }
        }
        this.pc.ontrack = e => {
          this.remoteVideo.srcObject = e.streams[0];
        }
      // 添加本地流
      if(this.localStream){
        this.localStream.getTracks().forEach(track => {
          this.pc.addTrack(track, this.localStream)
        })
      }
      this.$socket.emit('mediaReady', this.roomId);
    },
    call(){
      if (this.pc) {
        let options = {
          // offerToReceiveAudio: 1,
          offerToReceiveVideo: 1
        }
        this.pc.createOffer(options).then(this.getOffer)
      }
    },
    // 关闭PeerConnection
    closePeerConnection(){
      console.log('close RTCPeerConnection');
      if(this.pc){
        this.pc.close()
        this.pc = null
      }
    },
    getOffer(desc){
      this.pc.setLocalDescription(desc)
      this.sendMessage(this.roomId, desc)
    },
    getAnswer(desc){
      this.pc.setLocalDescription(desc)
      this.sendMessage(this.roomId, desc)
    },
    sendMessage(roomId, data){
      console.log('send p2p message');
      if(this.$socket){
        this.$socket.emit('message', roomId, data)
      }
    },
  }
}
</script>
<style scoped lang="less">
.live-room{
  height: 100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  .live-room-header{
    height: 60px;
    line-height: 60px;
    color: #ffffff;
    text-align: center;
    font-size: 18px;
    border-bottom: 1px solid #ffffff;
    .back{
      display: inline-block;
      width: 30px;
      height: 60px;
      float: left;
      font-size: 25px;
      cursor: pointer;
    }
  }
  .live-room-aside{
    border-left: 1px solid #ffffff;
    .video-content{
      position: relative;
      width: 260px;
      height: 195px;
      background: #999999;
      border-bottom: 1px solid #ffffff;
      .video-model{
        position: absolute;
        width: 260px;
        height: 30px;
        bottom: 0;
        z-index: 1000;
        color: white;
      }
    }
  }
}
</style>
