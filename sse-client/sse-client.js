module.exports = function (RED) {

  function CreateSseClientNode(config) {
    RED.nodes.createNode(this, config);
    this.subscribers = [];
    this.event = config.event;
    this.data = config.data;

    this.on('input', (msg, send, done) => {});
  }
  RED.nodes.registerType('sse-client', CreateSseClientNode);
};