import { Channel, Client } from "./models.ts";
import { serve } from "./webserver.ts";

const clients = new Map<WebSocket, Client>();
const channels = new Map<string, Channel>();
channels.set("704a72d7-a43b-44ce-90a5-e0d0f13ea50f", {
  id: "704a72d7-a43b-44ce-90a5-e0d0f13ea50f",
  name: "test",
});

serve(clients, channels);
