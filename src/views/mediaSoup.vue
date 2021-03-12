<template>
  <el-container class="live-room">
    <el-header v-show="!isFullScreen" class="live-room-header" height="48px">
      <div class="back">
        <i class="el-icon-back"></i>
      </div>
      <div class="net-status">
        <span style="margin-right: 20px">上行带宽: <span style="color: red">{{bytesSentRate}}</span>kb/s</span>
        <span>下行带宽: <span style="color: red">{{bytesReceivedRate}}</span>kb/s</span>
      </div>
      {{isInRoom ? '已进入房间': '未进入房间'}}
    </el-header>
    <div v-show="!isFullScreen" class="video-container">
      <video-item :peer-data="localPeer"/>
      <video-item v-for="item in peers" :key="item.peerId" :peer-data="item"/>
    </div>
    <el-container>
      <el-main>
        <div v-if="!isInRoom" class="join-room">
          <el-form ref="form">
            <el-form-item>
              <el-input v-model="userName" style="width: 200px; margin-right: 10px" size="small" placeholder="请输入名字"/>
              <el-button type="primary" size="small" @click="enterRoom">
                进入房间
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        <div v-else class="share-window">
          <video ref="shareWindow" width="180px" height="110px" autoplay playsinline></video>
          <div class="class-tool">
            <el-button v-if="role === 'teacher' && !windowStream" @click="shareWindow">分享桌面</el-button>
            <el-button v-if="windowStream" @click="startRecord">{{recordStatus === 'stop' ? '录制' : '停止录制'}}</el-button>
            <el-button @click="isFullScreen = !isFullScreen">{{isFullScreen ? '取消全屏' : '全屏'}}</el-button>
          </div>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import Room from "../lib/room";
import VideoItem from "../components/videoItem";
import { getUrlParameter } from '@/utils/index'

