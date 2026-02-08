import { randomUUID, UUID } from "node:crypto";
import {
  ChannelMap,
  CHATSTATE,
  Client,
  ClientMap,
  SUBSTATE,
} from "./models.ts";
import {
  createErrorPacket,
  ErrorCategory,
  HelloPacket,
  Opcode,
  parsePacket,
  serializePacket,
} from "./protocol.ts";
import { mainPacketHandler } from "./handlers/index.ts";
import { conditionalLog } from "./utils.ts";

const MESSAGE_CONTENT_LIMIT = 2000;
const HARD_MESSAGE_LENGTH_LIMIT = 6144;

function mainPage(_req: Request): Response {
  return new Response("Hello OwO\nThis is a websocket server :3c");
}

function onMessage(
  socket: WebSocket,
  ev: MessageEvent,
  client: Client,
  clients: ClientMap,
  channels: ChannelMap,
): void {
  if (ev.data.toString().length === 0) return;

  conditionalLog(
    "LOG_ALL_PACKETS",
    `${client.clientid} (${client.state}): ${ev.data}`,
  );

  let packet;
  try {
    packet = parsePacket(ev.data);
  } catch (e) {
    const errorPacket = createErrorPacket(
      ErrorCategory.INVALID,
      "BAD_OP",
      "Malformed JSON or invalid packet structure",
    );
    socket.send(serializePacket(errorPacket));
    return;
  }

  try {
    mainPacketHandler(packet, clients, socket, client, channels);
  } catch (e) {
    console.error(e);
    const errorPacket = createErrorPacket(
      ErrorCategory.SERVER,
      "INTERNAL",
      "Internal server error",
    );
    socket.send(serializePacket(errorPacket));
  }
}

function onConnect(
  socket: WebSocket,
  info: Deno.ServeHandlerInfo<Deno.NetAddr>,
  clients: ClientMap,
  channels: ChannelMap,
): void {
  const clientid = randomUUID();
  const client: Client = {
    clientid: clientid,
    socket: socket,
    state: CHATSTATE.JUST_CONNECTED,
    subscriptions: new Map<UUID, SUBSTATE>(),
    default_sub: SUBSTATE.FULL,
  };

  clients.set(socket, client);
  socket.addEventListener("close", () => clients.delete(socket));

  socket.addEventListener("message", (ev: MessageEvent) => {
    const packetLength = ev.data.length;
    if (packetLength > HARD_MESSAGE_LENGTH_LIMIT) {
      socket.close(1009, "why are you sending me pictures of your mom");
      return;
    }
    try {
      onMessage(socket, ev, client, clients, channels);
    } catch (err) {
      console.error("packet handler crashed:", err);
      socket.close(1011, "how the fuck");
    }
  });

  console.log(
    `Oh hey a client connected OwO ${info.remoteAddr.hostname}:${info.remoteAddr.port} (${clientid})`,
  );

  const hellopacket: HelloPacket = {
    op: Opcode.HELLO,
    nonce: null,
    data: {
      name: `glitchy's dumb ts server (clientid ${clientid})`,
      version: 1,
      message_content_limit: MESSAGE_CONTENT_LIMIT,
      hard_message_length_limit: HARD_MESSAGE_LENGTH_LIMIT,
      ext: [],
    },
  };

  socket.send(serializePacket(hellopacket));
}

export function serve(clients: ClientMap, channels: ChannelMap) {
  Deno.serve((req, info) => {
    if (req.headers.get("upgrade") != "websocket") {
      return mainPage(req);
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.addEventListener(
      "open",
      () => onConnect(socket, info, clients, channels),
    );

    setInterval(() => {
      for (const client of clients.values()) {
        if (client.socket.readyState !== WebSocket.OPEN) continue;
        if (client.socket.bufferedAmount > 1_000_000) {
          conditionalLog(
            "BACKPRESSURE",
            `Client ${client.clientid} too slow: ${client.socket.bufferedAmount}`,
          );
          client.socket.close(1009, "Backpressure exceeded");
        }
      }
    }, 250);

    return response;
  });
}
