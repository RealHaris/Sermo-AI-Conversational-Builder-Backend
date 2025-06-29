const SocketService = require("../service/SocketService");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("join", (room) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });

    SocketService.handleConnection(socket);
  });
};