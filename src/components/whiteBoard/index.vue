<template>
  <div v-if="isInit">
    <white-canvas ref="whiteCanvas" :width="canvasWidth" :height="canvasHeight"></white-canvas>
    <white-menu @changeLineStyle="changeLineStyle" @selectTool="selectTool"></white-menu>
  </div>
</template>

<script>
import whiteCanvas from './canvas/index'
import whiteMenu from './menu/index'
export default {
  name: "whiteBoard",
  components: { whiteCanvas, whiteMenu},
  data(){
    return {
      isInit: false,
      canvasWidth: '',
      canvasHeight: ''
    }
  },
  methods:{
    init(param){
      this.canvasWidth = param.width
      this.canvasHeight = param.height - 50
      this.isInit = true
    },
    changeLineStyle({type, lineColor,lineWidth}){
      this.$refs.whiteCanvas.changeWay({
        type: type,
        color: lineColor,
        lineWidth: lineWidth
      })
    },
    selectTool({action}){
      this.$refs.whiteCanvas.selectTool({
        action: action
      })
    }
  }
}
</script>

<style scoped>

</style>
