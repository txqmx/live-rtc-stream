const http = require('http');
const socketIo = require('socket.io');

const userNumber= 3
const users = {}
// http server
const app = http.createServer();
app.listen(3000, '0.0.0.0');

const io = socketIo.listen(app);

io.sockets.on('connection', (socket)=>{
  socket.on('message', (room, data)=>{
    socket.to(room).emit('message', room, data)//房间内所有人,除自己外
  });

  socket.on('join', (roomId, userName)=> {
    socket.join(roomId);
    let myRoom = io.sockets.adapter.rooms[roomId];
    let users = myRoom? Object.keys(myRoom.sockets).length : 0;

    if(users < userNumber) {
      socket.emit('joined', roomId, socket.id);
      if (users > 1) {
        socket.to(roomId).emit('otherJoin', userName);//除自己之外
      }
    }else {
      socket.leave(roomId);
      socket.emit('full', roomId, socket.id);
    }
  });

  socket.on('leave', (roomId, userName)=> {
    socket.leave(roomId);
    socket.to(roomId).emit('otherLeave', userName)
    socket.emit('leaved', roomId);
  });

  socket.on('mediaReady', (roomId, userName)=> {
    socket.to(roomId).emit('otherMediaReady')
  });

});
