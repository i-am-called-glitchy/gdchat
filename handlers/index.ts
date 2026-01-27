import { ChannelMap, CHATSTATE, Client, ClientMap } from "../models.ts";
import { AnyPacket, AuthPacket, Opcode, SendPacket } from "../protocol.ts";
import { handleAuthPacket } from "./auth.ts";
import { handleSendPacket } from "./send.ts";
import { errorBadOp, errorBadState } from "./utils.ts";

export function mainPacketHandler(
  packet: AnyPacket,
  clients: ClientMap,
  socket: WebSocket,
  client: Client,
  channels: ChannelMap,
) {
  if (client.state === CHATSTATE.JUST_CONNECTED && packet.op !== Opcode.AUTH) {
    errorBadState(packet, socket);
    return;
  }

  switch (packet.op) {
    case Opcode.AUTH: {
      handleAuthPacket(packet as AuthPacket, socket, client);
      return;
    }
    case Opcode.SEND: {
      handleSendPacket(packet as SendPacket, socket, client, channels, clients);
      return;
    }
    default: {
      errorBadOp(packet, socket);
      return;
    }
  }
}
