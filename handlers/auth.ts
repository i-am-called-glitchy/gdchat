import { ChannelMap, CHATSTATE, Client, Profile } from "../models.ts";
import {
  AuthPacket,
  ChannelsPacket,
  CloseCode,
  OkPacket,
  Opcode,
  profileToFullUser,
  serializePacket,
} from "../protocol.ts";
import { ensurePacketHasNonce, errorBadState } from "./utils.ts";

const testTokens: Map<string, Profile> = new Map();
// ! Take this out in prod
testTokens.set("glitchy", {
  id: "00000000-0000-0000-0000-000000000000",
  dname: "Glitchy :3c",
  uname: "glitchy",
  namespace: "amcalledglitchy.dev",
  ver: 1,
});

testTokens.set("testGlitch", {
  id: "00000000-0000-0000-0000-000000000001",
  dname: "testGlitch :P",
  uname: "owo",
  namespace: "amcalledglitchy.dev",
  ver: 1,
});

function handleAuthStep2(
  packet: AuthPacket,
  socket: WebSocket,
  client: Client,
  channels: ChannelMap,
) {
  // no good dummy auth thingy
  client.profile = testTokens.get(packet.data.token);
  if (!client.profile) {
    socket.close(CloseCode.BAD_AUTH, "Bad token");
    return;
  }
  console.log(
    "handleAuthStep2 triggered.. ight i will just pretend everything checks out :P",
  );
  client.state = CHATSTATE.AUTHENTICATED;
  sendPostAuthPackets(socket, client, packet, channels);
}

function sendPostAuthPackets(
  socket: WebSocket,
  client: Client,
  packet: AuthPacket,
  channels: ChannelMap,
) {
  const okPacket: OkPacket = {
    op: Opcode.OK,
    nonce: packet.nonce,
    data: {
      response_type: Opcode.AUTH,
      data: {
        profile: profileToFullUser(
          client.profile!,
        ), /* trust me ts, this shit aint nully */
      },
    },
  };

  const channelsPacket: ChannelsPacket = {
    op: Opcode.CHANNELS,
    data: {
      channels: channels.values().toArray(),
    },
  };

  socket.send(serializePacket(okPacket));
  socket.send(serializePacket(channelsPacket));
}

export function handleAuthPacket(
  packet: AuthPacket,
  socket: WebSocket,
  client: Client,
  channels: ChannelMap,
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
      handleAuthStep2(packet, socket, client, channels);
      return;
    }
  }
}
