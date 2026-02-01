import {
  createOkPacket,
  normalizeUUID,
  Opcode,
  serializePacket,
  SubDefaultPacket,
  SubPacket,
} from "../protocol.ts";
import { ChannelMap, Client, SUBSTATE } from "../models.ts";
import { ensurePacketHasNonce, errorBadOp, errorNotFound } from "./utils.ts";
import { UUID } from "node:crypto";

export function handleSubPacket(
  packet: SubPacket,
  socket: WebSocket,
  client: Client,
  channels: ChannelMap,
) {
  const normalizedUUID = normalizeUUID(packet.data.cid);
  const SubType = packet.data.type.toUpperCase() as SUBSTATE;
  const channelObject = channels.get(normalizedUUID);
  if (!ensurePacketHasNonce(packet, socket)) {
    return;
  }
  if (!channelObject) {
    errorNotFound(packet, socket);
    return;
  }

  // ! Add permission checks here

  if (SubType === SUBSTATE.DEFAULT) {
    client.subscriptions.delete(normalizedUUID);
  } else {
    client.subscriptions.set(normalizedUUID as UUID, SubType);
  }

  const response = createOkPacket(Opcode.SUB, undefined, packet.nonce);

  socket.send(serializePacket(response));
}

export function handleSubDefaultPacket(
  packet: SubDefaultPacket,
  socket: WebSocket,
  client: Client,
) {
  const SubType = packet.data.type.toUpperCase() as SUBSTATE;

  if (!ensurePacketHasNonce(packet, socket)) return;

  if (SubType === SUBSTATE.DEFAULT) {
    errorBadOp(
      packet,
      socket,
      "DEFAULT should not be in SUB_DEFAULT, just send subtype FULL",
    );
  }

  client.default_sub = SubType;

  const response = createOkPacket(Opcode.SUB_DEFAULT, undefined, packet.nonce);
  socket.send(serializePacket(response));
}
