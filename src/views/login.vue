<template>
  <div class="login-content">
    <el-form class="login-form" ref="form" label-width="60px">
      <el-form-item label="房间号:">
        <el-input v-model="roomId" size="small" placeholder="请输入房间号"/>
      </el-form-item>
      <el-form-item label="用户名:">
        <el-input v-model="userName" size="small" placeholder="请输入名字"/>
      </el-form-item>
      <el-form-item class="enter-btn">
        <el-button type="primary" size="small" @click="enterRoom">
          进入房间
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  name: "login",
  data(){
    return {
      roomId: '',
      userName: ''
    }
  },
  created() {
    this.initListen()
  },
  methods:{
    initListen(){
      this.$socket.on('joined', (roomId, id) => {
        this.$router.replace({name: 'liveRoom', query: {roomId: roomId, name: this.userName}})
      })
      this.$socket.on('full', (roomId, id) => {
        this.$notify.error(`${roomId}房间已满`)
      })
    },
    enterRoom(){
      if(!this.roomId){
        this.$notify.error('请输入房间号')
        return
      }
      if(!this.userName){
        this.$notify.error('请输入用户名')
        return
      }
      this.$socket.emit('join', this.roomId, this.userName)
    }
  }
}
</script>

<style scoped lang="less">
.login-content{
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  .login-form{
    /deep/ .el-form-item__label{
      color: #ffffff;
    }
  }
}
</style>
