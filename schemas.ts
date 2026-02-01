import { z } from "npm:zod";
import { SUBSTATE } from "./models.ts";
import * as Protocol from "./protocol.ts";


export const ExtensionSchema = z.object({
    name: z.string(),
    namespace: z.string(),
    major_ver: z.number(),
    patch_ver: z.number(),
});


export const AuthPayloadSchema = z.object({
    token: z.string(),
    ext: z.array(ExtensionSchema),
});

const CaseInsensitiveSubState = z.preprocess(
    (val) => (typeof val === "string" ? val.toUpperCase() : val),
    z.enum(SUBSTATE)
);

export const SubPayloadSchema = z.object({
    cid: z.string(),
    type: CaseInsensitiveSubState,
});

export const SubDefaultPayloadSchema = z.object({
    type: CaseInsensitiveSubState,
});
export const SendPayloadSchema = z.object({
    channel: z.string(),
    content: z.string(),
    msgnonce: z.number().optional(),
});

export const FetchHistoryPayloadSchema = z.object({
    cid: z.string(),
    limit: z.number().max(100),
    before: z.string().optional(),
    after: z.string().optional(),
    partial: z.boolean().optional(),
});

export const FetchUsersPayloadSchema = z.object({
    channel: z.string(),
    full: z.boolean().optional(),
});

export const IdPayloadSchema = z.object({
    id: z.string(),
});

export const EmptyPayloadSchema = z.record(z.string(), z.never());

// --- Packet Schemas ---

const BasePacketSchema = z.object({
    nonce: z.string().nullable().optional(),
});

export const AuthPacketSchema = BasePacketSchema.extend({
    op: z.literal(Protocol.Opcode.AUTH),
    data: AuthPayloadSchema,
});

export const SendPacketSchema = BasePacketSchema.extend({
    op: z.literal(Protocol.Opcode.SEND),
    data: SendPayloadSchema,
});

export const SubPacketSchema = BasePacketSchema.extend({
    op: z.literal(Protocol.Opcode.SUB),
    data: SubPayloadSchema,
});

export const SubDefaultPacketSchema = BasePacketSchema.extend({
    op: z.literal(Protocol.Opcode.SUB_DEFAULT),
    data: SubDefaultPayloadSchema,
});

export const FetchHistoryPacketSchema = BasePacketSchema.extend({
    op: z.literal(Protocol.Opcode.FETCH_HISTORY),
    data: FetchHistoryPayloadSchema,
});

export const FetchUsersPacketSchema = BasePacketSchema.extend({
    op: z.literal(Protocol.Opcode.FETCH_USERS),
    data: FetchUsersPayloadSchema,
});

export const FetchUserPacketSchema = BasePacketSchema.extend({
    op: z.literal(Protocol.Opcode.FETCH_USER),
    data: IdPayloadSchema,
});

export const FetchMessagePacketSchema = BasePacketSchema.extend({
    op: z.literal(Protocol.Opcode.FETCH_MESSAGE),
    data: IdPayloadSchema,
});

export const FetchChannelPacketSchema = BasePacketSchema.extend({
    op: z.literal(Protocol.Opcode.FETCH_CHANNEL),
    data: IdPayloadSchema,
});

export const FetchChannelsPacketSchema = BasePacketSchema.extend({
    op: z.literal(Protocol.Opcode.FETCH_CHANNELS),
    data: EmptyPayloadSchema.optional().default({}), // Handle empty payload gracefully
});

export const DeleteMessagePacketSchema = BasePacketSchema.extend({
    op: z.literal(Protocol.Opcode.DELETE_MESSAGE),
    data: IdPayloadSchema,
});

export const DeletePacketSchema = BasePacketSchema.extend({
    op: z.literal(Protocol.Opcode.DELETE),
    data: IdPayloadSchema,
});


export const ClientPacketSchema = z.discriminatedUnion("op", [
    AuthPacketSchema,
    SendPacketSchema,
    SubPacketSchema,
    SubDefaultPacketSchema,
    FetchHistoryPacketSchema,
    FetchUsersPacketSchema,
    FetchUserPacketSchema,
    FetchMessagePacketSchema,
    FetchChannelPacketSchema,
    FetchChannelsPacketSchema,
    DeleteMessagePacketSchema,
    DeletePacketSchema,
]);

export type ClientPacket = z.infer<typeof ClientPacketSchema>;