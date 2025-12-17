import 'server-only'

import {
  PrismaClient as PrismaClientCtor,
  type PrismaClient as PrismaClientType,
} from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

type PrismaClientWithGuards = PrismaClientType & ReturnType<PrismaClientType['$extends']>

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientWithGuards
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const adapter = new PrismaPg({ connectionString })

// Pass the adapter to PrismaClient
const basePrisma = new PrismaClientCtor({ adapter })

// Guardrails: chat data MUST NOT be physically deleted from application code.
export const prisma: PrismaClientWithGuards =
  globalForPrisma.prisma ||
  (basePrisma.$extends({
    name: 'forbid-chat-physical-delete',
    query: {
      conversation: {
        delete() {
          throw new Error('Physical delete is forbidden for chat data; use soft delete.')
        },
        deleteMany() {
          throw new Error('Physical delete is forbidden for chat data; use soft delete.')
        },
      },
      message: {
        delete() {
          throw new Error('Physical delete is forbidden for chat data; use soft delete.')
        },
        deleteMany() {
          throw new Error('Physical delete is forbidden for chat data; use soft delete.')
        },
      },
    },
  }) as PrismaClientWithGuards)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
