import { randomUUID } from "node:crypto";
import { CHATSTATE, Client } from "../models.ts";
import {
  AuthPacket,
  CloseCode,
  OkPacket,
  Opcode,
  profileToFullUser,
  serializePacket,
} from "../protocol.ts";
import { ensurePacketHasNonce, errorBadState } from "./utils.ts";

function handleAuthStep2(
  packet: AuthPacket,
  socket: WebSocket,
  client: Client,
) {
  // no good dummy auth thingy
  if (!(packet.data.token == "test :P")) {
    socket.close(CloseCode.BAD_AUTH, "Bad token");
    return;
  }
  console.log(
    "handleAuthStep2 triggered.. ight i will just pretend everything checks out :P",
  );
  client.state = CHATSTATE.AUTHENTICATED;
  client.profile = {
    id: randomUUID(),
    dname: "Glitchy :3c",
    uname: "glitchy",
    namespace: "amcalledglitchy.dev",
    ver: 1,
  };
  const okPacket: OkPacket = {
    op: Opcode.OK,
    data: {
      response_type: Opcode.AUTH,
      data: {
        profile: profileToFullUser(client.profile),
      },
    },
  };

  socket.send(serializePacket(okPacket));
}

export function handleAuthPacket(
  packet: AuthPacket,
  socket: WebSocket,
  client: Client,
) {
  if (!ensurePacketHasNonce(packet, socket, false)) {
    socket.close(CloseCode.BAD_AUTH, "Bad token");
    return;
  }
  switch (client.state) {
    case CHATSTATE.AUTHENTICATED: {
      errorBadState(packet, socket);
      return;
    }
    case CHATSTATE.JUST_CONNECTED: {
      handleAuthStep2(packet, socket, client);
      return;
    }
  }
}
