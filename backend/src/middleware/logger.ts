import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    const statusColor =
      status >= 500 ? "31" : status >= 400 ? "33" : status >= 300 ? "36" : "32";
    const methodColor =
      method === "GET"
        ? "34"
        : method === "POST"
          ? "32"
          : method === "DELETE"
            ? "31"
            : "33";

    console.log(
      `\x1b[${methodColor}m${method}\x1b[0m ${originalUrl} \x1b[${statusColor}m${status}\x1b[0m \x1b[2m${duration}ms\x1b[0m`,
    );
  });

  next();
}
