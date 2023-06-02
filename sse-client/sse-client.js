const EventSource = require("eventsource")

function handleEvent(RED, node, event) {
  RED.log.debug(`Received event: from ${this.url} - ${event.type}`);
  node.send({
    _msid: RED.util.generateId(),
    topic: event.type,
    payload: event.data
  });
}

function handleEventSourceError(RED, node, err) {
  RED.log.error(err);
  node.send({
    _msid: RED.util.generateId(),
    error: err
  });
  node.error(err);
}

function handleEventSourceClose(RED, node) {
  RED.log.debug(`Closing event source: ${this.url}`);
  node.eventSource.close()
}

module.exports = function (RED) {

  function CreateSseClientNode(config) {
    RED.nodes.createNode(this, config);

    this.url = config.url
    this.event = config.event;
    this.eventSource = new EventSource(this.url, { withCredentials: true });

    // Register default message event
    this.eventSource.on(this.event, (event) => handleEvent(RED, this, event))

    // Register error event
    this.eventSource.on('error', (err) => handleEventSourceError(RED, this, err));

    // Register close event of the node runtime to clean up old event sources
    this.on('close', () => handleEventSourceClose(RED, this));

  }
  RED.nodes.registerType('sse-client', CreateSseClientNode);
};