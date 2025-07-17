import type { Request, Response, NextFunction } from "express";
import { MerchantRpc } from "porto/server";

export const createPortoMiddleware = (handler: ReturnType<typeof MerchantRpc.requestHandler>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Convert Express request to Fetch Request format
      const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

      // Create headers object
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (value !== undefined) {
          headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        }
      });

      // Create body
      let body: string | undefined;
      if (req.body) {
        body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      }

      // Create Fetch Request object
      const fetchRequest = new Request(url, {
        method: req.method,
        headers,
        body,
      });

      // Call the Porto RequestHandler
      const response = await handler(fetchRequest);

      // Apply the response to Express
      res.status(response.status);

      // Set headers
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // Send body
      const responseBody = await response.text();
      res.send(responseBody);
    } catch (error) {
      console.error("Porto middleware error:", error);
      next(error);
    }
  };
};
