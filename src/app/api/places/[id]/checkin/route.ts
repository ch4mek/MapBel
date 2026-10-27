import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, asyncRoute, requireUser } from "@/lib/api";
import { performCheckin } from "@/lib/checkin";

const checkinSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  accuracy: z.coerce.number(),
  positionTimestamp: z.coerce.number(),
  idempotencyKey: z.string().min(8).max(128),
  tripId: z.string().optional(),
});

export const POST = asyncRoute(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = checkinSchema.parse(await req.json());
    const result = await performCheckin(user.id, {
      placeId: id,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: body.accuracy,
      positionTimestamp: body.positionTimestamp,
      idempotencyKey: body.idempotencyKey,
      tripId: body.tripId,
    });
    return jsonOk(result);
  },
);
