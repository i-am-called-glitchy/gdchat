import {
  AnyPacket,
  createErrorPacket,
  ErrorCategory,
  serializePacket,
} from "../protocol.ts";

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
