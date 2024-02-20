import koa from "koa";

export const errorHandler = async (ctx: koa.Context, next: () => Promise<any>) => {
	try {
		await next();
	} catch (err) {
		if (err instanceof koa.HttpError) {
			ctx.status = err.statusCode || err.status || 500;
			ctx.body = {
				message: err.message,
			};
		} else if (err instanceof Error) {
			ctx.status = 500;
			ctx.body = {
				message: err.message,
			};
		} else {
			ctx.status = 500;
			ctx.body = { message: "Internal Error" };
		}
	}
};
