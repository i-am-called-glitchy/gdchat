import { randomUUID } from "node:crypto";
import { ChannelMap, Client, ClientMap } from "../models.ts";
import {
  MsgPacket,
  normalizeUUID,
  OkPacket,
  Opcode,
  profileToPartialUser,
  SendPacket,
  serializePacket,
} from "../protocol.ts";
import { ensurePacketHasNonce, errorBadState, errorNotFound } from "./utils.ts";

export function handleSendPacket(
  packet: SendPacket,
  socket: WebSocket,
  client: Client,
  channels: ChannelMap,
  clients: ClientMap,
) {
  const targetChannel = normalizeUUID(packet.data.channel);
  const clientProfile = client.profile;
  const messageId = randomUUID();
  const targetChannelObj = channels.get(targetChannel);

  if (!targetChannelObj) {
    errorNotFound(packet, socket);
    return;
  }
  if (!clientProfile) {
    errorBadState(packet, socket); // ????? what
    return;
  }
  if (!ensurePacketHasNonce(packet, socket)) {
    return;
  }

  const broadcastMessage: MsgPacket = {
    op: Opcode.MSG,
    data: {
      content: packet.data.content,
      user: profileToPartialUser(clientProfile),
      channel: targetChannel,
      id: messageId,
      timestamp: Date.now(),
      mentions: [],
    },
  };
  const broadcastMessageSerialized = serializePacket(broadcastMessage); // avoid recalculating

  clients.forEach((iter_client) => {
    iter_client.socket.send(broadcastMessageSerialized); // no good dumb test logic
  });

  const okPacket: OkPacket = {
    op: Opcode.OK,
    nonce: packet.nonce,
    data: {
      response_type: Opcode.SEND,
      data: {
        result_id: messageId,
        duplicate: false,
      },
    },
  };
  socket.send(serializePacket(okPacket));
}
