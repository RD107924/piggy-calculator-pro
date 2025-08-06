-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('NEEDS_PURCHASE', 'PURCHASED', 'IN_WAREHOUSE', 'NOT_IN_WAREHOUSE', 'SHIPPED', 'IN_CUSTOMS', 'DELIVERY_COMPLETE');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipment_orders" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lineNickname" TEXT,
    "recipientName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "idNumber" TEXT,
    "calculationResult" JSONB NOT NULL,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'NEEDS_PURCHASE',
    "assignedToId" TEXT,

    CONSTRAINT "shipment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- AddForeignKey
ALTER TABLE "public"."shipment_orders" ADD CONSTRAINT "shipment_orders_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
