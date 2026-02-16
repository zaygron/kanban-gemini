import { z } from 'zod';

// ==================== ENTIDADES DE DOMÍNIO ====================
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export const BoardSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdBy: z.string().uuid(),
  archivedAt: z.string().datetime().nullable().optional(),
  version: z.number().int(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export const MembershipSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['owner', 'member', 'viewer']),
  revokedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional()
});

export const ListSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  title: z.string(),
  rank: z.string(),
  archivedAt: z.string().datetime().nullable().optional(),
  version: z.number().int(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export const CardSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  listId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: z.string(),
  assignedTo: z.string().uuid().nullable().optional(),
  rank: z.string(),
  createdBy: z.string().uuid(),
  archivedAt: z.string().datetime().nullable().optional(),
  version: z.number().int(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export const CommentSchema = z.object({
  id: z.string().uuid(),
  cardId: z.string().uuid(),
  authorId: z.string().uuid(),
  body: z.string(),
  archivedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional()
});

// ==================== DTOs REST ====================
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export const CreateBoardRequestSchema = z.object({
  name: z.string().min(1)
});

export const CreateListRequestSchema = z.object({
  title: z.string().min(1),
  beforeListId: z.string().uuid().optional(),
  afterListId: z.string().uuid().optional()
});

export const CreateCardRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  beforeCardId: z.string().uuid().optional(),
  afterCardId: z.string().uuid().optional()
});

export const MoveCardRequestSchema = z.object({
  toListId: z.string().uuid(),
  beforeCardId: z.string().uuid().optional(),
  afterCardId: z.string().uuid().optional(),
  clientRequestId: z.string().uuid(),
  baseCardVersion: z.number().int().optional()
});

// ==================== EVENTOS WEBSOCKET ====================
export const BaseWsEventSchema = z.object({
  eventId: z.string().uuid(),
  boardId: z.string().uuid(),
  boardVersion: z.number().int(),
  actorUserId: z.string().uuid(),
  serverTime: z.string().datetime()
});

export const BoardSnapshotEventSchema = BaseWsEventSchema.extend({
  type: z.literal('board.snapshot'),
  board: BoardSchema,
  lists: z.array(ListSchema),
  cards: z.array(CardSchema),
  memberships: z.array(MembershipSchema)
});

export const ListCreatedEventSchema = BaseWsEventSchema.extend({
  type: z.literal('list.created'),
  list: ListSchema
});

export const ListUpdatedEventSchema = BaseWsEventSchema.extend({
  type: z.literal('list.updated'),
  list: ListSchema
});

export const ListArchivedEventSchema = BaseWsEventSchema.extend({
  type: z.literal('list.archived'),
  listId: z.string().uuid(),
  archivedAt: z.string().datetime()
});

export const CardCreatedEventSchema = BaseWsEventSchema.extend({
  type: z.literal('card.created'),
  card: CardSchema
});

export const CardUpdatedEventSchema = BaseWsEventSchema.extend({
  type: z.literal('card.updated'),
  card: CardSchema
});

export const CardMovedEventSchema = BaseWsEventSchema.extend({
  type: z.literal('card.moved'),
  cardId: z.string().uuid(),
  fromListId: z.string().uuid(),
  toListId: z.string().uuid(),
  newRank: z.string(),
  cardVersion: z.number().int()
});

export const CardArchivedEventSchema = BaseWsEventSchema.extend({
  type: z.literal('card.archived'),
  cardId: z.string().uuid(),
  archivedAt: z.string().datetime()
});

export const CommentCreatedEventSchema = BaseWsEventSchema.extend({
  type: z.literal('comment.created'),
  comment: CommentSchema
});

// Tipos Inferidos
export type User = z.infer<typeof UserSchema>;
export type Board = z.infer<typeof BoardSchema>;
export type Membership = z.infer<typeof MembershipSchema>;
export type List = z.infer<typeof ListSchema>;
export type Card = z.infer<typeof CardSchema>;
export type Comment = z.infer<typeof CommentSchema>;
