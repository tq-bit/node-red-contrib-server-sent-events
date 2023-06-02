const EventSource = require("eventsource")

function handleEventSourceError(RED, node, err) {
  RED.log.error(err);
  node.send({
    _msid: RED.util.generateId(),
    error: err
  });
  node.error(err);
}

module.exports = function (RED) {

  function CreateSseClientNode(config) {
    RED.nodes.createNode(this, config);

    this.url = config.url
    this.event = config.event;
    this.eventSource = new EventSource(this.url, { withCredentials: true });

    // Register default message event
    this.eventSource.on(this.event, (event) => {
      RED.log.info(`Received event: ${event}`);
      this.send({
        _msid: RED.util.generateId(),
        topic: event.type,
        payload: event.data
      });
    })

    // TODO: Register other event names

    // Register error event
    this.eventSource.on('error', (err) => handleEventSourceError(RED, this, err));

    // Register close event of the node runtime to clean up old event sources
    this.on('close', () => {
      RED.log.debug(`Closing event source: ${this.url}`);
      this.eventSource.close()
    })

  }
  RED.nodes.registerType('sse-client', CreateSseClientNode);
};