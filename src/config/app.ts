import * as path from "node:path";
import * as fs from "fs";
import { fileURLToPath } from "node:url";
import AutoLoad, { type AutoloadPluginOptions } from "@fastify/autoload";
//import formBody, { type FastifyFormbodyOptions } from "@fastify/formbody";
import fastifyMultipart, {
  type FastifyMultipartAttachFieldsToBodyOptions,
} from "@fastify/multipart";
import { DataSource } from "typeorm";
import typeOrmFastifyPlugin from "typeorm-fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import env_con from "./env.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entitiesDir = path.join(path.dirname(__dirname), "entity");

const env = process.env.SOLVELY_PUB_ENV || "local";

async function loadModule(
  moduleDir: string,
  type: string,
  fileName: string
): Promise<any[]> {
  const arr: any[] = [];
  const files = fs.readdirSync(moduleDir);

  for (const file of files) {
    if (fileName === file) {
      const obj = await import(path.join(moduleDir, file));
      arr.push(obj.default);
      break;
    }
    // Check if the file is a .ts file
    if (file.endsWith(".js")) {
      // Use dynamic import to import the file
      const modules = await import(path.join(moduleDir, file));
      // Iterate over all exports of the module and add to the entities array
      Object.keys(modules).forEach((key) => {
        if (typeof modules[key] === type) {
          arr.push(modules[key]);
        }
      });
    }
  }

  return arr;
}

export type AppOptions = {
  // Place your custom options for app below here.
} & Partial<AutoloadPluginOptions>;

// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {};

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  // Place here your custom code!

  //fastify.register<FastifyFormbodyOptions>(formBody);

  fastify.register(cors, {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  });
  
  fastify.register(jwt, {
    secret: 'jwt_secret', // Replace with your secret key
    sign: {
      expiresIn: '1h' // Set token expiration time
    }
  });

  fastify.register<FastifyMultipartAttachFieldsToBodyOptions>(
    fastifyMultipart,
    {
      attachFieldsToBody: true,
    }
  );

  const entities = await loadModule(entitiesDir, "function", "");
  const connection = new DataSource({
    ...(env_con as any)[env].mysqlConn,
    ...{
      entities: entities,
    },
  });

  fastify.register(typeOrmFastifyPlugin.default, {
    connection: connection,
  });

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
    options: opts,
    forceESM: true,
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "../routes"),
    options: Object.assign({ prefix: "/api" }, opts),
    forceESM: true,
  });
};

export default app;
export { app, options };
