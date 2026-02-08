import { NextResponse } from "next/server"

export function attachRequestId<T extends NextResponse>(response: T, requestId: string): T {
  response.headers.set("x-request-id", requestId)
  return response
}

