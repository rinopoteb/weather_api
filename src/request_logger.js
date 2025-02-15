module.exports = {
  requestLogger: (req, res, next) => {
    console.log(
      `${new Date().toISOString()} - ${req.headers["x-forwarded-for"] || req.socket.remoteAddress} - ${req.method} ${
        req.originalUrl
      }`
    );
    next();
  }
};
