const EventSource = require("eventsource");

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
    payload: event.data,
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
function handleEventSourceError(RED, node, config, err) {
  // Count the amount of times an error occured
  node.counter = (node.counter || 0) + 1;

  const errorMessage = err.message ? err.message : err;
  RED.log.error(errorMessage);
  node.send({
    _msid: RED.util.generateId(),
    error: errorMessage,
  });
  node.status({
    fill: "yellow",
    shape: "dot",
    text: `${errorMessage} | Trying again in ${
      (node.counter * node.connectionAttemptInterval) / 1000
    } seconds`,
  });
  node.error(errorMessage);

  if (node.counter < node.maxConnectionAttempts) {
    node.eventSource.close();
    setTimeout(
      () => connect(RED, node, config),
      node.counter * node.connectionAttemptInterval
    );
  } else {
    node.eventSource.close();
    node.status({
      fill: "red",
      shape: "dot",
      text: `Failed to connect to ${node.url} after ${node.counter} attempts`,
    });
  }
}

function connect(RED, node, config) {
  RED.nodes.createNode(node, config);

  node.url = config.url;
  node.event = config.event;
  node.headers = config.headers ? JSON.parse(config.headers) : {};
  node.eventSource = new EventSource(node.url, {
    withCredentials: true,
    headers: node.headers,
  });
  node.maxConnectionAttempts = config.maxConnectionAttempts || 5;
  node.connectionAttemptInterval = config.connectionAttemptInterval || 5000;

  node.status({
    fill: "green",
    shape: "dot",
    text: `Connected to ${node.url}`,
  });

  // Register default message event
  node.eventSource.on(node.event, (event) => handleEvent(RED, node, event));

  // Register error event
  node.eventSource.on("error", (err) =>
    handleEventSourceError(RED, node, config, err)
  );

  // Register close event of the node runtime to clean up old event sources
  node.on("close", () => handleEventSourceClose(RED, node));
}

/**
 * Closes the eventSource and logs a debug message.
 *
 * @param {Object} RED - The Node-RED runtime object.
 * @param {Object} node - The node instance that the function is called on.
 * @return {void}
 */
function handleEventSourceClose(RED, node) {
  RED.log.debug(`Closing event source: ${node.url}`);
  node.eventSource.close();
}

module.exports = function (RED) {
  /**
   * Creates a new SSE (Server-Sent Events) client node.
   *
   * @param {Object} config - Node-RED node configuration object.
   */
  function CreateSseClientNode(config) {
    try {
      connect(RED, this, config);
    } catch (error) {
      this.status({
        fill: "red",
        shape: "dot",
        text: `${error.message}`,
      });
      console.error(error);
      RED.log.error(error);
    }
  }
  RED.nodes.registerType("sse-client", CreateSseClientNode);
};
