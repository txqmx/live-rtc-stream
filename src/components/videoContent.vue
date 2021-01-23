<template>
  <div class="video-content">
    <video-item :stream="ownVideo">

    </video-item>
    <!--        <video-item v-for="item in 3" :key="item">-->

    <!--        </video-item>-->
  </div>
</template>

<script>
function handleError(err) {
  console.error('Failed to get Media Stream!', err);
}

import VideoItem from "./videoItem";

export default {
  name: "videoContent",
  components: {VideoItem},
  data() {
    return {
      ownVideo: '',
      mediaDevices: {
        video: {
          width: 120,
          height: 120,
          frameRate: 18,
        },
        audio: false,
      }
    }
  },
  created() {
    this.getUserMedia(this.mediaDevices)
  },
  methods: {
    getUserMedia(mediaDevices) {
      navigator.mediaDevices.getUserMedia(mediaDevices).then((stream) => {
        this.ownVideo = stream;
      }).catch(handleError);
    }
  }

}
</script>

<style lang="less" scoped>
.video-content {
  width: 100%;
  height: 171px;
  border: 1px solid #999999;
}
</style>
