import {publicProcedure} from '../../index.mjs';
import {protectedProcedure} from '../../middleware/protected.mjs';
import {z} from 'zod';
import {TRPCError} from '@trpc/server';

export const getJobab = publicProcedure
    .input(
        z.object({
            id: z.number(),
        }),
    )
    .query(async ({ctx, input}) => {
        const jobab = await ctx.services.postgresQueryBuilder
            .selectFrom('jobabs')
            .select([
                'id',
                'petition_id',
                'respondent_id',
                'title',
                'description',
                'source_type',
                'source_url',
                'responded_at',
                'created_by',
                'created_at',
            ])
            .where('id', '=', `${input.id}`)
            .where('deleted_at', 'is', null)
            .executeTakeFirst();

        if (!jobab) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Jobab not found',
            });
        }

        // Get attachments
        const attachments = await ctx.services.postgresQueryBuilder
            .selectFrom('jobab_attachments')
            .select(['id', 'filename', 'attachment'])
            .where('jobab_id', '=', `${input.id}`)
            .where('deleted_at', 'is', null)
            .execute();

        // Get vote count
        const votes = await ctx.services.postgresQueryBuilder
            .selectFrom('jobab_votes')
            .select([
                ctx.services.postgresQueryBuilder.fn
                    .sum('vote')
                    .as('vote_count'),
            ])
            .where('jobab_id', '=', `${input.id}`)
            .where('nullified_at', 'is', null)
            .executeTakeFirst();

        // Get user's vote if authenticated
        let userVote = null;
        if (ctx.auth?.user_id) {
            userVote = await ctx.services.postgresQueryBuilder
                .selectFrom('jobab_votes')
                .select(['vote'])
                .where('jobab_id', '=', `${input.id}`)
                .where('user_id', '=', `${ctx.auth.user_id}`)
                .where('nullified_at', 'is', null)
                .executeTakeFirst();
        }

        // Get respondent details
        const respondent = await ctx.services.postgresQueryBuilder
            .selectFrom('respondents')
            .select(['id', 'name', 'type', 'img'])
            .where('id', '=', `${jobab.respondent_id}`)
            .where('deleted_at', 'is', null)
            .executeTakeFirst();

        // Get social accounts for the respondent
        const socialAccounts = respondent
            ? await ctx.services.postgresQueryBuilder
                  .selectFrom('social_accounts')
                  .select(['id', 'platform', 'username', 'url'])
                  .where('respondent_id', '=', `${jobab.respondent_id}`)
                  .execute()
            : [];

        return {
            data: {
                ...jobab,
                attachments: await Promise.all(
                    attachments.map(async (attachment) => ({
                        ...attachment,
                        url: await ctx.services.fileStorage.getFileURL(
                            attachment.attachment,
                        ),
                    })),
                ),
                vote_count: Number(votes?.vote_count || 0),
                user_vote: userVote?.vote || null,
                respondent: respondent
                    ? {
                          ...respondent,
                          img_url: respondent.img
                              ? await ctx.services.fileStorage.getFileURL(
                                    respondent.img,
                                )
                              : null,
                          social_accounts: socialAccounts,
                      }
                    : null,
            },
        };
    });

export const createJobab = protectedProcedure
    .input(
        z.object({
            petition_id: z.number(),
            respondent_id: z.number(),
            title: z.string().optional(),
            description: z.string().optional(),
            source_type: z.enum([
                'jonogon_direct',
                'news_article',
                'official_document',
                'social_media',
                'press_release',
            ]),
            source_url: z.string().url().optional(),
            responded_at: z.string(),
            attachments: z
                .array(
                    z.object({
                        filename: z.string(),
                        attachment: z.string(),
                    }),
                )
                .optional(),
        }),
    )
    .mutation(async ({ctx, input}) => {
        if (!ctx.auth!.is_user_admin && !ctx.auth!.is_user_moderator) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You are not authorized to create jobabs',
            });
        }

        // check if the petition exists
        const petition = await ctx.services.postgresQueryBuilder
            .selectFrom('petitions')
            .select(['created_by'])
            .where('id', '=', `${input.petition_id}`)
            .executeTakeFirst();

        if (!petition) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Petition not found',
            });
        }

        const jobab = await ctx.services.postgresQueryBuilder
            .insertInto('jobabs')
            .values({
                petition_id: input.petition_id,
                respondent_id: input.respondent_id,
                title: input.title,
                description: input.description,
                source_type: input.source_type,
                source_url: input.source_url,
                responded_at: input.responded_at,
                created_by: BigInt(ctx.auth?.user_id),
            })
            .returning(['id'])
            .executeTakeFirst();

        if (input.attachments?.length) {
            await ctx.services.postgresQueryBuilder
                .insertInto('jobab_attachments')
                .values(
                    input.attachments.map((attachment) => ({
                        jobab_id: jobab!.id,
                        ...attachment,
                    })),
                )
                .execute();
        }

        if (petition) {
            await ctx.services.postgresQueryBuilder
                .insertInto('notifications')
                .values({
                    user_id: petition.created_by,
                    type: 'jobab_created',
                    actor_user_id: ctx.auth?.user_id,
                    petition_id: `${input.petition_id}`,
                    jobab_id: `${jobab!.id}`,
                    meta: {
                        respondent_id: input.respondent_id,
                    },
                })
                .execute();
        }

        return {
            data: {
                id: jobab!.id,
            },
            message: 'Jobab created successfully',
        };
    });

