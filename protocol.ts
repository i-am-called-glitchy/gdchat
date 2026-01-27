// deno-lint-ignore-file

import { Profile } from "./models.ts";

export enum CloseCode {
  BAD_AUTH = 4000,
  RATE_LIMIT = 4001,
  MISSING_EXT = 4002,
  AUTH_TIMEOUT = 4003,
}

export enum Opcode {
  // Server to Client
  HELLO = "HELLO",
  OK = "OK",
  ERROR = "ERROR",
  CHANNELS = "CHANNELS",
  MSG = "MSG",

  // Client to Server
  AUTH = "AUTH",
  SUB = "SUB",
  SUB_DEFAULT = "SUB_DEFAULT",
  FETCH_HISTORY = "FETCH_HISTORY",
  FETCH_USER = "FETCH_USER",
  FETCH_USERS = "FETCH_USERS",
  FETCH_MESSAGE = "FETCH_MESSAGE",
  FETCH_CHANNEL = "FETCH_CHANNEL",
  FETCH_CHANNELS = "FETCH_CHANNELS",
  DELETE_MESSAGE = "DELETE_MESSAGE",
  SEND = "SEND",
}

export enum ErrorCategory {
  GENERIC = "GENERIC",
  INVALID = "INVALID",
  SERVER = "SERVER",
}

export const ErrorCodes = {
  GENERIC: {
    OVERLOADED: "OVERLOADED",
    RATE_LIMIT_SOFT: "RATE_LIMIT_SOFT",
    PERMISSION: "PERMISSION",
  },
  INVALID: {
    NOT_FOUND: "NOT_FOUND",
    BAD_OP: "BAD_OP",
    BAD_SUB_TYPE: "BAD_SUB_TYPE",
    EXCLUSIVE_BEFORE_AFTER: "EXCLUSIVE_BEFORE_AFTER",
    EMPTY_MESSAGE: "EMPTY_MESSAGE",
    MESSAGE_TOO_LONG: "MESSAGE_TOO_LONG",
    SAME_MSG_NONCE: "SAME_MSG_NONCE",
    BAD_STATE: "BAD_STATE",
  },
  SERVER: {
    INTERNAL: "INTERNAL",
    BAD_GATEWAY: "BAD_GATEWAY",
    NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  },
} as const;

export type SubscriptionType =
  | "none"
  | "ifmention"
  | "partial"
  | "fullifmention"
  | "full";

export interface Extension {
  name: string;
  namespace: string;
  major_ver: number;
  patch_ver: number;
}

export interface PartialUser {
  id: string;
  namespace: string;
  ver: number;
}

export interface FullUser extends PartialUser {
  dname: string;
  uname: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
}

export interface Message {
  user: PartialUser;
  channel: string;
  id: string;
  content?: string;
  timestamp: number;
  mentions: PartialUser[];
}

export interface IdPayload {
  id: string;
}
export type EmptyPayload = Record<string, never>;

export interface HelloPayload {
  name: string;
  version: number;
  message_content_limit: number;
  hard_message_length_limit: number;
  ext: Extension[];
}

export interface ErrorPayload {
  msg?: string;
  code: string;
  type: string;
}

export interface ChannelsPayload {
  channels: Channel[];
}

export type MsgPayload = Message;

export interface OkPayloadBase<T = any> {
  response_type: Opcode;
  data: T;
}

export interface AuthOkData {
  profile: FullUser;
}
export interface FetchHistoryOkData {
  messages: Message[];
  has_more_before: boolean;
  has_more_after: boolean;
}
export interface FetchUserOkData {
  user: FullUser;
}
export interface FetchUsersOkData {
  users: (FullUser | PartialUser)[];
}
export interface FetchMessageOkData {
  message: Message;
}
export interface FetchChannelOkData {
  channel: Channel;
}
export interface SendOkData {
  result_id: string;
  duplicate: boolean;
}

export interface AuthPayload {
  token: string;
  ext: Extension[];
}

export interface SubPayload {
  cid: string;
  type: SubscriptionType;
}

export interface SubDefaultPayload {
  type: SubscriptionType;
}

export interface FetchHistoryPayload {
  cid: string;
  limit: number;
  before?: string;
  after?: string;
  partial?: boolean;
}

export interface FetchUsersPayload {
  channel: string;
  full?: boolean;
}

export interface SendPayload {
  channel: string;
  content: string;
  msgnonce?: number;
}

/**
 * To extend the protocol:
 * 1. Add Opcode to Enum.
 * 2. Add Payload Interface (if new).
 * 3. Map Opcode to Payload here.
 */
