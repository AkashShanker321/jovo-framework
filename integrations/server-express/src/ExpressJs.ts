import { Headers, QueryParams, Server } from '@jovotech/core';
import type { Request, Response } from 'express';

export interface ErrorResponse {
  code: number;
  msg: string;
  stack?: string;
}

export class ExpressJs extends Server {
  req: Request;
  res: Response;

  constructor(req: Request, res: Response) {
    super();
    this.req = req;
    this.res = res;
  }

  fail(error: Error): void {
    if (!this.res.headersSent) {
      const responseObj: ErrorResponse = {
        code: 500,
        msg: error.message,
      };

      if (process.env.NODE_ENV === 'production') {
        responseObj.stack = error.stack;
      }
      this.res.status(responseObj.code).json(responseObj);
    }
  }

  getQueryParams(): QueryParams {
    return (this.req.query as QueryParams) || {};
  }

  getRequestObject(): Record<string, string> {
    return this.req.body;
  }

  getRequestHeaders(): Headers {
    return this.req.headers || {};
  }

  hasWriteFileAccess(): boolean {
    return true;
  }

  setResponse(response: unknown): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.res.headersSent) {
        this.res.json(response);
      }
      resolve();
    });
  }

  setResponseHeaders(header: Record<string, string>): void {}
}
