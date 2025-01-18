import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { user } from "../../../entity/user.js";

const User: FastifyPluginAsync = async (fastify, _opts): Promise<void> => {
  /**
   * login
   */
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/login",
    schema: {
      tags: ["user"],
      summary: "login",
      body: z.object({
        userName: z.string().describe("user name"),
        passWord: z.string().describe("password"),
      }),
      response: {
        200: z.object({
          data: z.string(),
          message: z.string(),
          statuscode: z.number().default(200),
        }),
      },
    },
    handler: async (req, res) => {
      let returnResult = {
        data: "",
        message: "login failed",
        statuscode: 200,
      };
      const userRepository = req.server.orm.getRepository(user);
      const _userObj = await userRepository.findOne({
        where: { username: req.body.userName },
      });
      if (!_userObj) {
        returnResult.message = "user not found";
        res.status(403).send(returnResult);
        return;
      }
      const decryptedPwd = req.server.encryptedAES(
        req.body.passWord,
        _userObj.salt
      );
      if (decryptedPwd !== _userObj.pwd) {
        returnResult.message = "password error";
        res.status(403).send(returnResult);
        return;
      }
      const token = await res.jwtSign({
        username: _userObj.username,
        email: _userObj.email,
      });

      returnResult.message = "login success";
      returnResult.data = token;
      res.send(returnResult);
    },
  });

  /**
   * get user info
   */
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/getUserInfo",
    schema: {
      tags: ["user"],
      summary: "get user info",
      authorization: true,
      response: {
        200: z.object({
          data: z.any(),
          message: z.string(),
          statuscode: z.number().default(200),
        }),
      },
    },
    preHandler: fastify.verifyToken,
    handler: async (req, res) => {
      let returnResult = {
        data: {},
        message: "get user info failed",
        statuscode: 200,
      };
      if (req && req.user) {
        returnResult.message = "get user info success";
        returnResult.data = {
          username: (req.user as any).username,
          email: (req.user as any).email,
        };
      }
      res.send(returnResult);
    },
  });
};

export default User;
