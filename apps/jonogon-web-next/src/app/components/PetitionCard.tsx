import {Card, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {ThumbsDown, ThumbsUp} from 'lucide-react';
import {useAuthState} from '@/auth/token-manager';
import {formatDate} from '@/lib/date';
import {useRouter} from 'next/navigation';
import Link from 'next/link';

export default function PetitionCard(props: {
    id: string;

    name: string;
    date: Date;
    target: string;
    title: string;

    status: string;

    upvotes: number;
    downvotes: number;

    mode: 'request' | 'formalized' | 'own';
}) {
    const isAuthenticated = useAuthState();

    const router = useRouter();
    const totalVotes = props.upvotes + props.downvotes;

    return (
        <Card className={''}>
            <CardHeader className={''}>
                <CardTitle>
                    <div
                        className={
                            'font-normal text-base text-neutral-500 pb-2'
                        }>
                        {props.name},{' '}
                        <time
                            dateTime={props.date.toISOString()}
                            suppressHydrationWarning>
                            {formatDate(props.date)}
                        </time>{' '}
                        — To, <i>{props.target}</i>
                    </div>
                    <div>
                        <Link
                            href={`/petitions/${props.id}`}
                            className={
                                'leading-snug font-bold font-serif text-2xl align-middle'
                            }>
                            {props.title}
                        </Link>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardFooter className="flex items-center justify-between">
                {props.mode === 'formalized' ? (
                    <>
                        <p className={'font-semibold text-red-600'}>
                            {totalVotes} {totalVotes !== 1 ? 'votes' : 'vote'}
                        </p>
                        <Button
                            size={'sm'}
                            variant={'outline'}
                            onClick={() => {
                                const href = `/petitions/${props.id}`;

                                isAuthenticated
                                    ? router.push(href)
                                    : router.push(
                                          `/login?next=${encodeURIComponent(href)}`,
                                      );
                            }}>
                            VOTE
                        </Button>
                    </>
                ) : props.mode === 'request' ? (
                    <>
                        <div className={'flex flex-row gap-6'}>
                            <div className={'flex flex-row gap-2'}>
                                <ThumbsUp
                                    className={'w-5 h-5 text-green-500'}
                                />
                                {props.upvotes}
                            </div>
                            <div className={'flex flex-row gap-2'}>
                                <ThumbsDown
                                    className={'w-5 h-5 text-red-500'}
                                />
                                {props.downvotes}
                            </div>
                        </div>
                        <Button
                            size={'sm'}
                            variant={'outline'}
                            onClick={() => {
                                const href = `/petitions/${props.id}`;

                                isAuthenticated
                                    ? router.push(href)
                                    : router.push(
                                          `/login?next=${encodeURIComponent(href)}`,
                                      );
                            }}>
                            VOTE
                        </Button>
                    </>
                ) : props.mode === 'own' ? (
                    <>
                        <div className={'flex flex-row gap-6'}>
                            <div className={'flex flex-row gap-2'}>
                                <ThumbsUp
                                    className={'w-5 h-5 text-green-500'}
                                />
                                {props.upvotes}
                            </div>
                            <div className={'flex flex-row gap-2'}>
                                <ThumbsDown
                                    className={'w-5 h-5 text-red-500'}
                                />
                                {props.downvotes}
                            </div>
                        </div>
                        <div>STATUS: {props.status}</div>
                    </>
                ) : null}
            </CardFooter>
        </Card>
    );
}
