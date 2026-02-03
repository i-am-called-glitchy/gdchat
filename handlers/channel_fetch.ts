import {
  FetchChannelPacket,
  FetchChannelsPacket,
  normalizeUUID,
  OkPacket,
  Opcode,
  serializePacket,
} from "../protocol.ts";
import { ChannelMap, Client } from "../models.ts";
import { ensurePacketHasNonce, errorNotFound } from "./utils.ts";

export function handleChannelFetch(
  packet: FetchChannelPacket,
  socket: WebSocket,
  /* here implement hidden channels */ _client: Client,
  channels: ChannelMap,
) {
  if (!ensurePacketHasNonce(packet, socket)) {
    return;
  }
  const normalizedUUID = normalizeUUID(packet.data.id);
  const channelObject = channels.get(normalizedUUID);
  if (!channelObject) {
    errorNotFound(packet, socket);
    return;
  }

  const response: OkPacket = {
    op: Opcode.OK,
    data: {
      response_type: Opcode.FETCH_CHANNEL,
      data: {
        id: channelObject.id,
        name: channelObject.name,
        description: channelObject.description,
      },
    },
  };

  socket.send(serializePacket(response));
}

export function handleChannelsFetch(
  packet: FetchChannelsPacket,
  socket: WebSocket,
  _client: Client,
  channels: ChannelMap,
) {
  if (!ensurePacketHasNonce(packet, socket)) {
    return;
  }

  const response: OkPacket = {
    op: Opcode.OK,
    data: {
      response_type: Opcode.FETCH_CHANNELS,
      data: {
        channels: channels.values().toArray(),
      },
    },
  };
  socket.send(serializePacket(response));
}
