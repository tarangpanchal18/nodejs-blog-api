const EventEmitter = require('events');

class BlogEventEmitter extends EventEmitter {}

module.exports = new BlogEventEmitter();