export const updateJobab = protectedProcedure
    .input(
        z.object({
            id: z.number(),
            title: z.string().optional(),
            description: z.string().optional(),
            source_type: z
                .enum([
                    'jonogon_direct',
                    'news_article',
                    'official_document',
                    'social_media',
                    'press_release',
                ])
                .optional(),
            source_url: z.string().url().optional(),
            respondent_id: z.number().optional(),
            responded_at: z.string(),
            attachments: z
                .array(
                    z.object({
                        filename: z.string(),
                        attachment: z.string(),
                    }),
                )
                .optional(),
        }),
    )
    .mutation(async ({ctx, input}) => {
        if (!ctx.auth!.is_user_admin && !ctx.auth!.is_user_moderator) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You are not authorized to update jobabs',
            });
        }

        const {id, attachments, ...updateData} = input;

        await ctx.services.postgresQueryBuilder
            .updateTable('jobabs')
            .set(updateData)
            .where('id', '=', `${id}`)
            .execute();

        // Handle new attachments if provided
        if (attachments?.length) {
            await ctx.services.postgresQueryBuilder
                .insertInto('jobab_attachments')
                .values(
                    attachments.map((attachment) => ({
                        jobab_id: id,
                        ...attachment,
                    })),
                )
                .execute();
        }

        return {
            message: 'Jobab updated successfully',
        };
    });

export const removeAttachment = protectedProcedure
    .input(
        z.object({
            jobab_id: z.number(),
            attachment_id: z.number(),
        }),
    )
    .mutation(async ({ctx, input}) => {
        if (!ctx.auth!.is_user_admin && !ctx.auth!.is_user_moderator) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You are not authorized to remove attachments',
            });
        }

        await ctx.services.postgresQueryBuilder
            .updateTable('jobab_attachments')
            .set({
                deleted_at: new Date(),
            })
            .where('jobab_id', '=', `${input.jobab_id}`)
            .where('id', '=', `${input.attachment_id}`)
            .execute();

        return {
            message: 'Attachment removed successfully',
        };
    });

export const softDeleteJobab = protectedProcedure
    .input(
        z.object({
            id: z.number(),
        }),
    )
    .mutation(async ({ctx, input}) => {
        // Get the jobab to check if the user is the creator
        const jobab = await ctx.services.postgresQueryBuilder
            .selectFrom('jobabs')
            .select(['created_by'])
            .where('id', '=', `${input.id}`)
            .where('deleted_at', 'is', null)
            .executeTakeFirst();

        if (!jobab) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Jobab not found',
            });
        }

        // Check if user is authorized to delete
        const isCreator =
            BigInt(jobab.created_by) === BigInt(ctx.auth!.user_id);
        if (
            !ctx.auth!.is_user_admin &&
            !ctx.auth!.is_user_moderator &&
            !isCreator
        ) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'You are not authorized to delete this jobab',
            });
        }

        await ctx.services.postgresQueryBuilder
            .updateTable('jobabs')
            .set({
                deleted_at: new Date(),
            })
            .where('id', '=', `${input.id}`)
            .execute();

        return {
            message: 'Jobab deleted successfully',
        };
    });

export const remove = protectedProcedure
    .input(
        z.object({
            id: z.number(),
        }),
    )
    .mutation(async ({ctx, input}) => {
        if (!ctx.auth!.is_user_admin) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Only admins can permanently delete jobabs',
            });
        }

        await ctx.services.postgresQueryBuilder
            .deleteFrom('jobabs')
            .where('id', '=', `${input.id}`)
            .execute();

        return {
            message: 'Jobab permanently deleted',
        };
    });
