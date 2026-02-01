// handlers.ts
import { ChannelMap, CHATSTATE, Client, ClientMap } from "../models.ts";
import {
  createErrorPacket,
  ErrorCategory,
  Opcode,
  serializePacket,
} from "../protocol.ts";
import { handleAuthPacket } from "./auth.ts";
import { handleSendPacket } from "./send.ts";
import {handleSubDefaultPacket, handleSubPacket} from "./sub.ts";
import { errorBadOp, errorBadState } from "./utils.ts";

// Import the schema
import { ClientPacketSchema } from "../schemas.ts";

export function mainPacketHandler(
  rawPacket: unknown,
  clients: ClientMap,
  socket: WebSocket,
  client: Client,
  channels: ChannelMap,
) {
  const validationResult = ClientPacketSchema.safeParse(rawPacket);

  if (!validationResult.success) {
    const errorMsg = validationResult.error.issues.map((e) =>
      `${e.path.join(".")}: ${e.message}`
    ).join(", ");

    const errPacket = createErrorPacket(
      ErrorCategory.INVALID,
      "BAD_OP",
      `Invalid packet structure: ${errorMsg}`,
    );
    socket.send(serializePacket(errPacket));
    return;
  }

  const packet = validationResult.data;

  if (client.state === CHATSTATE.JUST_CONNECTED && packet.op !== Opcode.AUTH) {
    errorBadState(packet, socket);
    return;
  }

  switch (packet.op) {
    case Opcode.AUTH: {
      handleAuthPacket(packet, socket, client);
      return;
    }
    case Opcode.SEND: {
      handleSendPacket(packet, socket, client, channels, clients);
      return;
    }
    case Opcode.SUB: {
      handleSubPacket(packet, socket, client, channels);
      return;
    }
    case Opcode.SUB_DEFAULT: {
      handleSubDefaultPacket(packet, socket, client)
      return;
    }
    case Opcode.FETCH_HISTORY:
    case Opcode.FETCH_USERS:
    case Opcode.FETCH_USER:
    case Opcode.FETCH_MESSAGE:
    case Opcode.FETCH_CHANNEL:
    case Opcode.FETCH_CHANNELS:
    case Opcode.DELETE_MESSAGE:
    case Opcode.DELETE: {
      errorBadOp(packet, socket, "Not implemented"); // Not implemented
      return;
    }
    default: {
      errorBadOp(packet, socket, "what"); // should be unreachable
      return;
    }
  }
}
