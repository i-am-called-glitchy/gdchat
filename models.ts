import { UUID } from "node:crypto";

export interface Profile {
  id: UUID;
  dname: string;
  uname: string;
  namespace: string;
  ver: number;
}

export enum CHATSTATE {
  JUST_CONNECTED,
  AUTHENTICATED,
}

export enum SUBSTATE {
  NONE = "NONE",
  IFMENTION = "IFMENTION",
  PARTIAL = "PARTIAL",
  PARTIALIFMENTION = "PARTIALIFMENTION",
  FULLIFMENTION = "FULLIFMENTION",
  FULL = "FULL",
}

export enum MSG_BROADCAST_TYPE {
  NONE,
  PARTIAL,
  FULL,
}

export interface Client {
  socket: WebSocket;
  profile?: Profile;
  state: CHATSTATE;
  clientid?: UUID;
  subscriptions: SubMap;
  default_sub: SUBSTATE;
}

export interface Channel {
  id: UUID;
  name: string;
  description?: string;
}

export interface AuthSuccess {
  success: boolean;
  profile?: Profile;
}

export type ClientMap = Map<WebSocket, Client>;
export type SubMap = Map<UUID, SUBSTATE>;
export type ChannelMap = Map<string, Channel>;
