import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SignupSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validation = SignupSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((i) => i.message).join(" ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { email, password } = validation.data;

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    const [newUser] = await db
      .insert(users)
      .values({ email, passwordHash })
      .returning({ id: users.id, email: users.email });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar conta" },
      { status: 500 }
    );
  }
}
