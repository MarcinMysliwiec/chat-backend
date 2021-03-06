const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
app.use(cors());

const URL = 'localhost';
const PORT = 3002;
const server = http.createServer(app);
let onlineUsers = [];

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const getUsersFromRoom = (room) => {
  return onlineUsers.filter(obj => obj.room === room);
};

io.on('connection', (socket) => {
  socket.on('join_room', ({ username, room }) => {
    socket.join(room);

    const userData = { socketId: socket.id, username, room };
    onlineUsers.push(userData);

    socket.to(room).emit('receive_bot_message', {
      room: room,
      is_bot: true,
      author: 'BOT',
      type: 'CONNECTION',
      message: `${username} has joined`,
      time: new Date().toISOString()
    });
    socket.to(room).emit('users_in_room', onlineUsers);
  });

  socket.on('send_message', (msgObj) => {
    socket.to(msgObj.room).emit('receive_message', msgObj);
  });

  socket.on('disconnect', () => {
    const index = onlineUsers.findIndex(obj => obj.socketId === socket.id);
    const disconnectedUser = onlineUsers[index];
    if (index < 0) return 0;

    onlineUsers = onlineUsers.filter(obj => obj.socketId !== socket.id);
    socket.to(disconnectedUser.room).emit('receive_bot_message', {
      room: disconnectedUser.room,
      is_bot: true,
      author: 'BOT',
      type: 'DISCONNECTION',
      message: `${disconnectedUser.username} has left`,
      time: new Date().toISOString()
    });
    socket.to(disconnectedUser.room).emit('users_in_room', getUsersFromRoom(disconnectedUser.room));
  });
});

app.get('/users', (req, res) => {
  return res.status(200).json(getUsersFromRoom(req.query.room));
});

server.listen(PORT, URL, () => {
  console.log('SERVER RUNNING');
});
