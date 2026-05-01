import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json()

    // Validate inputs
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    // TODO: Send email or store in database
    // For now, we'll just log it (in production, integrate with email service or database)
    console.log("[v0] Feedback received:", {
      name,
      email,
      message,
      timestamp: new Date().toISOString(),
    })

    // Return success response
    return NextResponse.json(
      { message: "Feedback received successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Feedback API error:", error)
    return NextResponse.json(
      { error: "Failed to process feedback" },
      { status: 500 }
    )
  }
}
