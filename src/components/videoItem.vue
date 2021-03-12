<template>
  <div class="video-content">
    <div class="video-model">
      {{peerData.peerName}}
    </div>
    <video ref="player" width="180px" height="110px" autoplay playsinline></video>
  </div>
</template>

<script>
export default {
  name: "videoItem",
  props: ['peerData'],
  watch:{
    'peerData.tracks'(val){
      this.createStream()
    }
  },
  methods:{
    createStream(){
      let type = this.peerData.tracks[0] && this.peerData.tracks[0].kind
      if(type === 'video'){
        this.$refs.player.srcObject = new MediaStream([this.peerData.tracks[0]])
      }
    }
  }
}
</script>

<style lang="less" scoped>
.video-content{
    position: relative;
    background: #dbe2e5;
    display: inline-block;
    width: 180px;
    height: 110px;
    border-radius: 2px;
    margin-right: 10px;
    overflow: hidden;
    .video-model{
      position: absolute;
      background-color: rgba(0,0,0,.4);
      width: 180px;
      height: 24px;
      line-height: 24px;
      bottom: 0;
      z-index: 1000;
      color: white;
      padding: 0 5px;
    }
  }
</style>
