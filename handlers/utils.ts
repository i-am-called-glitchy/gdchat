import {
  AnyPacket,
  CloseCode,
  createErrorPacket,
  ErrorCategory,
  serializePacket,
} from "../protocol.ts";
import { CHATSTATE, Client } from "../models.ts";

export function errorBadState(packet: AnyPacket, socket: WebSocket) {
  const response = createErrorPacket(
    ErrorCategory.INVALID,
    "BAD_STATE",
    undefined,
    packet.nonce ?? undefined,
  );
  socket.send(serializePacket(response));
}

export function errorBadOp(
  packet: AnyPacket,
  socket: WebSocket,
  message?: string,
) {
  const response = createErrorPacket(
    ErrorCategory.INVALID,
    "BAD_OP",
    message ?? undefined,
    packet.nonce ?? undefined,
  );
  console.trace(packet);
  socket.send(serializePacket(response));
}

export function ensurePacketHasNonce(
  packet: AnyPacket,
  socket: WebSocket,
  sendErr: boolean = true,
): boolean {
  if (!packet.nonce) {
    if (sendErr) {
      errorBadOp(packet, socket, "No nonce");
    }
    return false;
  }
  return true;
}

export function errorNotFound(packet: AnyPacket, socket: WebSocket) {
  const response = createErrorPacket(
    ErrorCategory.INVALID,
    "NOT_FOUND",
    undefined,
    packet.nonce ?? undefined,
  );
  socket.send(serializePacket(response));
}

export function kickIfBadAuth(
  client: Client,
  socket: WebSocket,
  errormsg?: string,
): boolean {
  if (client.state === CHATSTATE.JUST_CONNECTED) {
    socket.close(
      CloseCode.BAD_AUTH,
      errormsg
        ? errormsg.slice(0, 122)
        : "Bad packet sent in auth phase. Socket expects gdchat.",
    );
    return true;
  }
  return false;
}
