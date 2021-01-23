<template>
  <div class="video-item">
    <div class="video-stream">
      <video ref="player" autoplay playsinline></video>
    </div>
    <div class="video-msg"></div>
  </div>
</template>

<script>
export default {
  name: "videoItem",
  props: ['stream'],
  watch: {
    stream(val) {
      if (val) {
        this.$refs.player.srcObject = this.stream;
      }
    }
  },
  mounted() {

  }
}
</script>

<style lang="less" scoped>
.video-item {
  display: inline-block;
  margin: 0 10px;

  .video-stream {
    width: 120px;
    height: 120px;
    background: #999999;

    video {
      width: 120px;
      height: 120px;
    }
  }

  .video-msg {
    height: 50px;
    border: 1px solid #999999;
  }
}
</style>
