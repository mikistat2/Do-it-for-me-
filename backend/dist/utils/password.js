"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPassword = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const config_1 = require("../config");
const hashPassword = (plain) => bcrypt_1.default.hash(plain, config_1.config.jwt.bcryptSaltRounds);
exports.hashPassword = hashPassword;
const verifyPassword = (plain, hash) => bcrypt_1.default.compare(plain, hash);
exports.verifyPassword = verifyPassword;
//# sourceMappingURL=password.js.map