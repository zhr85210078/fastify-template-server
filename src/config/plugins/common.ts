import fp from "fastify-plugin";
import * as CryptoJS from "crypto-js";
import type { FastifyRequest, FastifyReply } from "fastify";

// biome-ignore lint/complexity/noBannedTypes: This is just an example
export type CommonPluginOptions = {};

const addTo16 = (text: string) => {
  const textCode = CryptoJS.default.enc.Utf8.parse(text);
  let add;
  if (textCode.sigBytes % 16 === 0) {
    add = 0;
  } else {
    add = 16 - (textCode.sigBytes % 16);
  }
  for (let i = 0; i < add; i++) {
    text += "\0";
  }
  return text;
};

// The use of fastify-plugin is required to be able
// to export the decorators to the outer scope
export default fp<CommonPluginOptions>(async (fastify) => {
  fastify.decorate("getGuid", () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
  );

  fastify.decorate("generateSalt", () => {
    return CryptoJS.default.lib.WordArray.random(16).toString(
      CryptoJS.default.enc.Hex
    );
  });

  fastify.decorate("generateKey", () => {
    return CryptoJS.default.lib.WordArray.random(8).toString(
      CryptoJS.default.enc.Hex
    );
  });

  fastify.decorate(
    "generateSign",
    (params: object, salt: string, timestamp: number) => {
      let source = Object.keys(params)
        .map(function (key) {
          return key + "=" + (params as any)[key];
        })
        .join("&");
      source += salt + timestamp;
      const sign = CryptoJS.default.MD5(source).toString();
      return sign;
    }
  );

  fastify.decorate("encryptedAES", (text: string, key: string) => {
    const parseText = addTo16(text);
    const cryptoKey = CryptoJS.default.enc.Utf8.parse(key);
    const AES_IV = CryptoJS.default.enc.Utf8.parse(key.substring(0, 16));
    const encrypted = CryptoJS.default.AES.encrypt(parseText, cryptoKey, {
      iv: AES_IV,
      mode: CryptoJS.default.mode.CBC,
      padding: CryptoJS.default.pad.NoPadding,
    });
    const encryptedHex = encrypted.ciphertext.toString(
      CryptoJS.default.enc.Hex
    );
    return encryptedHex;
  });

  fastify.decorate("decryptedAES", (encryptedHex: string, key: string) => {
    const cryptoKey = CryptoJS.default.enc.Utf8.parse(key);
    const encryptedWordArray = CryptoJS.default.enc.Hex.parse(encryptedHex);
    const cipherParams = CryptoJS.default.lib.CipherParams.create({
      ciphertext: encryptedWordArray,
    });
    const AES_IV = CryptoJS.default.enc.Utf8.parse(key.substring(0, 16));
    const decrypted = CryptoJS.default.AES.decrypt(cipherParams, cryptoKey, {
      iv: AES_IV,
      mode: CryptoJS.default.mode.CBC,
      padding: CryptoJS.default.pad.NoPadding,
    });
    const decryptedText = decrypted
      .toString(CryptoJS.default.enc.Utf8)
      .replace(/\0+$/, "");
    return decryptedText;
  });

  fastify.decorate(
    "verifyToken",
    async (req: FastifyRequest, res: FastifyReply) => {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        res.status(401).send({ message: "No token provided" });
        return;
      }

      const decoded = await req.jwtVerify();
      req.user = decoded;
    }
  );
});

declare module "fastify" {
  export interface FastifyInstance {
    getGuid(): string;
    generateSalt(): string;
    generateKey(): string;
    generateSign(params: object, salt: string, timestamp: number): string;
    encryptedAES(data: string, secretKey: string): string;
    decryptedAES(encryptedData: string, secretKey: string): string;
    verifyToken(req: FastifyRequest, res: FastifyReply): Promise<void>;
  }
}
