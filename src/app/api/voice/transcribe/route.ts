import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";
import { transcribeAudio } from "@/lib/audio";

export async function POST(request: NextRequest) {
  try {
    await getUserId(); // ensure auth

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    
    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const text = await transcribeAudio(buffer, "webm");

    return NextResponse.json({ success: true, text });
  } catch (error: any) {
    console.error("[Voice Transcribe Error]:", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json(
      { success: false, error: error.message || "Transcription failed" },
      { status: 500 }
    );
  }
}
