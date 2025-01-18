import {publicProcedure, router} from '../index.mjs';

import {userRouter} from './users.mjs';
import {authRouter} from './auth.mjs';
import {petitionRouter} from './petitions.mjs';
import {commentRouter} from './comments.mjs';
import {activityRouter} from './activity.mjs';
import {firebaseAuth} from '../../../services/firebase/index.mjs';
import {respondentRouter} from './respondents.mjs';
import {jobabRouter} from './jobabs.mjs';

export const appRouter = router({
    _: publicProcedure.query(() => {
        return {
            message: `HELLO FROM jonogon-core's tRPC router!`,
        };
    }),
    auth: authRouter,
    users: userRouter,
    petitions: petitionRouter,
    comments: commentRouter,
    activity: activityRouter,
    respondents: respondentRouter,
    jobabs: jobabRouter,

    ...(process.env.NODE_ENV === 'development'
        ? {
              scratch: publicProcedure.query(async ({input, ctx}) => {
                  return await firebaseAuth.createUser({
                      email: 'tomato@potato.com',
                  });
              }),
          }
        : {}),
});

export type TAppRouter = typeof appRouter;
