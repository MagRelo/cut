import { Hono } from "hono";
import { handlePaymasterRpc } from "../services/paymaster/handlePaymasterRpc.js";

const paymasterRouter = new Hono();

paymasterRouter.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error" },
    });
  }
  return c.json(await handlePaymasterRpc(body));
});

export default paymasterRouter;
