import * as express from "express-serve-static-core";

declare module "express-serve-static-core" {
  export interface ParamsDictionary {
    [key: string]: string;
  }
  export interface Request {
    params: Record<string, string>;
  }
}
