import type { FastifyPluginAsync, FastifyInstance } from "fastify";
import { z } from "zod";
import fs from "fs";
import * as path from "node:path";
import http from "node:http";
import { pino } from "pino";

const logger = pino({
  level: "info",
  timestamp: () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const milliseconds = now.getMilliseconds().toString().padStart(3, "0");
    const paddedMilliseconds = milliseconds.padEnd(6, "0");
    return `,"timestamp":"${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${paddedMilliseconds}"`;
  },
  base: undefined,
});

const root: FastifyPluginAsync = async (fastify, _opts): Promise<void> => {
  fastify.get("/healthcheck", async (request, reply) => {
    const options = {
      host: "localhost",
      port: process.env.PORT || 3691,
      timeout: 2000,
      path: "/api/ping",
    };

    return new Promise<void>((resolve, reject) => {
      const req = http.request(options, (res) => {
        logger.info(`Healthcheck status code: ${res.statusCode}`);

        if (res.statusCode === 200) {
          reply.status(200).send({ status: "ok" });
          resolve();
        } else {
          reply.status(503).send({ status: "service unavailable" });
          reject(new Error("Service Unavailable"));
        }
      });

      req.on("error", (err) => {
        logger.error(err);
        reply
          .status(503)
          .send({ status: "service unavailable", error: err.message });
        reject(err);
      });

      req.end();
    });
  });

  fastify.get(
    "/version",
    {
      schema: {
        tags: ["default"],
        response: {
          200: z.object({
            data: z.string(),
            message: z.string(),
            statuscode: z.number().default(200),
          }),
        },
      },
    },
    async () => {
      const filePath = path.join(process.cwd(), "package.json");
      const packageJson = await fs.promises.readFile(filePath, "utf8");
      const packageData = JSON.parse(packageJson);
      return {
        statuscode: 200,
        message: "success",
        data: packageData.version,
      };
    }
  );

  fastify.get(
    "/guid",
    {
      schema: {
        tags: ["default"],
        response: {
          200: z.object({
            data: z.string(),
            message: z.string(),
            statuscode: z.number().default(200),
          }),
        },
      },
    },
    async (req, res) => {
      const guid = req.server.getGuid();
      return {
        statuscode: 200,
        message: "success",
        data: guid,
      };
    }
  );

  fastify.get(
    "/generateSalt",
    {
      schema: {
        tags: ["default"],
        response: {
          200: z.object({
            data: z.string(),
            message: z.string(),
            statuscode: z.number().default(200),
          }),
        },
      },
    },
    async (req, res) => {
      const salt = req.server.generateSalt();
      return {
        statuscode: 200,
        message: "success",
        data: salt,
      };
    }
  );

  fastify.get(
    "/generateScretKey",
    {
      schema: {
        tags: ["default"],
        response: {
          200: z.object({
            data: z.string(),
            message: z.string(),
            statuscode: z.number().default(200),
          }),
        },
      },
    },
    async (req, res) => {
      const scretKey = req.server.generateKey();
      return {
        statuscode: 200,
        message: "success",
        data: scretKey,
      };
    }
  );

  fastify.post(
    "/generateSign",
    {
      schema: {
        tags: ["default"],
        body: z.object({
          params: z.any(),
          salt: z.string().describe("salt"),
          timestamp: z.coerce.number().describe("timestamp"),
        }),
        response: {
          200: z.object({
            data: z.string(),
            message: z.string(),
            statuscode: z.number().default(200),
          }),
        },
      },
    },
    async (req, res) => {
      const params = (req.body as any).params;
      const salt = (req.body as any).salt;
      const timestamp = (req.body as any).timestamp;
      const sign = req.server.generateSign(params, salt, timestamp);
      return {
        statuscode: 200,
        message: "success",
        data: sign,
      };
    }
  );

  fastify.post(
    "/encryptedAES",
    {
      schema: {
        tags: ["default"],
        body: z.object({
          originalTxt: z.string().describe("original text"),
          key: z.string().describe("secret key"),
        }),
        response: {
          200: z.object({
            data: z.string(),
            message: z.string(),
            statuscode: z.number().default(200),
          }),
        },
      },
    },
    async (req, res) => {
      const originalTxt = (req.body as any).originalTxt;
      const key = (req.body as any).key;
      const encryptedHex = req.server.encryptedAES(originalTxt, key);
      return {
        statuscode: 200,
        message: "success",
        data: encryptedHex,
      };
    }
  );

  fastify.post(
    "/decryptedAES",
    {
      schema: {
        tags: ["default"],
        body: z.object({
          encryptedTxt: z.string().describe("scret text"),
          key: z.string().describe("scret key"),
        }),
        response: {
          200: z.object({
            data: z.string(),
            message: z.string(),
            statuscode: z.number().default(200),
          }),
        },
      },
    },
    async (req, res) => {
      const encryptedTxt = (req.body as any).encryptedTxt;
      const key = (req.body as any).key;
      const decryptedText = req.server.decryptedAES(encryptedTxt, key);
      return {
        statuscode: 200,
        message: "success",
        data: decryptedText,
      };
    }
  );
};

export default root;
