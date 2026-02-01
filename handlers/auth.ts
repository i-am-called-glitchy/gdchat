import {CHATSTATE, Client, Profile} from "../models.ts";
import {
  AuthPacket,
  CloseCode,
  OkPacket,
  Opcode,
  profileToFullUser,
  serializePacket,
} from "../protocol.ts";
import { ensurePacketHasNonce, errorBadState } from "./utils.ts";

const testTokens: Map<string, Profile> = new Map();
// ! Take this out in prod
testTokens.set("glitchy",{
    id: "00000000-0000-0000-0000-00000000000",
    dname: "Glitchy :3c",
    uname: "glitchy",
    namespace: "amcalledglitchy.dev",
    ver: 1})

testTokens.set("testGlitch", {
  id: "00000000-0000-0000-0000-00000000001",
  dname: "testGlitch :P",
  uname: "owo",
  namespace: "amcalledglitchy.dev",
  ver: 1})

function handleAuthStep2(
  packet: AuthPacket,
  socket: WebSocket,
  client: Client,
) {
  // no good dummy auth thingy
  client.profile = testTokens.get(packet.data.token)
  if (!client.profile) {
    socket.close(CloseCode.BAD_AUTH, "Bad token");
    return;
  }
  console.log(
    "handleAuthStep2 triggered.. ight i will just pretend everything checks out :P",
  );
  client.state = CHATSTATE.AUTHENTICATED;

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
