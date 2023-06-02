/**
 * Updates the status of a given node with a blue circle and the number of connected clients.
 *
 * @param {Object} node - The node to update status for.
 */
function updateNodeStatus(node, type) {
  node.status({
    fill: type === "success" ? 'green' : 'red',
    shape: 'dot',
    text: `${node.subscribers.length} client(s) connected`,
  });
}

/**
 * Registers a new subscriber for a server-sent event (SSE) stream. This function
 * writes an opening header and message to the client and adds the client to the
 * list of subscribers for the given node.
 *
 * @param {Object} RED - the instance of the Node-RED runtime
 * @param {Object} node - the node instance in the Node-RED flow
 * @param {Object} msg - the message object containing information about the request
 * @return {void}
 */
function registerSubscriber(RED, node, msg) {
  RED.log.info('Client connected')
  // Write the opening header
  msg.res._res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Write the initial opening message
  msg.res._res.write('event: open\n');
  msg.res._res.write(`data: ${JSON.stringify(msg.payload || 'Connection opened')}\n`);
  msg.res._res.write(`id: ${msg._msgid}\n\n`);

  // Close a SSE connection when client disconnects
  msg.res._res.req.on('close', () => {
    unregisterSubscriber(node, msg);
    updateNodeStatus(node, 'success');
  });

  // Close all connections when a runtime event is registered, e.g. redeploy
  RED.events.on('runtime-event', () => {
    unregisterSubscriber(node, msg);
    updateNodeStatus(node, 'success');
  });

  // Append the request to a list of subscribers for this nod.
  node.subscribers.push({
    id: msg._msgid,
    socket: msg.res,
  });
  updateNodeStatus(node, 'success');
}

/**
 * Unregisters a subscriber by removing it from the list of subscribers and
 * sending a closing message to the client.
 *
 * @param {Object} node - The node object containing the list of subscribers.
 * @param {Object} msg - The message object containing the id of the subscriber to remove and the response object to write to.
 * @return {void}
 */
function unregisterSubscriber(node, msg) {
  // Write out closing message to client
  msg.res._res.write('event: close\n');
  msg.res._res.write(`data: The connection was closed by the server.\n`);
  msg.res._res.write(`id: ${msg._msgid}\n\n`);

  // Remove the subscriber from the list
  node.subscribers = node.subscribers.filter((subscriber) => {
    return subscriber.id !== msg._msgid;
  });
  msg.res._res.end();
}



/**
 * Sends server event data to all subscribers.
 *
 * @param {object} node - The node object containing subscribers and event data.
 * @param {object} msg - The message object containing topic and payload.
 */
function handleServerEvent(RED, node, msg) {
  const event = `${node.event || msg.topic || 'message'}`;
  const data = `${JSON.stringify(node.data || msg.payload)}`;
  RED.log.info(`Sent event: ${event}`);
  RED.log.debug(`Data: ${data}`);
  node.subscribers.forEach((subscriber) => {
    subscriber.socket._res.write(`event: ${event}\n`);
    subscriber.socket._res.write(`data: ${data}\n`);
    subscriber.socket._res.write(`id: ${msg._msgid}\n\n`);
  });
}

module.exports = function (RED) {
  /**
   * Creates a new SSE (Server-Sent Events) server node with the specified configuration.
   *
   * @param {Object} config - the configuration object for the node
   * @param {string} config.event - the name of the event to emit to the client
   * @param {string} config.data - the data to send to the client with the event
   * @return {void}
   */
  function CreateSseServerNode(config) {
    RED.nodes.createNode(this, config);
    this.subscribers = [];
    this.event = config.event;
    this.data = config.data;

    this.on('input', (msg, send, done) => {
      try {
        if (msg.res) {


          registerSubscriber(RED, this, msg);
        } else {
          handleServerEvent(RED, this, msg);
        }
      } catch (error) {
        RED.log.error(error)
        updateNodeStatus(this, 'error');
      } finally {
        done()
      }
    });
  }
  RED.nodes.registerType('sse-server', CreateSseServerNode);
};