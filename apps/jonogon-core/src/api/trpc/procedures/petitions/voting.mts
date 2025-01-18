import {protectedProcedure} from '../../middleware/protected.mjs';
import {TRPCError} from '@trpc/server';
import {z} from 'zod';
import { calculateVoteVelocity } from '../../../utility/feed-algorithm.mjs';

export const vote = protectedProcedure
    .input(
        z.object({
            petition_id: z.string(),
            vote: z.union([z.literal('up'), z.literal('down')]),
        }),
    )
    .mutation(async ({input, ctx}) => {
        // Check if the petition is flagged
        const petition = await ctx.services.postgresQueryBuilder
            .selectFrom('petitions')
            .where('id', '=', input.petition_id)
            .select(['flagged_at', 'created_by']) // Select flagged_at to check if the petition is flagged
            .executeTakeFirst();

        if (!petition) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'petition-not-found',
            });
        }

        // If the petition is flagged, prevent voting
        if (petition.flagged_at) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'voting is not allowed on flagged petitions',
            });
        }

        const result = await ctx.services.postgresQueryBuilder
            .insertInto('petition_votes')
            .values({
                petition_id: input.petition_id,
                user_id: ctx.auth.user_id,
                vote: input.vote === 'up' ? 1 : -1,
            })
            .onConflict((conflict) =>
                conflict
                    .constraint('petition_votes__by_user_on_petition')
                    .doUpdateSet({
                        vote: input.vote === 'up' ? 1 : -1,
                        updated_at: new Date(),
                    }),
            )
            .returning(['id'])
            .executeTakeFirst();

        if (result) {
            const petition = await ctx.services.postgresQueryBuilder
                .selectFrom('petitions')
                .where('id', '=', input.petition_id)
                .select(['created_by', 'score', 'approved_at'])
                .executeTakeFirst();

            if (petition) {
                const approvedAt =
                    petition.approved_at instanceof Date
                        ? petition.approved_at
                        : new Date();
                const {logScore, newScore} = calculateVoteVelocity(
                    approvedAt,
                    petition.score,
                    input.vote,
                );
                await ctx.services.postgresQueryBuilder
                    .updateTable('petitions')
                    .set({ score: newScore, log_score: logScore })
                    .where('id', '=', input.petition_id)
                    .execute();
                await ctx.services.postgresQueryBuilder
                    .transaction()
                    .execute(async (t) => {
                        await t
                            .deleteFrom('notifications')
                            .where('type', '=', 'vote')
                            .where('vote_id', '=', result.id)
                            .execute();

                        await t
                            .insertInto('notifications')
                            .values({
                                user_id: petition.created_by,
                                type: 'vote',
                                actor_user_id: ctx.auth.user_id,
                                petition_id: result.id,
                                vote_id: result.id,
                                meta: {
                                    vote: input.vote === 'up' ? 1 : -1,
                                },
                            })
                            .executeTakeFirst();
                    });
            }
        }

        return {
            input,
            message: 'voted',
        };
    });

export const clearVote = protectedProcedure
    .input(
        z.object({
            petition_id: z.string(),
        }),
    )
    .mutation(async ({input, ctx}) => {
        // Check if the petition is flagged
        const petition = await ctx.services.postgresQueryBuilder
            .selectFrom('petitions')
            .where('id', '=', input.petition_id)
            .select(['flagged_at']) // Select flagged_at to check if the petition is flagged
            .executeTakeFirst();

        if (!petition) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'petition-not-found',
            });
        }

        // If the petition is flagged, prevent clearing the vote
        if (petition.flagged_at) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'clearing vote is not allowed on flagged petitions',
            });
        }

        const result = await ctx.services.postgresQueryBuilder
            .deleteFrom('petition_votes')
            .where('petition_id', '=', input.petition_id)
            .where('user_id', '=', `${ctx.auth.user_id}`)
            .returning(['id'])
            .executeTakeFirst();

        if (result) {
            await ctx.services.postgresQueryBuilder
                .deleteFrom('notifications')
                .where('type', '=', 'vote')
                .where('vote_id', '=', result.id)
                .execute();
        }

        return {
            input,
            message: 'vote-cleared',
        };
    });
