<template>
  <div class="menu-container">
    <div class="menu-item">
      <img src="./img/pick.png">
    </div>
    <div :class="['menu-item', {'active-color':  drawType === 'line'}]" @click="selectType('line')">
      <img src="./img/line.png">
    </div>
    <div class="menu-item">
      <el-popover
        placement="top"
        trigger="click">
        <div style="padding: 0 20px">
          <el-slider  v-model="lineWidth" :max="5" :min="1" @change="changeLineWidth"></el-slider>
        </div>
        <div class="color-tab">
          <div v-for="color in colors" :key="color" :class="['color-item', {'active-color':  color === lineColor}]" @click="changeColor(color)">
            <span :style="{background: color}"></span>
          </div>
        </div>
        <div slot="reference">
          <div style="height: 40px">
            <span class="color" :style="{background: lineColor}"/>
          </div>
        </div>
      </el-popover>

    </div>
    <div class="menu-item">
      <img src="./img/shape.svg">
    </div>
    <div class="menu-item">
      <img src="./img/text.png">
    </div>
    <div :class="['menu-item', {'active-color':  drawType === 'eraser'}]" @click="selectType('eraser')">
      <img src="./img/eraser.png">
    </div>
    <div class="menu-item" @click="selectType('clear')">
      <img src="./img/clear.png">
    </div>
    <div class="menu-item" @click="selectType('back')">
      <img src="./img/back.png">
    </div>
  </div>
</template>

<script>
export default {
  name: 'index',
  data(){
    return {
      colors: ['#000000', '#FF0002', '#3DDB7D', '#F38E36', '#9013FE'],
      lineColor: '#000000',
      lineWidth: 2,
      drawType: 'line' // line  eraser
    }
  },
  methods:{
    selectType(val){
      switch (val) {
        case 'line':
        case 'eraser':
          this.drawType = val
          this.$emit('changeLineStyle', {
            type: val,
          })
          break
        case 'clear':
          this.$emit('selectTool', {
            action: 'clear'
          })
          break
        case 'back':
          this.$emit('selectTool', {
            action: 'cancel'
          })
          break
        default:
          return;
      }
    },
    // 选择颜色
    changeColor(val){
      this.lineColor = val
      this.$emit('changeLineStyle', {
        lineColor: this.lineColor,
        lineWidth: this.lineWidth
      })
    },
    // 选择线条粗细
    changeLineWidth(){
      this.$emit('changeLineStyle', {
        lineColor: this.lineColor,
        lineWidth: this.lineWidth
      })
    }
  }
}
</script>

<style scoped lang="less">
@menu_height: 46px;
.menu-container{
  position: absolute;
  display: flex;
  align-items: center;
  height: @menu_height;
  line-height: @menu_height;
  background: white;
  box-shadow: 0 8px 20px 0 rgb(0 0 0 / 15%);
  border-radius: 23px;
  padding: 0 15px;
  .menu-item{
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    width: 30px;
    height: 30px;
    border-radius: 4px;
    margin: 0 6px;
    img{
      width: 100%;
      height: 100%;
    }
    &:hover{
      background: rgba(33, 35, 36, 0.1);
    }
    .color{
      display: inline-block;
      width: 18px;
      height: 18px;
      border-radius: 18px;
      background: red;
    }
  }
}
.color-tab{
  display: flex;
  .color-item{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 4px;
    cursor: pointer;
    margin: 0 5px;
    &:hover{
      background: rgba(33, 35, 36, 0.1);
    }
    span{
      display: inline-block;
      width: 18px;
      height: 18px;
      border-radius: 18px;
    }
  }
}
.active-color{
  background: rgba(33, 35, 36, 0.1);
}
</style>