export interface ProtocolDefinitions {
  // S -> C
  [Opcode.HELLO]: HelloPayload;
  [Opcode.OK]: OkPayloadBase;
  [Opcode.ERROR]: ErrorPayload;
  [Opcode.CHANNELS]: ChannelsPayload;
  [Opcode.MSG]: MsgPayload;

  // C -> S
  [Opcode.AUTH]: AuthPayload;
  [Opcode.SUB]: SubPayload;
  [Opcode.SUB_DEFAULT]: SubDefaultPayload;
  [Opcode.FETCH_HISTORY]: FetchHistoryPayload;
  [Opcode.FETCH_USERS]: FetchUsersPayload;
  [Opcode.SEND]: SendPayload;
  [Opcode.FETCH_CHANNELS]: EmptyPayload;

  // Reused ID Payloads
  [Opcode.FETCH_USER]: IdPayload;
  [Opcode.FETCH_MESSAGE]: IdPayload;
  [Opcode.FETCH_CHANNEL]: IdPayload;
  [Opcode.DELETE_MESSAGE]: IdPayload;
}

export interface BasePacket<T> {
  op: Opcode;
  data: T;
  nonce?: string | null;
}

export type Packet<T extends Opcode> = BasePacket<ProtocolDefinitions[T]> & {
  op: T;
};

export type AnyPacket = { [K in Opcode]: Packet<K> }[Opcode];

export type HelloPacket = Packet<Opcode.HELLO>;
export type ErrorPacket = Packet<Opcode.ERROR>;
export type ChannelsPacket = Packet<Opcode.CHANNELS>;
export type MsgPacket = Packet<Opcode.MSG>;
export type OkPacket = Packet<Opcode.OK>;

export type AuthPacket = Packet<Opcode.AUTH>;
export type SubPacket = Packet<Opcode.SUB>;
export type SubDefaultPacket = Packet<Opcode.SUB_DEFAULT>;
export type FetchHistoryPacket = Packet<Opcode.FETCH_HISTORY>;
export type FetchUserPacket = Packet<Opcode.FETCH_USER>;
export type FetchUsersPacket = Packet<Opcode.FETCH_USERS>;
export type FetchMessagePacket = Packet<Opcode.FETCH_MESSAGE>;
export type FetchChannelPacket = Packet<Opcode.FETCH_CHANNEL>;
export type FetchChannelsPacket = Packet<Opcode.FETCH_CHANNELS>;
export type DeleteMessagePacket = Packet<Opcode.DELETE_MESSAGE>;
export type SendPacket = Packet<Opcode.SEND>;

export class ProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolError";
  }
}

function isValidPacketStructure(obj: any): obj is BasePacket<any> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.op === "string" &&
    Object.values(Opcode).includes(obj.op as Opcode)
  );
}

export function parsePacket(raw: string): AnyPacket {
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch (_e) {
    throw new ProtocolError("Malformed JSON");
  }

  if (!isValidPacketStructure(json)) {
    throw new ProtocolError("Invalid packet structure or unknown Opcode");
  }

  return json as AnyPacket;
}

export function serializePacket(packet: AnyPacket): string {
  return JSON.stringify(packet, null, 2);
}

export function normalizeUUID(uuid: string): string {
  const cleaned = uuid.replace(/[^a-fA-F0-9]/g, ""); // remove non-hex
  if (cleaned.length !== 32) throw new Error("Invalid UUID");
  return [
    cleaned.slice(0, 8),
    cleaned.slice(8, 12),
    cleaned.slice(12, 16),
    cleaned.slice(16, 20),
    cleaned.slice(20),
  ].join("-").toLowerCase();
}

export function profileToPartialUser(profile: Profile): PartialUser {
  return {
    id: profile.id,
    namespace: profile.namespace,
    ver: profile.ver,
  };
}

export function profileToFullUser(profile: Profile): FullUser {
  return {
    id: profile.id,
    namespace: profile.namespace,
    ver: profile.ver,
    dname: profile.dname,
    uname: profile.uname,
  };
}

export function createOkPacket<T>(
  responseOp: Opcode,
  data: T,
  replyNonce?: string | null,
): OkPacket {
  return {
    op: Opcode.OK,
    data: {
      response_type: responseOp,
      data: data,
    },
    nonce: replyNonce || null,
  };
}

export function createErrorPacket(
  category: ErrorCategory,
  code: string,
  msg?: string | undefined,
  replyNonce?: string | null,
): ErrorPacket {
  return {
    op: Opcode.ERROR,
    data: {
      type: `${category}/${code}`,
      code: code,
      msg: msg,
    },
    nonce: replyNonce || null,
  };
}
