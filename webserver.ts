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

const MESSAGE_CONTENT_LIMIT = 2000;
const HARD_MESSAGE_LENGTH_LIMIT = 6144;

const textEncoder = new TextEncoder();

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
  if (ev.data.toString().length == 0) {
    return;
  }
  try {
    console.debug(`${client.clientid} (${client.state}): ${ev.data}`);
    try {
      const packet = parsePacket(ev.data);
      mainPacketHandler(packet, clients, socket, client, channels);
    } catch (_) {
      const errorPacket = createErrorPacket(ErrorCategory.INVALID, "BAD_OP");
      socket.send(serializePacket(errorPacket));
    }
  } catch (error) {
    console.error(error);
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
    const packetLength = textEncoder.encode(ev.data).length;
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

    return response;
  });
}