export default {
  name: 'liveRoom',
  components: {VideoItem},
  data() {
    return {
    userName: '',
    room: null,
    role: 'student',
    isInRoom: false, // 是否在房间内
    isFullScreen: false, // 是否全屏
    mediaDevices: { // 获取视频配置
      video: {
        width: 180,
        height: 110,
        frameRate: 18
      },
      audio: false,
    },
    localPeer: {
      peerName: 'local',
      tracks: []
    }, // 本地视频流
    windowStream: '',
    peers: [],
    recordStatus: 'stop', // start 录制中， stop 停止
    // 流量监控
    bytesSent: 0,
    bytesSentRate: 0,
    bytesReceived: 0,
    bytesReceivedRate: 0
  }
},
  mounted() {
    window.liu = this.streamSendMonitor
    this.role = getUrlParameter('role')
    this.room = (window.room = new Room())
    this.getUserMedia(this.mediaDevices)

    // 其他人加入房间时触发
    this.room.on("@peerJoined", ({ peerId, peerName }) => {
      console.log("new peer joined", peerId);
      this.$notify.info(`${peerName}加入房间`)
      this.peers.push({peerId: peerId, tracks: [], peerName: peerName})
    });
    // 新的消费者加入是触发
    this.room.on("@consumer", async (consumer) => {
      let {appData: { peerId, type }, track} = consumer;
      console.log("receive consumer", consumer);
      if(type === 'window'){
        let windowStream = new MediaStream([track])
        this.$refs.shareWindow.srcObject =  windowStream
      }
      this.peers.forEach(item => {
        if(type === 'user' && item.peerId === peerId) {
          item.tracks.push(track)
        }
      })
    });

    this.room.on("@consumerClosed", ({ consumerId , producer}) => {
      console.log(producer._appData.type);
      if(producer._appData.type === 'window'){
        this.$refs.shareWindow.srcObject = null
      }
    });
    this.room.on("@peerClosed", ({ peerId , peerName}) => {
      this.$notify.info(`${peerName}离开房间`)
      this.peers = this.peers.filter(item => item.peerId !== peerId)
    });
    this.room.on("@changeRecord", res => {
      this.recordStatus = res
    })

    setInterval(() => {
      this.streamSendMonitor()
      this.streamRecvMonitor()
    },2000)
  },
  methods: {
    enterRoom(){
      if(!this.userName){
        this.$notify.error('请输入用户名')
        return
      }
      this.joinRoom()
    },
    joinRoom() {
      if (!this.isInRoom){
        this.room.join(this.userName);

        // 加入成功时触发，获取房间其他成员的信息
        this.room.once("@open", ({ peers }) => {
          console.log(`${peers.length} peers in this room.`);
          this.$notify.success('加入房间成功')
          this.localPeer.peerName = this.userName
          this.peers = peers.map(item => {
            return {peerId: item.peerId, tracks:[], peerName: item.peerName}
          })
          this.isInRoom = true
          this.sendVideo()
        });
      }
    },

    async sendVideo(){
      if(this.isInRoom && this.localStream){
        let videoTrack = this.localStream.getVideoTracks()[0];
        let producer = await this.room.sendVideo(videoTrack);
      }
    },
    // 获取本地视频
    getUserMedia(mediaDevices) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.$message.error('the getUserMedia is not supported');
      } else {
        navigator.mediaDevices.getUserMedia(mediaDevices).then((stream) => {
          this.localStream = stream
          let videoTrack = this.localStream.getVideoTracks()[0];
          this.localPeer.tracks = [videoTrack]
        })
      }
    },
    // 分享桌面
    shareWindow(){
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        this.$message.error('the getUserMedia is not supported');
      } else {
        let mediaDevices = {
          video: {
            width: 1920,
            height: 1080,
            frameRate: 23,
          },
          audio: false,
        }
        navigator.mediaDevices.getDisplayMedia(mediaDevices).then((stream) => {
          this.windowStream = stream
          let videoTrack = this.windowStream.getVideoTracks()[0];
          let producer = this.room.sendVideo(videoTrack, 'window');
          this.$refs.shareWindow.srcObject = this.windowStream
          stream.oninactive = () => {
            this.windowStream = ''
          }
        })
      }
    },
    // 录制
    startRecord(){
      if(this.recordStatus === 'stop'){
        this.room.startRecord()
      } else {
        this.room.stopRecord()
      }
    },
    // 视频上行流量监控
    streamSendMonitor(){
      this.room.streamSendMonitor().then(res => {
        this.bytesSentRate = parseInt((res - this.bytesSent)/1000*8/2)
        this.bytesSent = res
      })
    },
    // 视频下行流量监控
    streamRecvMonitor(){
      this.room.streamRecvMonitor().then(res => {
        this.bytesReceivedRate = parseInt((res - this.bytesReceived)/1000*8/2)
        this.bytesReceived = res
      })
    }
  }
}
</script>
<style scoped lang="less">
.live-room{
  height: 100%;
  width: 100%;
  font-size: 14px;
  .live-room-header{
    height: 48px;
    line-height: 48px;
    color: #333333;
    text-align: center;
    font-size: 18px;
    background: #f5f7f8;
    .back{
      display: inline-block;
      width: 30px;
      height: 48px;
      float: left;
      font-size: 25px;
      cursor: pointer;
    }
    .net-status{
      position: absolute;
      left: 70px;
      font-size: 14px;
    }
  }
  .video-container{
    padding: 0 10px;
    height: 110px;
    background: #f5f7f8;
  }
  .el-main{
    position: relative;
    padding: 0;
    .join-room{
      margin-left: 10px;
      margin-top: 20px;
    }
    .share-window{
      position: absolute;
      width: 100%;
      top: 0;
      bottom: 0;
      background: #000000;
      video{
        width: 100%;
        height: 100%;
      }
    }
  }
  .class-tool{
    position: fixed;
    bottom: 20px;
    right: 20px;
  }
}
</style>
