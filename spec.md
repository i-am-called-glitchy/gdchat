# Glitchy's Dumb Chat v1

(because wschat dosen't exist)

## Websocket application-layer close codes

close codes 4k-4999 are for private use so we can use these

- 4000 - Bad authorization, client supplied an invalid token.
- 4001 - Hard rate limit, client spammed too many requests. Server must in the
  close frame specify a close message in JSON, with a `retry_after` key in
  seconds.
- 4002 - Client does not have an extension that is absolutely required. Please
  don't do this if you don't have to.
- 4003 - Client did not authenticate quickly enough.

## About extensions

Extensions should advertise themselves cleanly, and if not required for the
connection they should not introduce breaking changes into the protocol. For
example:

Say there's a profile picture extension, to the [full user object](#full-user)
the extension would probably append a key like `avatar`, mirroring discord's
system (cmon you have to admit their api does work, may as well yoink some
ideas)

I intentionally didn't include base profile changes, permissions, etc..., that's
for either admin bots or extensions.

An extension object looks like this:

```json5
{ "name": "extname", "namespace": "extns", "major_ver": 1, "patch_ver": 2 }
```

A major version is a version that can break clients, patch versions are
bugfixes, adding optionally readable fields, etc... Namespaces could be author
names or organizations.

## About mentions

Mentions are when a message containing "<@user uuid>" is sent, in this case the
"mentions" field must be populated with the user's message.

To escape, the client should send "\<@user uuid>"

## About message collisions

In the event of two messages being sent at the same time the server should
implicitly rely on the database appending order. The server should broadcast to
clients in the same order that they were processed.

Of course, clients should render the messages in the order as recieved.

## Subscription types

Note: Subscription types are not case-sensitive

- none - Do not send any events from this channel
- ifmention - Only send messages if the user was mentioned in them.
- partial - Only send metadata of this message, omit content.
- partialifmention - Only send metadata of this message if mentioned, otherwise
  don't send.
- fullifmention - Normally do partial except if mentioned, send full.
- full - Send all data from this channel in events.
- default - This is a special case, the server should remove a channel-specific
  subscription. Invalid for SUB_DEFAULT, server should raise BAD_OP.

## Models

### Partial user

A partial user looks like this:

```json5
{ "id": "UUID HERE", "namespace": "amcalledglitchy.dev", "ver": 1 }
```

Note: Namespace exists because there can be multiple servers and this should
help with caching. If UUIDs are duplicated the client should properly
deduplicate by namespace. Version must be incremented for every profile update,
and logic basically becomes `if (cached.version < partial.version) refetch()`.
I'm not implementing federation into base, but y'all can cook that up with
extensions. Version should never decrement.

### Full user

```json5
{
  "id": "UUID HERE",
  "dname": "Display Name",
  "uname": "unique_name",
  "namespace": "amcalledglitchy.dev",
  "ver": 1
}
```

#### Display name restrictions:

- 1-40 characters
- Explicitly most visible Unicode characters allowed. The space character is an
  exception.
- No leading/trailing whitespace.
- Server is allowed to use custom logic to block lookalikes like U+0430 and
  U+0061.

Note: See [this](#invalid-category)

### Unique name restrictions:

- 3-32 characters
- Only characters allowed: `abcdefghijklmnopqrstuvwxyz_.1234567890`
- Must be unique globally
- Must not start nor end with a dot
- Two+ dots cannot be in a row.

Note: See [this](#invalid-category)

### Message object

```json5
{
  "user": {/* partial user object */},
  "channel": "UUID HERE",
  "id": "UUID HERE", // message id
  "content": "uwu? :3", // Do not include if the subscription level is partial or partial was specified in FETCH_HISTORY
  "timestamp": 1234, // in unix epoch milliseconds
  "mentions": [
    /* partial users here */
  ]
}
```

### Channel object

```json5
{
  "id": "UUID HERE",
  "name": "name-here",
  "description": ":3" /* Optional */
}
```

Channel name Restrictions:

- 3-50 characters
- Only characters allowed: `abcdefghijklmnopqrstuvwxyz_-.1234567890`
- Must start and end with an alphanumeric character.

### Notes

- S and C in the Direction column mean Server to client and Client to server
  respectively
- NR is an abbreviation for Nonce Required, which states whether whoever sent
  the message has to add a nonce parameter, which is just a random string
- In the NR field: x means no, ? means on some edge cases, clarified in
  description, + means yes
- A nonce is a randomly generated string the client sends alongside a packet so
  that the server can identify it with a reply and aid client implementations.

### Base packet:

```json5
{
  "op": "placeholder", // Packet type/opcode, i.e. ERROR, AUTH, etc…, must be treated as case-sensitive and always uppercase
  "data": { // Actual payload of the packet
    /* placeholder */
  },
  "nonce": null // if an S packet includes this, it's a reply to a packet the client sent with a nonce, if a C packet includes this, it's the nonce. This exists here to standardize the nonce key. Clients and servers should NEVER add nonce keys, including null, where not needed. This should never be reused in the socket's lifetime, or at least as rarely as possible. If the client wants to shoot themselves in the foot go ahead, an uuidv4 should be enough tbh.
}
```

### 1.1 Foundations (Table)

| Opcode   | Direction | NR | Description                                                                                 |
| -------- | --------- | -- | ------------------------------------------------------------------------------------------- |
| HELLO    | S         | x  | Sent by the server instantly on connection containing server info.                          |
| AUTH     | C         | +  | Sent by the client to authenticate the connection.                                          |
| OK       | S         | +  | Sent by the server in response to a client's request.                                       |
| ERROR    | S         | ?  | Sent by the server in case of a recoverable or ignorable error, i.e message failed to send. |
| CHANNELS | S         | x  | Sent by the server to indicate what channels are accessible to the user                     |

### 1.2 Foundations (Structure)

#### HELLO

```json5
{
  "data": {
    "name": "Dumb server lol", // Display name of the server
    "version": 1, // basically cosmetic for now
    "message_content_limit": 4000, // 2k or 4k work well
    "hard_message_length_limit": 6144, // How many bytes can the client send in one ws message before they get hard kicked. Set -1 if you're masochistic.
    "ext": [] // Array of extension objects, these are identifiers for extensions, like profile pictures, etc…
  }
}
```

Note: See [this](#about-extensions).

#### AUTH

```json5
{
  "data": {
    "token": "eyJh...omSE", // Authentication token the client got
    "ext": [] // Array of extension objects, extensions the client supports, this is to cooperate in case server wants to kick us with 4002
  }
}
```

Notes:

- If the client fails authentication, immediately close with 4000
  ([Relevant](#websocket-application-layer-close-codes)), do not send an error
  nor ready packet
- See [this](#about-extensions).

On success:

Send an [OK](#ok) packet with the following structure, and send a CHANNELS
packet.

Important: Send CHANNELS after OK.

```json5
{
  "response_type": "AUTH",
  "data": {
    "profile": {
      /* full profile */
    }
  }
}
```

See [user profile model](#full-user).

#### OK

```json5
{
  "response_type": "OPCODE",
  "data": {/* enforced per packet, nullable */}
}
```

Should be sent whenever a request succeeds. Properly document what each
response_type expects in the data field.

#### ERROR

```json5
{
  "data": {
    "msg": "oopsies, something happened", // optional
    "code": "SERVER/INTERNAL" // Error code.
  },
  "nonce": "placeholder" // only if the client sent a bad request, if it's a message initiated by the server don't include this.
}
```

Should be sent whenever a request fails.

Notes:

- Notation for code and category is `CATEGORY/CODE`, as in `GENERIC/PERMISSION`.
- If there is no relevant error code, fall back to `SERVER/INTERNAL`
- Category and Type are interchangable.

#### Error categories

| Name    | Explaination                                         |
| ------- | ---------------------------------------------------- |
| GENERIC | Should not be used except if the error is very niche |
| INVALID | To be used whenever the request is invalid.          |
| SERVER  | To be used whenever there's a server error.          |

#### GENERIC category

| Code            | Explaination                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| RATE_LIMIT_SOFT | To be used for a soft rate limit, decided by the server. Must attach the `retry_after` field in seconds. |
| PERMISSION      | User does not have the permissions needed to do the action they attempted.                               |

#### INVALID category

Note: If the client is referencing something they should not have access to,
like a channel that exists, but they don't have permissions to even see it,
return `INVALID/NOT_FOUND` for security reasons.

| Code                   | Explaination                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| NOT_FOUND              | A resource (like a channel, a message, etc..) was not found.                                                   |
| BAD_OP                 | The opcode the client used does not exist in the server's implementation, or the packet had malformed data.    |
| BAD_SUB_TYPE           | Client supplied a subscription type that dosen't even exist (not in [here](#subscription-types))               |
| EXCLUSIVE_BEFORE_AFTER | Client supplied both the before and after fields on FETCH_HISTORY                                              |
| EMPTY_MESSAGE          | Message content is empty or only whitespace                                                                    |
| MESSAGE_TOO_LONG       | Message content exceeds limit (specified in hello)                                                             |
| SAME_MSG_NONCE         | Server recieved multiple message with the same nonce but differing contents.                                   |
| BAD_STATE              | Client sent a packet that does not belong in the current state, i.e AUTH sent after successful authentication. |

#### SERVER category

| Code        | Explaination                                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INTERNAL    | Something went wrong in an annoying way. If this is a development enviroment feel free to attach undocumented data, but in prod keep it minimal.          |
| BAD_GATEWAY | Server you are connected to is acting as a reverse proxy. The underlying server behind the proxy has encountered an error and cannot handle your request. |

#### CHANNELS

Should be sent immediately after authentication succeeds. Can be sent at later
points, for example if the channel list updates mid-session.

```json5
{
  "data": {
    "channels": [/* Channel blobs */]
  }
}
```

### 2.1 Request/Response (Table)

| Opcode         | Direction | NR | Description                                                             |
| -------------- | --------- | -- | ----------------------------------------------------------------------- |
| SUB            | C         | +  | Client wants to subscribe to a specific channel.                        |
| SUB_DEFAULT    | C         | +  | Client wants to modify default subscription behaviour.                  |
| FETCH_HISTORY  | C         | +  | Client is requesting past messages of a channel.                        |
| FETCH_USER     | C         | +  | Client is requesting a user object.                                     |
| FETCH_USERS    | C         | +  | Client is requesting the user list in a channel.                        |
| FETCH_MESSAGE  | C         | +  | Client is requesting a specific message.                                |
| FETCH_CHANNEL  | C         | +  | Client is requesting a channel object.                                  |
| FETCH_CHANNELS | C         | +  | Client is requesting the available channels.                            |
| DELETE_MESSAGE | C         | +  | User wants to delete a message they sent or have permissions to delete. |
| SEND           | C         | +  | Client wants to send a message to a channel.                            |

### 2.1 Request/Response (Structure)

#### SUB

See [the subscription types](#subscription-types).

```json5
{
  "data": {
    "cid": "uuid here", // Channel id
    "type": "none|ifmention|partial|fullifmention|full" // Subscription type
  }
}
```

Return error `INVALID/NOT_FOUND` if the client cannot see the channel being
referenced or should not be able to. Return error `INVALID/BAD_SUB_TYPE` if the
type field does not match.

Server should reply with a plain OK otherwise.

#### SUB_DEFAULT

See [the subscription types](#subscription-types).

By default, the behavior should be to have type on full.

```json5
{
  "data": {
    "type": "none|ifmention|partial|fullifmention|full" // Subscription type
  }
}
```

Return error `INVALID/BAD_SUB_TYPE` if the type field does not match.

Server should reply with a plain OK otherwise.

#### FETCH_HISTORY

> try not to run into any memory issues while processing this client devs ;3
> (you're welcome for partial)

```json5
{
  "data": {
    "cid": "uuid here", // Channel id
    "limit": 50, // it is up to the server to impose sane limits
    "before": "uuid here", // message id, optional
    "after": "uuid here", // message id, optional
    "partial": true // optional, whether to omit content, default to false
  }
}
```

`before` and `after` should not be present, if this happens the server should
reject the request and return a `INVALID/EXCLUSIVE_BEFORE_AFTER` error. If the
channel can't be seen or does not exist return the `INVALID/NOT_FOUND` error.

Server should reply with a structured OK.

```json5
{
  "data": {
    "messages": [/* message blobs here */],
    "has_more_before": true, // Are there more messages before the oldest one?
    "has_more_after": false // Are there more messages after the newest one?
  }
}
```

Note: see [this](#message-object)

#### FETCH_USER

```json5
{
  "data": {
    "id": "UUID HERE"
  }
}
```

really simple packet lmao

Server should reply with a structured OK.

```json5
{
  "data": {
    "user": {/* profile blob */}
  }
}
```

Note: read [this](#full-user)

#### FETCH_USERS

```json5
{
  "data": {
    "channel": "UUID HERE",
    "full": true // False by default
  }
}
```

Server should reply with a structured OK.

```json5
{
  "data": {
    "users": [/* partial users if not full else full users */]
  }
}
```

Note: read [this](#partial-user) and [this](#full-user)

#### FETCH_MESSAGE

```json5
{
  "data": {
    "id": "UUID HERE"
  }
}
```

also a simple packet

Server should reply with a structured OK.

```json5
{
  "data": {
    "message": {/* message blob */}
  }
}
```

#### FETCH_CHANNEL

```json5
{
  "data": {
    "id": "UUID HERE"
  }
}
```

do I really have to say it?

Server should reply with a structured OK.

```json5
{
  "data": {
    "channel": {/* channel blob */}
  }
}
```

#### FETCH_CHANNELS

even simpler lmao just send the base packet

Server should reply with a structured OK.

```json5
{
  "data": {
    "channels": [{/* channel blobs */}]
  }
}
```

#### DELETE_MESSAGE

```json5
{
  "data": {
    "id": "UUID HERE" // message id
  }
}
```

Server should return the `GENERIC/PERMISSION` error if the message is not from
the user AND the user does not have administrator permissions. Otherwise, the
server should delete the message from the database (or just never send it again,
flag it in the db, and nobody would know ;3 (also useful for moderation ig)) and
give a base OK.

#### SEND

```json5
{
  "data": {
    "channel": "UUID HERE",
    "content": "hello :3",
    "msgnonce": "random" // Optional, client generates a random string
  }
}
```

The scope of msgnonce should be per-websocket, however the server should drop
them over time gradually if memory is a strict constraint.

If the channel does not exist or the user can't see it, return
`INVALID/NOT_FOUND`, if the message is blank except for whitespace, return
`INVALID/EMPTY_MESSAGE`, if the message is too long, return
`INVALID/MESSAGE_TOO_LONG`. If the server gets multiple SEND packets with the
same msgnonce but differing contents, the server should return the error
`INVALID/SAME_MSG_NONCE`

Otherwise, the server should respond with a structured OK.

```json5
{
  "data": {
    "result_id": "UUID HERE", // UUID of sent message.
    "duplicate": false // True if the nonce matches
  }
}
```

Server should also send the resulting MSG packet to the client, and to all
subscribed clients watching the channel, (of course obeying
[subscription types](#subscription-types))

Read [this](#about-mentions) and [this](#about-message-collisions).

### 3.1 Events (Table)

| Opcode | Direction | NR | Description                                                               |
| ------ | --------- | -- | ------------------------------------------------------------------------- |
| MSG    | S         | x  | New message has arrived in a channel the client's user has access to.     |
| DELETE | S         | x  | A message has been deleted in a channel the client's user has access to.` |

### 3.2 Events (Structure)

#### MSG

Read [this](#subscription-types).

```json5
{ "data": {/* message object */} }
```

Note: See [this](#partial-user) and [this](#message-object) and
[this](#about-message-collisions).

#### DELETE

```json5
{ "data": {"id":  "UUID HERE"} }
```

Client should remove this message from being rendered.
