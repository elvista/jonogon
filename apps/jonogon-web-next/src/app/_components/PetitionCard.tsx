import {Card, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';

import {
    HandThumbUpIcon as ThumbsUpIconSolid,
    HandThumbDownIcon as ThumbsDownIconSolid,
} from '@heroicons/react/24/solid';

import {
    HandThumbUpIcon as ThumbsUpIconOutline,
    HandThumbDownIcon as ThumbsDownIconOutline,
} from '@heroicons/react/24/outline';

import {useAuthState} from '@/auth/token-manager';
import {formatDate} from '@/lib/date';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import { useLoginModal } from '@/contexts/LoginModalContext';

export default function PetitionCard(props: {
    id: string;

    name: string;
    date: Date;
    target: string;
    title: string;
    attachment: string;

    status: string;

    userVote: number | null;

    upvoteTarget: number | null;

    upvotes: number;
    downvotes: number;

    mode: 'request' | 'formalized' | 'own';
}) {
    const isAuthenticated = useAuthState();

    const router = useRouter();
    const totalVotes = props.upvotes + props.downvotes;

	const {openModal} = useLoginModal();

    const userVote = props.userVote;

    const achievement = props.upvotes / Number(props.upvoteTarget);
    const achievementPercentage = Math.round(achievement * 100);

    return (
        <Link href={`/petitions/${props.id}`}>
            <Card className={''}>
                <CardHeader className={'p-4'}>
                    <CardTitle
                        className={'flex flex-row items-stretch space-x-4'}>
                        <div className={'flex-1'}>
                            <div
                                className={
                                    'leading-[1.1] font-bold font-serif text-xl md:text-2xl align-middle break-words overflow-hidden text-ellipsis'
                                }>
                                {props.title}
                            </div>
                            <div
                                className={
                                    'font-normal text-base text-neutral-500 pt-1'
                                }>
                                <div>
                                    <i>{props.name}</i> —{' '}
                                    <time
                                        dateTime={props.date.toISOString()}
                                        suppressHydrationWarning>
                                        {formatDate(props.date)}
                                    </time>
                                </div>
                            </div>
                        </div>

                        {props.attachment && (
                            <div className={''}>
                                <img
                                    src={`${props.attachment}`.replace(
                                        '$CORE_HOSTNAME',
                                        window.location.hostname,
                                    )}
                                    className="w-16 h-16 md:w-20 md:h-20 object-cover object-center rounded bg-background"
                                />
                            </div>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardFooter className="flex items-center justify-between p-2 px-4 border-t border-t-background">
                    {props.mode === 'formalized' ? (
                        <>
                            <p
                                className={
                                    'font-semibold text-red-600 px-1 flex items-center flex-row'
                                }>
                                <div
                                    className={
                                        'h-2 w-8 md:w-24 inline-block bg-background mr-2'
                                    }>
                                    <div
                                        className={'h-2 bg-red-500'}
                                        style={{
                                            width: `${achievementPercentage}%`,
                                        }}></div>
                                </div>
                                <span className={'mr-4 md:mr-6'}>
                                    {achievementPercentage}%
                                </span>
                                <div>
                                    <span className={'text-black font-light'}>
                                        আরো
                                    </span>{' '}
                                    {(props.upvoteTarget ?? 0) - props.upvotes}
                                    <span className={'text-black font-light'}>
                                        -টা Vote দরকার
                                    </span>{' '}
                                </div>
                            </p>
                            <Button
                                size={'sm'}
                                variant={
                                    userVote === null ? 'outline' : 'ghost'
                                }
                                disabled={userVote !== null}
                                onClick={() => {
                                    const href = `/petitions/${props.id}`;

                                    isAuthenticated
                                        ? router.push(href)
                                        : openModal(`/petitions/${props.id}`);
                                }}>
                                {userVote === null ? 'VOTE' : 'VOTED'}
                            </Button>
                        </>
                    ) : props.mode === 'request' ? (
                        <>
                            <div className={'flex flex-row gap-6 px-1'}>
                                <div className={'flex flex-row gap-2'}>
                                    {userVote === 1 ? (
                                        <ThumbsUpIconSolid
                                            className={'w-5 h-5 text-green-500'}
                                        />
                                    ) : (
                                        <ThumbsUpIconOutline
                                            className={'w-5 h-5 text-green-500'}
                                        />
                                    )}

                                    {props.upvotes}
                                </div>
                                <div className={'flex flex-row gap-2'}>
                                    {userVote === -1 ? (
                                        <ThumbsDownIconSolid
                                            className={'w-5 h-5 text-red-500'}
                                        />
                                    ) : (
                                        <ThumbsDownIconOutline
                                            className={'w-5 h-5 text-red-500'}
                                        />
                                    )}

                                    {props.downvotes}
                                </div>
                            </div>
                            <Button
                                size={'sm'}
                                variant={
                                    userVote === null ? 'outline' : 'ghost'
                                }
                                disabled={userVote !== null}
                                onClick={() => {
                                    const href = `/petitions/${props.id}`;

                                    isAuthenticated
                                        ? router.push(href)
                                        : router.push(
                                              `/login?next=${encodeURIComponent(href)}`,
                                          );
                                }}>
                                {userVote === null ? 'VOTE' : 'VOTED'}
                            </Button>
                        </>
                    ) : props.mode === 'own' ? (
                        <>
                            <div className={'flex flex-row gap-6 mx-2'}>
                                <div className={'flex flex-row gap-2'}>
                                    {userVote === 1 ? (
                                        <ThumbsUpIconSolid
                                            className={'w-5 h-5 text-green-500'}
                                        />
                                    ) : (
                                        <ThumbsUpIconOutline
                                            className={'w-5 h-5 text-green-500'}
                                        />
                                    )}

                                    {props.upvotes}
                                </div>
                                <div className={'flex flex-row gap-2'}>
                                    {userVote === -1 ? (
                                        <ThumbsDownIconSolid
                                            className={'w-5 h-5 text-red-500'}
                                        />
                                    ) : (
                                        <ThumbsDownIconOutline
                                            className={'w-5 h-5 text-red-500'}
                                        />
                                    )}

                                    {props.downvotes}
                                </div>
                            </div>
                            <div className={'font-mono text-sm'}>
                                STATUS: {props.status}
                            </div>
                        </>
                    ) : null}
                </CardFooter>
            </Card>
        </Link>
    );
}
