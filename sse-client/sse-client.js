const EventSource = require("eventsource")



/**
 * Handles an event by logging it and sending a message to the node with a generated ID, topic, and payload.
 *
 * @param {Object} RED - the global RED object
 * @param {Object} node - the node object that received the event
 * @param {Object} event - the event object received
 * @return {void}
 */
function handleEvent(RED, node, event) {
  RED.log.debug(`Received event: from ${this.url} - ${event.type}`);
  node.send({
    _msid: RED.util.generateId(),
    topic: event.type,
    payload: event.data
  });
}

/**
 * Handles errors from an event source.
 *
 * @param {Object} RED - the Node-RED runtime object
 * @param {Object} node - the node that received the error
 * @param {Error} err - the error that occurred
 * @return {void}
 */
function handleEventSourceError(RED, node, err) {
  const errorMessage = err.message ? err.message : err;
  RED.log.error(errorMessage);
  node.send({
    _msid: RED.util.generateId(),
    error: errorMessage
  });
  node.status({
    fill: 'red',
    shape: 'dot',
    text: `${errorMessage}`,
  });
  node.error(errorMessage);
}

/**
 * Closes the eventSource and logs a debug message.
 *
 * @param {Object} RED - The Node-RED runtime object.
 * @param {Object} node - The node instance that the function is called on.
 * @return {void}
 */
function handleEventSourceClose(RED, node) {
  RED.log.debug(`Closing event source: ${this.url}`);
  node.eventSource.close()
}

module.exports = function (RED) {

  /**
   * Creates a new SSE (Server-Sent Events) client node.
   *
   * @param {Object} config - Node-RED node configuration object.
   */
  function CreateSseClientNode(config) {
    try {
      RED.nodes.createNode(this, config);

      this.url = config.url
      this.event = config.event;
      this.headers = config.headers ? JSON.parse(config.headers) : {};
      this.eventSource = new EventSource(this.url, { withCredentials: true, headers: this.headers });

      this.status({
        fill: 'green',
        shape: 'dot',
        text: `Connected to ${this.url}`,
      });

      // Register default message event
      this.eventSource.on(this.event, (event) => handleEvent(RED, this, event))

      // Register error event
      this.eventSource.on('error', (err) => handleEventSourceError(RED, this, err));

      // Register close event of the node runtime to clean up old event sources
      this.on('close', () => handleEventSourceClose(RED, this));
    } catch (error) {
      this.status({
        fill: 'red',
        shape: 'dot',
        text: `${error.message}`
      })
      console.error(error)
      RED.log.error(error)
    }

  }
  RED.nodes.registerType('sse-client', CreateSseClientNode);
};