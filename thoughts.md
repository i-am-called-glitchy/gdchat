for reference: + is incoming, - is outgoing, diff blocks represent messages

allright so ofc i had a stateful impl idea

ok so for auth:

seperate service does whatever, gives a jwt with a short expiry which can be
used to connect to the websocket

like:

```diff
+ HELLO <some server info block ill finalize later>
- AUTH <jwt>
+ OK <profile blob>
```

if auth fails just close

i cannot be assed to implement SCRAM again so wss:// will be mandatory, not
exactly insecure lmao

how should the jwt be structured tho? maybe like:

```jsonc
{
  /* fill in both iat and exp here */ "service": "gdchat:wsv1",
  "uid": "UUID-HERE"
}
```

about user types, i kinda had an idea where like:

- 0 (Default) - Normal user, nothing special
- 1 - System
- 2 - Bot

uhh whatever

ok so how will messages actually be sent

so what if we have like:

```diff
- SEND {"channel": "UUID-HERE", "content": "meow", "nonce": "random stuff"}
```

hard cap random nonce to smth like 32 characters, nonce basically exists so that
if the client has shit internet and keeps retrying, but the message is already
sent, server drops the packet

how do we get messages from the server to client tho

allright so idea: what about an intents system, like:

```diff
- SUB UUID-HERE 2
+ SETSUB UUID-HERE 2
```

where:

- 0 - Send no notifications. (useful for large servers (this wont be an issue
  lol sadly but yk))
- 1 - Send bodyless notifications. (probs useful for clients dealing with high
  volume)
- 2 (Default) - Send full notifications. (useful for if you're focusing on a
  channel)

we should probably add a setting to change the default, as in smth like:

```diff
- SUB DEFAULT 0
```

and then we get messages like:

```diff
+ MSG {"id": "MESSAGE UUID HERE", "cid": "CHANNEL UUID HERE", "profile": {/* profile blob from the handshake */}, "content": "content here!"}
```

if sub type is 1, explicitly set "no_content": true

yeah the profile blob should be one centralized model.

this should be the basics ig

or, hear me out: where a profile is refernced have an object like this:

```jsonc
{ "pref": { "id": "UUID-HERE", "hash": "hash of profile data" } }
```

this should help clients in caching shit

actually we also need an error system, not like wschat's garbage one, but smth
better ig, what about:

```diff
- SUB UUID-OF-A-CHANNEL-WE-DONT-OWN 2
+ !<error code>\0User does not have permission to view this channel!\0SUB UUID-OF-A-CHANNEL-WE-DONT-OWN 2
```

hmm wait no we gotta do some restructuring lol

what about having each packet as a json blob, like:

```jsonc
{
  "type": "op",
  "op": "MSG",
  "oppayload": {
    "id": "MESSAGE UUID HERE",
    "cid": "CHANNEL UUID HERE",
    "profile": {/* profile blob from the handshake */},
    "content": "content here!"
  }
}
```
