import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET single product
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id: Number(id) },
    });

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH update product (partial update)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    // Only include fields that are provided
    if (body.name !== undefined) updateData.name = body.name;
    if (body.size !== undefined) updateData.size = body.size || null;
    if (body.style !== undefined) updateData.style = body.style || null;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.sellPrice !== undefined)
      updateData.sellPrice = Number(body.sellPrice);
    if (body.costPrice !== undefined)
      updateData.costPrice = Number(body.costPrice);
    if (body.currentStock !== undefined)
      updateData.currentStock = Number(body.currentStock);
    if (body.minStock !== undefined)
      updateData.minStock = Number(body.minStock);
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const product = await db.product.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE product (soft delete)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await db.product.update({
      where: { id: Number(id) },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
