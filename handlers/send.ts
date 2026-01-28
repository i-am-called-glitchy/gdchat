import { randomUUID, UUID } from "node:crypto";
import {
  ChannelMap,
  Client,
  ClientMap,
  MSG_BROADCAST_TYPE,
  SUBSTATE,
} from "../models.ts";
import {
  MsgPacket,
  normalizeUUID,
  OkPacket,
  Opcode,
  PartialUser,
  profileToPartialUser,
  SendPacket,
  serializePacket,
} from "../protocol.ts";
import { ensurePacketHasNonce, errorBadState, errorNotFound } from "./utils.ts";

function whatShouldIBroadcast(
  client: Client,
  channel: UUID,
  mentions: PartialUser[],
): MSG_BROADCAST_TYPE {
  const mentioned = client.profile
    ? mentions.some((m) => m.id === client.profile?.id)
    : false;

  const sub = client.subscriptions.get(channel) ?? client.default_sub;

  switch (sub) {
    case SUBSTATE.NONE:
      return MSG_BROADCAST_TYPE.NONE;

    case SUBSTATE.IFMENTION:
      return mentioned ? MSG_BROADCAST_TYPE.FULL : MSG_BROADCAST_TYPE.NONE;

    case SUBSTATE.PARTIAL:
      return MSG_BROADCAST_TYPE.PARTIAL;

    case SUBSTATE.PARTIALIFMENTION:
      return mentioned ? MSG_BROADCAST_TYPE.PARTIAL : MSG_BROADCAST_TYPE.NONE;

    case SUBSTATE.FULLIFMENTION:
      return mentioned ? MSG_BROADCAST_TYPE.FULL : MSG_BROADCAST_TYPE.PARTIAL;

    case SUBSTATE.FULL:
      return MSG_BROADCAST_TYPE.FULL;

    default:
      console.error("the fuck", client, channel, mentions);
      return MSG_BROADCAST_TYPE.FULL;
  }
}

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
  const broadcastMessagePartial = {
    ...broadcastMessage,
    data: { ...broadcastMessage.data, content: undefined },
  };

  const broadcastMessageSerialized = serializePacket(broadcastMessage); // avoid recalculating
  const broadcastMessagePartialSerialized = serializePacket(
    broadcastMessagePartial,
  );

  clients.forEach((iter_client) => {
    switch (
      whatShouldIBroadcast(
        iter_client,
        targetChannel as UUID,
        broadcastMessage.data.mentions,
      )
    ) {
      case MSG_BROADCAST_TYPE.FULL:
        iter_client.socket.send(broadcastMessageSerialized);
        break;
      case MSG_BROADCAST_TYPE.PARTIAL:
        iter_client.socket.send(broadcastMessagePartialSerialized);
        break;
      case MSG_BROADCAST_TYPE.NONE:
        break;
    }
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
