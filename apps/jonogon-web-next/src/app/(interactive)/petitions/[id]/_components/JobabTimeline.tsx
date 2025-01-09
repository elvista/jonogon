'use client';

import {trpc} from '@/trpc/client';
import JobabCard from './jobabs/JobabCard';

interface JobabTimelineProps {
    petitionId: number;
}

export default function JobabTimeline({petitionId}: JobabTimelineProps) {
    const {data: jobabsData, isLoading} = trpc.jobabs.list.useQuery({
        petition_id: petitionId,
        limit: 10,
        offset: 0,
    });

    const {data: respondentsData} = trpc.respondents.list.useQuery(
        {
            type: undefined,
        },
        {
            enabled: true,
        },
    );

    const jobabs = jobabsData?.data || [];
    const respondents = respondentsData?.data || [];

    const transformedJobabs = jobabs.map((jobab) => {
        const respondent = respondents.find(
            (r) => r.id === jobab.respondent_id,
        );

        // Transform attachments data with correct type assertion
        const transformedAttachments =
            jobab.attachments?.map((attachment) => ({
                id: Number(attachment.id),
                filename: attachment.filename,
                type: attachment.filename.match(/\.(jpg|jpeg|png|gif)$/i)
                    ? ('image' as const)
                    : ('file' as const),
                url: attachment.url,
            })) || [];

        return {
            id: Number(jobab.id),
            title: jobab.title,
            description: jobab.description,
            source_type: jobab.source_type,
            source_url: jobab.source_url,
            responded_at: jobab.responded_at,
            created_at: jobab.created_at,
            vote_count: jobab.vote_count || 0,
            user_vote: jobab.user_vote,
            attachments: transformedAttachments,
            respondent: respondent
                ? {
                      id: Number(respondent.id),
                      name: respondent.name,
                      type: respondent.type as 'organization' | 'expert',
                      img_url: respondent.img_url,
                  }
                : null,
        };
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="font-medium">{jobabs.length} জবাবs</h3>
            </div>

            <p className="text-neutral-600">
                Responses from official bodies and expert opinions
            </p>

            {isLoading ? (
                <div>জবাবs Loading...</div>
            ) : (
                <div className="space-y-6">
                    {transformedJobabs.map((jobab) => (
                        <JobabCard
                            key={jobab.id}
                            id={jobab.id}
                            title={jobab.title}
                            description={jobab.description}
                            source_type={jobab.source_type}
                            source_url={jobab.source_url}
                            responded_at={jobab.responded_at}
                            created_at={jobab.created_at}
                            vote_count={jobab.vote_count}
                            user_vote={jobab.user_vote}
                            attachments={jobab.attachments}
                            respondent={jobab.respondent}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
