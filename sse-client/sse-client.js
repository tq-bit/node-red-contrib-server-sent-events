const EventSource = require("eventsource")
module.exports = function (RED) {

  function CreateSseClientNode(config) {
    RED.nodes.createNode(this, config);

    this.url = config.url
    this.eventSource = new EventSource(this.url, { withCredentials: true });

    // Register default message event
    this.eventSource.on('message', (event) => {
      RED.log.debug(`Received event: ${event}`);
      this.send({
        _msid: RED.util.generateId(),
        topic: event.type,
        payload: event.data
      });
    })

    // TODO: Register other event names

    // Register error event
    this.eventSource.on('error', (err) => {
      RED.log.error(err);
      this.send({
        _msid: RED.util.generateId(),
        error: err
      });
      this.error(err);
    })

    // Register close event of the node runtime to clean up old event sources
    this.on('close', () => {
      RED.log.debug(`Closing event source: ${this.url}`);
      this.eventSource.close()
    })

  }
  RED.nodes.registerType('sse-client', CreateSseClientNode);
};