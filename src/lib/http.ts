import { NextResponse } from "next/server";
import { ZodError } from "zod";

export async function routeHandler<T>(handler: () => Promise<T>) {
  try {
    const result = await handler();
    if (result instanceof Response) return result;
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "Invalid request", issues: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
