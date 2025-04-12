import { PrismaClient, Prisma } from '@prisma/client';
import { OrderLog, OrderParams, OrderResult, OrderError } from './types.js';
import { prisma } from '../../lib/prisma.js';

type OrderStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export async function logOrderAttempt(log: OrderLog): Promise<void> {
  const orderAttemptLog = {
    orderId: log.orderId,
    params: log.params as unknown as Prisma.JsonObject,
    timestamp: log.timestamp,
    status: log.status,
  };

  await prisma.userOrderLog.create({
    data: {
      userId: log.userId,
      orderType: log.params.side.toUpperCase() as 'BUY' | 'SELL',
      asset: log.params.symbol,
      amount: log.params.size,
      price: log.params.price || 0,
      status: 'PENDING' as OrderStatus,
      orderAttemptLog,
    },
  });
}

export async function logOrderResult(log: OrderLog): Promise<void> {
  const orderLog = await prisma.userOrderLog.findFirst({
    where: {
      userId: log.userId,
      orderAttemptLog: {
        path: ['orderId'],
        equals: log.orderId,
      } as Prisma.JsonObject,
    },
  });

  if (!orderLog) {
    throw new Error(`No order log found for orderId: ${log.orderId}`);
  }

  const orderResultLog = {
    orderId: log.orderId,
    status: log.status,
    timestamp: log.timestamp,
    result: log.result as unknown as Prisma.JsonObject,
    error: log.error as unknown as Prisma.JsonObject,
  };

  const status: OrderStatus = log.status === 'success' ? 'COMPLETED' : 'FAILED';

  await prisma.userOrderLog.update({
    where: { id: orderLog.id },
    data: {
      status,
      orderResultLog,
      hyperliquidOrderId: log.result?.orderId,
    },
  });
}

export async function getUserOrderLogs(userId: string) {
  return await prisma.userOrderLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrderLogById(orderId: string) {
  return await prisma.userOrderLog.findFirst({
    where: {
      orderAttemptLog: {
        path: ['orderId'],
        equals: orderId,
      } as Prisma.JsonObject,
    },
  });
}
