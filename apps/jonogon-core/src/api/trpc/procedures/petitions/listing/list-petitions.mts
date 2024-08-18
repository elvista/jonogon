import {publicProcedure} from '../../../index.mjs';
import {z} from 'zod';
import {scope} from 'scope-utilities';
import {TRPCError} from '@trpc/server';
import {pick} from 'es-toolkit';
import {deriveStatus} from '../../../../../db/model-utils/petition.mjs';

export const listPetitions = publicProcedure
    .input(
        z.object({
            filter: z.enum(['request', 'formalized', 'own']).default('request'),
            sort: z.enum(['time', 'votes']).default('votes'),
            order: z.enum(['asc', 'desc']).default('desc'),
            page: z.number().default(0),
        }),
    )
    .query(async ({input, ctx}) => {
        const query = ctx.services.postgresQueryBuilder
            .with('results', (db) => {
                return scope(
                    scope(
                        scope(
                            db
                                .selectFrom('petitions')
                                .where('petitions.deleted_at', 'is', null)
                                .leftJoin('petition_votes as upvotes', (join) =>
                                    join
                                        .onRef(
                                            'petitions.id',
                                            '=',
                                            'upvotes.petition_id',
                                        )
                                        .on('upvotes.vote', '=', 1),
                                )
                                .select(['petitions.id'])
                                .select(({fn}) => [
                                    fn
                                        .count('upvotes.id')
                                        .as('petition_upvote_count'),
                                ]),
                        ).let((query) => {
                            if (input.filter === 'request') {
                                return query
                                    .where(
                                        'petitions.approved_at',
                                        'is not',
                                        null,
                                    )
                                    .where(
                                        'petitions.formalized_at',
                                        'is',
                                        null,
                                    );
                            } else if (input.filter === 'formalized') {
                                return query.where(
                                    'petitions.formalized_at',
                                    'is not',
                                    null,
                                );
                            } else {
                                return query;
                            }
                        }),
                    ).let((query) => {
                        if (input.filter === 'own') {
                            if (!ctx.auth?.user_id) {
                                throw new TRPCError({
                                    code: 'UNAUTHORIZED',
                                    message:
                                        'must-be-logged-in-to-view-own-petitions',
                                });
                            }

                            return query.where(
                                'petitions.created_by',
                                '=',
                                `${ctx.auth.user_id}`,
                            );
                        }

                        return query;
                    }),
                )
                    .let((query) =>
                        input.sort === 'time'
                            ? query.orderBy(
                                  input.filter === 'own'
                                      ? 'petitions.created_at'
                                      : input.filter === 'request'
                                        ? 'petitions.submitted_at'
                                        : 'petitions.formalized_at',
                                  input.order,
                              )
                            : query.orderBy(
                                  'petition_upvote_count',
                                  input.order,
                              ),
                    )
                    .groupBy(['petitions.id'])
                    .offset(input.page * 32)
                    .limit(33);
            })
            .with('result_with_downvotes', (db) => {
                return db
                    .selectFrom('results')
                    .leftJoin('petition_votes as downvotes', (join) =>
                        join
                            .onRef('results.id', '=', 'downvotes.id')
                            .on('downvotes.vote', '=', -1),
                    )
                    .selectAll('results')
                    .select(({fn}) => [
                        fn.count('downvotes.id').as('petition_downvote_count'),
                    ])
                    .groupBy(['results.id', 'results.petition_upvote_count']);
            })
            .selectFrom('result_with_downvotes')
            .innerJoin('petitions', 'petitions.id', 'result_with_downvotes.id')
            .innerJoin('users', 'users.id', 'petitions.created_by')
            .leftJoin('petition_votes as votes', (join) =>
                join
                    .onRef('petitions.id', '=', 'votes.petition_id')
                    .on('votes.user_id', '=', `${ctx.auth?.user_id ?? 0}`),
            )
            .selectAll('petitions')
            .select([
                'users.name as user_name',
                'users.picture as user_picture',
                'result_with_downvotes.petition_upvote_count',
                'result_with_downvotes.petition_downvote_count',
                'votes.vote as user_vote',
            ]);

        const data = await query.execute();

        return {
            input,
            data: data.map((petition) => ({
                data: {
                    ...pick(petition, [
                        'id',
                        'title',
                        'location',
                        'target',
                        'created_at',
                        'deleted_at',
                        'submitted_at',
                        'rejected_at',
                        'rejection_reason',
                        'approved_at',
                        'formalized_at',
                        'petition_upvote_count',
                        'petition_downvote_count',
                    ]),
                    created_by: {
                        id: petition.created_by,
                        name: petition.user_name,
                        picture: petition.user_picture,
                    },
                    status: deriveStatus(petition),
                },
                extras: {
                    user_vote: petition.user_vote,
                    user: {
                        name: petition.user_name,
                        picture: petition.user_picture,
                    },
                },
            })),
        };
    });
