const EventSource = require("eventsource")
module.exports = function (RED) {

  function CreateSseClientNode(config) {
    RED.nodes.createNode(this, config);

    this.url = config.url
    this.eventSource = new EventSource(this.url, { withCredentials: true });

    this.eventSource.on('message', (event) => {
      RED.log.debug(`Received event: ${event}`);
      this.send({
        _msid: RED.util.generateId(),
        topic: event.type,
        payload: event.data
      });
    })



    this.on('close', () => {
      RED.log.debug(`Closing event source: ${this.url}`);
      this.eventSource.close()
    })

  }
  RED.nodes.registerType('sse-client', CreateSseClientNode);
};